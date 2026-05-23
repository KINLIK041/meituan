package com.meituan.route.orchestrator;

import com.meituan.route.agent.*;
import com.meituan.route.model.Route;
import com.meituan.route.model.UserIntent;
import com.meituan.route.solver.ConstraintEngine;
import com.meituan.route.state.SessionStateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

/**
 * RoutePlannerOrchestrator — the main orchestrator that coordinates all agents
 * in a multi-agent pipeline: Conversation → Discovery → Planning → Constraint → Explanation.
 *
 * Supports both initial planning and incremental adjustment.
 */
@Service
public class RoutePlannerOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(RoutePlannerOrchestrator.class);

    private final ConversationAgent conversationAgent;
    private final DiscoveryAgent discoveryAgent;
    private final PlanningAgent planningAgent;
    private final ConstraintAgent constraintAgent;
    private final ExplanationAgent explanationAgent;
    private final SessionStateManager sessionManager;
    private final ConstraintEngine constraintEngine;

    public RoutePlannerOrchestrator(ConversationAgent conversationAgent,
                                    DiscoveryAgent discoveryAgent,
                                    PlanningAgent planningAgent,
                                    ConstraintAgent constraintAgent,
                                    ExplanationAgent explanationAgent,
                                    SessionStateManager sessionManager,
                                    ConstraintEngine constraintEngine) {
        this.conversationAgent = conversationAgent;
        this.discoveryAgent = discoveryAgent;
        this.planningAgent = planningAgent;
        this.constraintAgent = constraintAgent;
        this.explanationAgent = explanationAgent;
        this.sessionManager = sessionManager;
        this.constraintEngine = constraintEngine;
    }

    /**
     * Full pipeline: plan a route from natural language query.
     * Runs LLM intent parsing and speculative POI discovery in parallel.
     */
    public Mono<PlanResponse> planRoute(String query, String sessionId, String requestCity) {
        return planRoute(query, sessionId, requestCity, null);
    }

    /**
     * Full pipeline with optional pre-parsed intent (from prior analyze call).
     * When preParsedIntent is provided, the LLM parse step is skipped entirely,
     * cutting ~3-5 seconds from total latency.
     */
    public Mono<PlanResponse> planRoute(String query, String sessionId, String requestCity, UserIntent preParsedIntent) {
        log.info("Orchestrator: starting route plan for '{}', city={}, preParsedIntent={}", query, requestCity, preParsedIntent != null);

        var effectiveCity = (requestCity != null && !requestCity.isBlank()) ? requestCity : "北京";

        var broadIntent = DiscoveryAgent.broadIntent(effectiveCity);
        var speculativeDiscovery = discoveryAgent.discover(broadIntent)
                .subscribeOn(Schedulers.boundedElastic());

        // If intent was already parsed by /api/route/analyze, reuse it — skip duplicate LLM call
        var llmMono = preParsedIntent != null
                ? Mono.fromCallable(() -> {
                    var sid = (sessionId != null && !sessionId.isBlank()) ? sessionId : sessionManager.createSession();
                    var intent = (requestCity != null && !requestCity.isBlank())
                            ? preParsedIntent.withCity(requestCity) : preParsedIntent;
                    log.info("Skipped LLM parse — using pre-parsed intent from analyze step");
                    return new ConversationAgent.ConversationResult(sid, intent, null, null);
                })
                : Mono.fromCallable(() -> conversationAgent.process(query, sessionId))
                        .subscribeOn(Schedulers.boundedElastic());

        return Mono.zip(llmMono, speculativeDiscovery)
                .flatMap(tuple -> {
                    var convResult = tuple.getT1();
                    var speculative = tuple.getT2();
                    var actualSessionId = convResult.sessionId();

                    var rawIntent = convResult.intent();
                    var intent = (requestCity != null && !requestCity.isBlank())
                            ? rawIntent.withCity(requestCity)
                            : rawIntent;
                    var city = intent.city() != null ? intent.city() : "北京";

                    // If speculative city matches intent city, reuse; otherwise re-discover
                    var discoveryMono = effectiveCity.equals(city)
                            ? Mono.just(speculative)
                            : discoveryAgent.discover(intent).subscribeOn(Schedulers.boundedElastic());

                    return discoveryMono.flatMap(discovery -> {
                        var effectiveDiscovery = effectiveCity.equals(city) && hasSpecificCategories(intent)
                                ? discoveryAgent.filterForIntent(discovery, intent)
                                : discovery;

                        var planResult = planningAgent.plan(effectiveDiscovery, intent, null);

                        if (!planResult.hasRoutes()) {
                            return Mono.just(new PlanResponse(actualSessionId, List.of(),
                                    planResult.warning() != null ? planResult.warning() : "无法生成路线方案",
                                    null, ""));
                        }

                        for (var route : planResult.routes()) {
                            sessionManager.addSnapshot(actualSessionId, route, intent);
                        }

                        // Constraint analysis and explanation are independent — run in parallel
                        var constraintMono = Mono.fromCallable(() -> {
                            var constraints = constraintEngine.buildConstraints(intent, effectiveDiscovery.candidates());
                            return constraintAgent.analyze(planResult.routes(), constraints, intent);
                        }).subscribeOn(Schedulers.boundedElastic());

                        var explanationMono = Mono.fromCallable(() ->
                            explanationAgent.explain(planResult.routes(), intent)
                        ).subscribeOn(Schedulers.boundedElastic());

                        return Mono.zip(constraintMono, explanationMono).map(postResult -> {
                            var constraintReport = postResult.getT1();
                            var explanation = postResult.getT2();
                            var routes = planResult.routes();
                            var warning = constraintReport.allFeasible() ? null : "部分方案存在约束冲突";

                            return new PlanResponse(
                                    actualSessionId,
                                    routes,
                                    warning,
                                    constraintReport.bestRoute(),
                                    explanation.comparisonHtml()
                            );
                        });
                    });
                })
                .timeout(Duration.ofSeconds(15));
    }

    private boolean hasSpecificCategories(UserIntent intent) {
        var cats = intent.preferredCategories();
        return cats != null && !cats.isEmpty();
    }

    /**
     * Adjustment pipeline: modify an existing route based on natural language feedback.
     */
    public Mono<PlanResponse> adjustRoute(String sessionId, String adjustment, String requestCity) {
        return Mono.fromCallable(() -> {
            log.info("Orchestrator: adjusting route for session {}: '{}', city={}", sessionId, adjustment, requestCity);

            var sessionOpt = sessionManager.getSession(sessionId);
            if (sessionOpt.isEmpty()) {
                return Mono.<PlanResponse>just(new PlanResponse(sessionId, List.of(),
                        "会话不存在或已过期", null, ""));
            }

            var session = sessionOpt.get();
            var currentRoute = sessionManager.getLatestRoute(sessionId).orElse(null);
            if (currentRoute == null) {
                return planRoute(adjustment, sessionId, requestCity);
            }

            // Parse the adjustment constraints
            var additionalConstraints = constraintAgent.parseAdjustmentConstraints(adjustment);

            // Resolve which POIs to keep
            int keepCount = sessionManager.resolveAdjustment(adjustment, currentRoute);
            var keptPrefix = currentRoute.segments().stream()
                    .limit(keepCount)
                    .toList();

            // Process adjustment through conversation agent
            var convResult = conversationAgent.process(adjustment, sessionId);
            var newIntent = (requestCity != null && !requestCity.isBlank())
                    ? convResult.intent().withCity(requestCity)
                    : convResult.intent();

            // Re-discover with new intent
            return discoveryAgent.discover(newIntent).flatMap(discovery -> {
                // Re-plan with kept prefix
                var planResult = planningAgent.replan(discovery, newIntent, keptPrefix, additionalConstraints);

                if (!planResult.hasRoutes()) {
                    return Mono.just(new PlanResponse(sessionId, List.of(),
                            "调整后无法生成新路线", null, ""));
                }

                // Validate new plans
                var constraints = constraintEngine.buildConstraints(newIntent, discovery.candidates());
                if (additionalConstraints != null) {
                    constraints.addAll(additionalConstraints);
                }
                var constraintReport = constraintAgent.analyze(planResult.routes(), constraints, newIntent);

                // Store new snapshots
                for (var route : planResult.routes()) {
                    sessionManager.addSnapshot(sessionId, route, newIntent);
                }

                var explanation = explanationAgent.explain(planResult.routes(), newIntent);

                return Mono.just(new PlanResponse(
                        sessionId,
                        planResult.routes(),
                        constraintReport.allFeasible() ? null : "调整后存在约束冲突",
                        constraintReport.bestRoute(),
                        explanation.comparisonHtml()
                ));
            });
        })
        .flatMap(m -> m)
        .subscribeOn(Schedulers.boundedElastic())
        .timeout(Duration.ofSeconds(15));
    }

    /**
     * Get comparison data for a session.
     */
    public Mono<CompareResponse> getComparison(String sessionId) {
        return Mono.fromCallable(() -> {
            var sessionOpt = sessionManager.getSession(sessionId);
            if (sessionOpt.isEmpty()) {
                return new CompareResponse(sessionId, List.of(), "会话不存在");
            }

            var allRoutes = sessionManager.getAllRoutes(sessionId);
            var explanation = explanationAgent.explain(allRoutes,
                    sessionOpt.get().currentIntent());
            var groupedByVersion = sessionOpt.get().snapshots().stream()
                    .collect(Collectors.groupingBy(s -> s.version()));

            return new CompareResponse(sessionId, allRoutes, explanation.comparisonHtml());
        });
    }

    // Response types
    public record PlanResponse(
            String sessionId,
            List<Route> routes,
            String warning,
            Route recommendedRoute,
            String explanation
    ) {}

    public record CompareResponse(
            String sessionId,
            List<Route> routes,
            String comparisonHtml
    ) {}
}
