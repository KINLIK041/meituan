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

        // Use pre-parsed intent city > requestCity > default 北京 for speculative discovery
        final var effectiveCity = (preParsedIntent != null && preParsedIntent.city() != null && !preParsedIntent.city().isBlank())
                ? preParsedIntent.city()
                : (requestCity != null && !requestCity.isBlank()) ? requestCity : "北京";

        var broadIntent = DiscoveryAgent.broadIntent(effectiveCity);
        var speculativeDiscovery = discoveryAgent.discover(broadIntent)
                .subscribeOn(Schedulers.boundedElastic());

        // If intent was already parsed by /api/route/analyze, reuse it — skip duplicate LLM call
        var llmMono = preParsedIntent != null
                ? Mono.fromCallable(() -> {
                    var sid = (sessionId != null && !sessionId.isBlank()) ? sessionId : sessionManager.createSession();
                    // Prefer pre-parsed intent's own city; requestCity is fallback
                    var ppCity = preParsedIntent.city();
                    var resolvedPpCity = (ppCity != null && !ppCity.isBlank())
                            ? ppCity
                            : (requestCity != null && !requestCity.isBlank()) ? requestCity : "北京";
                    var intent = resolvedPpCity.equals(ppCity) ? preParsedIntent : preParsedIntent.withCity(resolvedPpCity);
                    log.info("Skipped LLM parse — using pre-parsed intent from analyze step");
                    return new ConversationAgent.ConversationResult(sid, intent, null, null);
                })
                : conversationAgent.processAsync(query, sessionId, requestCity);

        return Mono.zip(llmMono, speculativeDiscovery)
                .flatMap(tuple -> {
                    var convResult = tuple.getT1();
                    var speculative = tuple.getT2();
                    var actualSessionId = convResult.sessionId();

                    var rawIntent = convResult.intent();
                    // Prefer LLM-parsed city when it's specific; only use requestCity as fallback
                    var llmCity = rawIntent.city();
                    var resolvedCity = (llmCity != null && !llmCity.isBlank())
                            ? llmCity
                            : (requestCity != null && !requestCity.isBlank()) ? requestCity : "北京";
                    var intent = resolvedCity.equals(rawIntent.city()) ? rawIntent : rawIntent.withCity(resolvedCity);
                    var city = resolvedCity;

                    // Re-discover when: city mismatch, or intent has district/keywords (broad speculative lacks those filters)
                    var hasSpecificFilters = (intent.district() != null && !intent.district().isBlank())
                            || (intent.keywords() != null && !intent.keywords().isEmpty());
                    var needsRediscovery = !effectiveCity.equals(city) || hasSpecificFilters;
                    var discoveryMono = needsRediscovery
                            ? discoveryAgent.discover(intent).subscribeOn(Schedulers.boundedElastic())
                            : Mono.just(speculative);

                    return discoveryMono.flatMap(discovery -> {
                        // Only filter when reusing broad speculative results; re-discovered results already have filters applied
                        var effectiveDiscovery = (!needsRediscovery && hasSpecificCategories(intent))
                                ? discoveryAgent.filterForIntent(discovery, intent)
                                : discovery;

                        var planResult = planningAgent.plan(effectiveDiscovery, intent, null);

                        if (!planResult.hasRoutes()) {
                            return Mono.just(new PlanResponse(actualSessionId, List.of(),
                                    planResult.warning() != null ? planResult.warning() : "无法生成路线方案",
                                    null, ""));
                        }

                        sessionManager.addSnapshots(actualSessionId, planResult.routes(), intent);

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
     * Runs session lookup + constraint parsing in parallel with the conversation LLM call
     * (Mono.zip), then constraint analysis + explanation in parallel at the tail.
     */
    public Mono<PlanResponse> adjustRoute(String sessionId, String adjustment, String requestCity) {
        log.info("Orchestrator: adjusting route for session {}: '{}', city={}", sessionId, adjustment, requestCity);

        // Phase 1 (parallel): session lookup + preprocessing  ||  conversation LLM call
        var preprocessMono = Mono.fromCallable(() -> {
            var sessionOpt = sessionManager.getSession(sessionId);
            if (sessionOpt.isEmpty()) {
                return new AdjustmentContext(null, null, null, null, true, false);
            }
            var session = sessionOpt.get();
            var currentRoute = sessionManager.getLatestRoute(sessionId).orElse(null);
            if (currentRoute == null) {
                return new AdjustmentContext(null, null, null, null, false, true);
            }
            var additionalConstraints = constraintAgent.parseAdjustmentConstraints(adjustment);
            int keepCount = sessionManager.resolveAdjustment(adjustment, currentRoute);
            var keptPrefix = currentRoute.segments().stream().limit(keepCount).toList();
            return new AdjustmentContext(additionalConstraints, keptPrefix, session, currentRoute, false, false);
        }).subscribeOn(Schedulers.boundedElastic());

        var convMono = conversationAgent.processAsync(adjustment, sessionId, requestCity);

        return Mono.zip(preprocessMono, convMono).flatMap(tuple -> {
            var ctx = tuple.getT1();
            var convResult = tuple.getT2();

            if (ctx.sessionNotFound) {
                return Mono.just(new PlanResponse(sessionId, List.of(), "会话不存在或已过期", null, ""));
            }
            if (ctx.fallbackToPlan) {
                return planRoute(adjustment, sessionId, requestCity);
            }

            var parsedIntent = (requestCity != null && !requestCity.isBlank())
                    ? convResult.intent().withCity(requestCity)
                    : convResult.intent();
            final var newIntent = (convResult.previousIntent() != null)
                    ? mergeIntentContext(parsedIntent, convResult.previousIntent())
                    : parsedIntent;

            return discoveryAgent.discover(newIntent).flatMap(discovery -> {
                var planResult = planningAgent.replan(discovery, newIntent,
                        ctx.keptPrefix, ctx.additionalConstraints);

                if (!planResult.hasRoutes()) {
                    return Mono.just(new PlanResponse(sessionId, List.of(),
                            "调整后无法生成新路线", null, ""));
                }

                // Build constraints including adjustment-specific ones
                var constraints = constraintEngine.buildConstraints(newIntent, discovery.candidates());
                if (ctx.additionalConstraints != null) {
                    constraints.addAll(ctx.additionalConstraints);
                }

                // Batch-save snapshots (single DB round-trip)
                sessionManager.addSnapshots(sessionId, planResult.routes(), newIntent);

                // Constraint analysis and explanation are independent — run in parallel
                var constraintMono = Mono.fromCallable(() ->
                    constraintAgent.analyze(planResult.routes(), constraints, newIntent)
                ).subscribeOn(Schedulers.boundedElastic());

                var explanationMono = Mono.fromCallable(() ->
                    explanationAgent.explain(planResult.routes(), newIntent)
                ).subscribeOn(Schedulers.boundedElastic());

                return Mono.zip(constraintMono, explanationMono).map(postResult -> {
                    var constraintReport = postResult.getT1();
                    var explanation = postResult.getT2();
                    return new PlanResponse(
                            sessionId,
                            planResult.routes(),
                            constraintReport.allFeasible() ? null : "调整后存在约束冲突",
                            constraintReport.bestRoute(),
                            explanation.comparisonHtml()
                    );
                });
            });
        }).timeout(Duration.ofSeconds(15));
    }

    private record AdjustmentContext(
            List<com.meituan.route.model.Constraint> additionalConstraints,
            List<Route.RouteSegment> keptPrefix,
            SessionStateManager.Session session,
            Route currentRoute,
            boolean sessionNotFound,
            boolean fallbackToPlan
    ) {}

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

    private UserIntent mergeIntentContext(UserIntent newIntent, UserIntent previous) {
        var city = (newIntent.city() == null || newIntent.city().isBlank() || newIntent.city().equals("北京"))
                ? previous.city()
                : newIntent.city();
        var district = newIntent.district() != null ? newIntent.district() : previous.district();
        var keywords = new java.util.ArrayList<>(newIntent.keywords());
        if (previous.keywords() != null) {
            for (var kw : previous.keywords()) {
                if (!keywords.contains(kw)) keywords.add(kw);
            }
        }
        return new com.meituan.route.model.UserIntent(
                newIntent.rawQuery(), city, district,
                newIntent.preferredCategories(), newIntent.cuisinePreference(),
                newIntent.startTime(), newIntent.endTime(), newIntent.budget(),
                newIntent.partySize(), newIntent.minRating(), newIntent.maxQueueMinutes(),
                newIntent.travelMode(), newIntent.optimizationGoal(),
                newIntent.specialRequest(), keywords, newIntent.sessionId()
        );
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
