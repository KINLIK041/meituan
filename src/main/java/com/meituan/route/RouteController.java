package com.meituan.route;

import com.meituan.route.llm.IntentParser;
import com.meituan.route.model.IntentAnalysisResult;
import com.meituan.route.model.UserIntent;
import com.meituan.route.orchestrator.RoutePlannerOrchestrator;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

/**
 * REST API controller for the AI Route Planner.
 * Exposes endpoints for planning, adjusting, and comparing routes.
 */
@RestController
@RequestMapping("/api/route")
public class RouteController {

    private final RoutePlannerOrchestrator orchestrator;
    private final IntentParser intentParser;

    public RouteController(RoutePlannerOrchestrator orchestrator, IntentParser intentParser) {
        this.orchestrator = orchestrator;
        this.intentParser = intentParser;
    }

    /**
     * POST /api/route/plan — Generate initial route plan.
     * Body: { "query": "...", "sessionId": null, "city": "上海", "intent": {...} }
     * If intent is provided (from prior analyze call), the LLM parse step is skipped.
     */
    @PostMapping(value = "/plan", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.PlanResponse> plan(@RequestBody PlanRequest request) {
        return orchestrator.planRoute(request.query(), request.sessionId(), request.city(), request.intent());
    }

    /**
     * POST /api/route/analyze — Analyze NL query for intent completeness.
     * Body: { "query": "...", "sessionId": null, "city": "北京" }
     * Returns stage + missing fields + followup questions.
     */
    @PostMapping(value = "/analyze", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<IntentAnalysisResult> analyze(@RequestBody AnalyzeRequest request) {
        return Mono.fromCallable(() ->
                intentParser.analyzeWithCompleteness(request.query(), request.sessionId(), request.city()));
    }

    /**
     * POST /api/route/smart-plan — Unified endpoint: analyze + plan in one call.
     * Eliminates the extra HTTP round-trip and duplicate LLM call.
     *
     * Returns { stage, summaryText, followupQuestions, conflicts, routes, ... }
     * - followup/conflict stage: routes is null, frontend shows questions
     * - complete/assumption stage: routes populated, frontend shows route cards
     */
    @PostMapping(value = "/smart-plan", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> smartPlan(@RequestBody AnalyzeRequest request) {
        return Mono.fromCallable(() ->
                intentParser.analyzeWithCompleteness(request.query(), request.sessionId(), request.city()))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(analysis -> {
                    var stage = analysis.stage();
                    // Build base response with analysis
                    var result = new java.util.LinkedHashMap<String, Object>();
                    result.put("stage", stage);
                    result.put("summaryText", analysis.summaryText());

                    if ("followup".equals(stage) || "conflict".equals(stage)) {
                        result.put("intent", analysis.intent());
                        result.put("followupQuestions", analysis.followupQuestions());
                        result.put("conflicts", analysis.conflicts());
                        result.put("missingFields", analysis.missingFields());
                        result.put("routes", null);
                        return Mono.just(result);
                    }

                    // complete or assumption: run plan pipeline with parsed intent
                    result.put("intent", analysis.intent());
                    return orchestrator.planRoute(
                            request.query(),
                            analysis.intent().sessionId(),
                            request.city(),
                            analysis.intent())
                            .map(plan -> {
                                result.put("routes", plan.routes());
                                result.put("warning", plan.warning());
                                result.put("recommendedRoute", plan.recommendedRoute());
                                result.put("explanation", plan.explanation());
                                result.put("sessionId", plan.sessionId());
                                return result;
                            });
                });
    }

    /**
     * POST /api/route/adjust — Incrementally adjust a route.
     * Body: { "sessionId": "...", "adjustment": "换一家不排队的", "city": "上海" }
     */
    @PostMapping(value = "/adjust", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.PlanResponse> adjust(@RequestBody AdjustRequest request) {
        return orchestrator.adjustRoute(request.sessionId(), request.adjustment(), request.city());
    }

    /**
     * GET /api/route/compare/{sessionId} — Get multi-plan comparison.
     */
    @GetMapping(value = "/compare/{sessionId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.CompareResponse> compare(@PathVariable String sessionId) {
        return orchestrator.getComparison(sessionId);
    }

    /**
     * Health check endpoint.
     */
    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, String>> health() {
        return Mono.just(Map.of("status", "UP", "service", "AI Route Planner"));
    }

    // Request DTOs
    public record PlanRequest(String query, String sessionId, String city, UserIntent intent) {}
    public record AnalyzeRequest(String query, String sessionId, String city) {}
    public record AdjustRequest(String sessionId, String adjustment, String city) {}
}
