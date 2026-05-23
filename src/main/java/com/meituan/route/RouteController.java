package com.meituan.route;

import com.meituan.route.llm.IntentParser;
import com.meituan.route.model.IntentAnalysisResult;
import com.meituan.route.orchestrator.RoutePlannerOrchestrator;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

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
     * Body: { "query": "...", "sessionId": null, "city": "上海" }
     */
    @PostMapping(value = "/plan", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.PlanResponse> plan(@RequestBody PlanRequest request) {
        return orchestrator.planRoute(request.query(), request.sessionId(), request.city());
    }

    /**
     * POST /api/route/analyze — Analyze NL query for intent completeness.
     * Body: { "query": "...", "sessionId": null, "city": "北京" }
     * Returns stage + missing fields + followup questions.
     */
    @PostMapping(value = "/analyze", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<IntentAnalysisResult> analyze(@RequestBody AnalyzeRequest request) {
        return Mono.fromCallable(() ->
                intentParser.analyzeWithCompleteness(request.query(), request.sessionId()));
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
    public record PlanRequest(String query, String sessionId, String city) {}
    public record AnalyzeRequest(String query, String sessionId, String city) {}
    public record AdjustRequest(String sessionId, String adjustment, String city) {}
}
