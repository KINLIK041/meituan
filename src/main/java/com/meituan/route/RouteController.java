package com.meituan.route;

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

    public RouteController(RoutePlannerOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    /**
     * POST /api/route/plan — Generate initial route plan.
     * Body: { "query": "...", "sessionId": null }
     */
    @PostMapping(value = "/plan", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.PlanResponse> plan(@RequestBody PlanRequest request) {
        return orchestrator.planRoute(request.query(), request.sessionId());
    }

    /**
     * POST /api/route/adjust — Incrementally adjust a route.
     * Body: { "sessionId": "...", "adjustment": "换一家不排队的" }
     */
    @PostMapping(value = "/adjust", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<RoutePlannerOrchestrator.PlanResponse> adjust(@RequestBody AdjustRequest request) {
        return orchestrator.adjustRoute(request.sessionId(), request.adjustment());
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
    public record PlanRequest(String query, String sessionId) {}
    public record AdjustRequest(String sessionId, String adjustment) {}
}
