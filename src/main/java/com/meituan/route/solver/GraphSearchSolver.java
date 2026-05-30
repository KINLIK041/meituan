package com.meituan.route.solver;

import com.meituan.route.model.Constraint;
import com.meituan.route.model.POI;
import com.meituan.route.model.Route;
import com.meituan.route.model.UserIntent;
import com.meituan.route.model.UserPreference;
import org.jgrapht.Graph;
import org.jgrapht.graph.DefaultDirectedWeightedGraph;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Graph-based route solver using VRPTW-inspired approach.
 * Builds a weighted POI graph and searches for Pareto-optimal paths.
 */
@Component
public class GraphSearchSolver {

    private static final Logger log = LoggerFactory.getLogger(GraphSearchSolver.class);
    private static final double AVG_WALK_SPEED_KMH = 5.0;
    private static final double AVG_DRIVE_SPEED_KMH = 25.0;

    // Cache travel time estimates
    private final PreferenceScorer preferenceScorer;
    private final Map<String, Double> travelTimeCache = new ConcurrentHashMap<>();

    public GraphSearchSolver(PreferenceScorer preferenceScorer) {
        this.preferenceScorer = preferenceScorer;
    }

    /**
     * Generate multiple route plans from candidate POIs.
     * Each plan uses a different objective and a different subset of candidates
     * to ensure diversity — without this, all three goals converge on the same
     * high-rated POIs (e.g., 故宫).
     */
    public List<Route> generatePlans(List<POI> candidates, List<Constraint> constraints,
                                     UserIntent intent, int numPlans) {
        return generatePlans(candidates, constraints, intent, numPlans, null);
    }

    /**
     * Generate route plans with optional user preference for personalization.
     * When a UserPreference is provided, replaces CHEAPEST goal with PREFERENCE
     * for a "偏好优先" route.
     */
    public List<Route> generatePlans(List<POI> candidates, List<Constraint> constraints,
                                     UserIntent intent, int numPlans, UserPreference preference) {
        if (candidates.size() < 2) {
            return handleInsufficientPOIs(candidates, intent);
        }

        var goals = (preference != null && preference.preferenceTags() != null && !preference.preferenceTags().isEmpty())
                ? List.of("BEST_EXPERIENCE", "FASTEST", "PREFERENCE")
                : List.of("BEST_EXPERIENCE", "FASTEST", "CHEAPEST");
        var routes = new ArrayList<Route>();
        var usedIds = new HashSet<String>();

        for (var goal : goals) {
            if (routes.size() >= numPlans) break;

            // Build a goal-specific candidate pool — sort by the goal's score
            var goalCandidates = selectCandidatesForGoal(candidates, goal, preference);

            // Remove POIs already heavily used in previous routes to force diversity
            if (!usedIds.isEmpty()) {
                var diverse = new ArrayList<>(goalCandidates);
                diverse.removeIf(p -> usedIds.contains(p.id()));
                if (diverse.size() >= 3) {
                    goalCandidates = diverse;
                }
            }

            var graph = buildGraph(goalCandidates, intent);
            var route = searchBestRoute(graph, goalCandidates, constraints, intent, goal);
            if (route != null && route.segments().size() >= 2) {
                routes.add(route);
                route.segments().forEach(s -> usedIds.add(s.poi().id()));
            }
        }

        // Fallback: if diversity strategy produced too few routes, re-run without exclusion
        if (routes.size() < 2) {
            var fallbackGoals = goals.subList(routes.size(), goals.size());
            for (var goal : fallbackGoals) {
                var graph = buildGraph(candidates, intent);
                var route = searchBestRoute(graph, candidates, constraints, intent, goal);
                if (route != null && route.segments().size() >= 2) {
                    routes.add(route);
                }
            }
        }

        // Add names and descriptions
        int idx = 0;
        for (var r : routes) {
            String name = switch (r.optimizationGoal()) {
                case "BEST_EXPERIENCE" -> "体验最优方案";
                case "FASTEST" -> "最高效方案";
                case "CHEAPEST" -> "最省钱方案";
                case "PREFERENCE" -> "偏好优先方案";
                default -> "方案" + (idx + 1);
            };
            routes.set(idx, new Route(r.id(), name, generateDescription(r),
                    r.segments(), r.totalCost(), r.totalTravelTime(),
                    r.totalRating(), r.optimizationGoal(),
                    null, null, computeCompositeScore(r, constraints)));
            idx++;
        }

        return routes;
    }

    /**
     * Select top candidates for a specific optimization goal.
     * Different goals prioritize different dimensions so each route
     * explores a different region of the POI space.
     */
    private List<POI> selectCandidatesForGoal(List<POI> candidates, String goal, UserPreference preference) {
        var sorted = new ArrayList<>(candidates);
        switch (goal) {
            case "BEST_EXPERIENCE" -> sorted.sort((a, b) -> Double.compare(
                    b.rating() * 20 + b.popularityScore() * 0.3 + barBoost(b),
                    a.rating() * 20 + a.popularityScore() * 0.3 + barBoost(a)));
            case "FASTEST" -> {
                double sumLat = 0, sumLng = 0;
                for (var p : sorted) { sumLat += p.lat(); sumLng += p.lng(); }
                double cLat = sumLat / sorted.size(), cLng = sumLng / sorted.size();
                sorted.sort((a, b) -> {
                    double distA = haversine(a.lat(), a.lng(), cLat, cLng);
                    double distB = haversine(b.lat(), b.lng(), cLat, cLng);
                    double scoreA = (1.0 / Math.max(0.1, distA)) * 5.0
                            + (100.0 - Math.min(a.visitDuration(), 100)) * 0.3 + a.rating() * 3 + barBoost(a);
                    double scoreB = (1.0 / Math.max(0.1, distB)) * 5.0
                            + (100.0 - Math.min(b.visitDuration(), 100)) * 0.3 + b.rating() * 3 + barBoost(b);
                    return Double.compare(scoreB, scoreA);
                });
            }
            case "CHEAPEST" -> sorted.sort((a, b) -> Double.compare(
                    Math.max(0, 500 - a.avgCost()) * 0.3 + a.rating() * 5 + barBoost(a),
                    Math.max(0, 500 - b.avgCost()) * 0.3 + b.rating() * 5 + barBoost(b)));
            case "PREFERENCE" -> {
                if (preference != null) {
                    sorted.sort((a, b) -> Double.compare(
                            preferenceScorer.scorePOI(b, preference) * 10 + b.rating() * 5 + barBoost(b),
                            preferenceScorer.scorePOI(a, preference) * 10 + a.rating() * 5 + barBoost(a)));
                }
            }
            default -> sorted.sort((a, b) -> Double.compare(
                    b.rating() * 10 + b.popularityScore() * 0.2 + barBoost(b),
                    a.rating() * 10 + a.popularityScore() * 0.2 + barBoost(a)));
        }
        return sorted.subList(0, Math.min(15, sorted.size()));
    }

    private static double barBoost(POI poi) {
        if (poi.tags() == null) return 0;
        return poi.tags().stream().anyMatch(t ->
                t.contains("酒") || t.contains("吧") || t.contains("精酿") || t.contains("居酒屋")
                || t.contains("小酌") || t.contains("深夜")) ? 50 : 0;
    }

    /**
     * Build a directed weighted graph from candidate POIs.
     * Nodes = POIs, Edge weight = travel time (minutes).
     */
    private Graph<POI, DefaultWeightedEdge> buildGraph(List<POI> candidates, UserIntent intent) {
        var graph = new DefaultDirectedWeightedGraph<POI, DefaultWeightedEdge>(DefaultWeightedEdge.class);

        for (var poi : candidates) {
            graph.addVertex(poi);
        }

        String travelMode = intent.travelMode() != null ? intent.travelMode() : "WALKING";

        for (var from : candidates) {
            for (var to : candidates) {
                if (from.equals(to)) continue;
                var edge = graph.addEdge(from, to);
                if (edge != null) {
                    double travelTime = estimateTravelTime(from, to, travelMode);
                    graph.setEdgeWeight(edge, travelTime);
                }
            }
        }

        return graph;
    }

    /** Check if a POI is open from arrivalTime through arrivalTime + stayMinutes. Handles overnight close (e.g. bar closes at 02:00). */
    private static boolean isWithinOpenHours(POI poi, LocalTime arrival, int stayMinutes) {
        var open = poi.openTime();
        var close = poi.closeTime();
        var depart = arrival.plusMinutes(stayMinutes);
        if (close.isAfter(open)) {
            // Normal: e.g. 10:00-22:00
            return !arrival.isBefore(open) && !depart.isAfter(close);
        } else {
            // Overnight: e.g. 17:00-02:00 — close is next day
            return !arrival.isBefore(open) && !(depart.isAfter(close) && depart.isBefore(open));
        }
    }

    /**
     * Search for best route using a beam-search approach with constraint checking.
     */
    private Route searchBestRoute(Graph<POI, DefaultWeightedEdge> graph, List<POI> candidates,
                                  List<Constraint> constraints, UserIntent intent, String goal) {
        int maxPOIs = Math.min(6, candidates.size());
        int beamWidth = Math.min(20, candidates.size() * 2);

        // Beam: list of partial routes, each as (visited List, last POI, arrivalTime, cost, score, travelTime)
        var beam = new ArrayList<BeamEntry>();
        for (var poi : candidates) {
            if (intent.startTime() != null && !isWithinOpenHours(poi, intent.startTime(), poi.visitDuration())) {
                continue; // POI not open at start time
            }
            double poiScore = computePOIScore(poi, goal);
            beam.add(new BeamEntry(
                    new ArrayList<>(List.of(poi)),
                    poi,
                    intent.startTime() != null ? intent.startTime() : poi.openTime(),
                    poi.avgCost(),
                    poiScore,
                    0.0
            ));
        }

        Route bestRoute = null;
        double bestScore = -Double.MAX_VALUE;

        // Beam search iterations
        for (int step = 1; step < maxPOIs; step++) {
            var nextBeam = new ArrayList<BeamEntry>();

            for (var entry : beam) {
                // Find candidates not yet visited
                var visitedIds = entry.visited.stream().map(POI::id).collect(Collectors.toSet());
                var neighbors = candidates.stream()
                        .filter(p -> !visitedIds.contains(p.id()))
                        .toList();

                for (var nextPOI : neighbors) {
                    double travelTime = getTravelTime(entry.last, nextPOI, intent.travelMode());
                    var arrivalTime = entry.departureTime.plusMinutes((long) travelTime);
                    var departureTime = arrivalTime.plusMinutes(nextPOI.visitDuration() + (long) nextPOI.queueTime());

                    // Hard constraint: time window check
                    if (intent.endTime() != null && departureTime.isAfter(intent.endTime())) continue;
                    if (!isWithinOpenHours(nextPOI, arrivalTime, nextPOI.visitDuration())) continue;

                    double poiScore = computePOIScore(nextPOI, goal);
                    double newScore = entry.score + poiScore;
                    double newCost = entry.totalCost + nextPOI.avgCost();
                    double newTravelTime = entry.totalTravelTime + travelTime;

                    var newVisited = new ArrayList<>(entry.visited);
                    newVisited.add(nextPOI);

                    nextBeam.add(new BeamEntry(newVisited, nextPOI, departureTime, newCost, newScore, newTravelTime));
                }
            }

            // Prune beam to beam width — for FASTEST, penalize travel time heavily
            if (nextBeam.size() > beamWidth) {
                if ("FASTEST".equals(goal)) {
                    // FASTEST: sort by score adjusted for travel time (shorter = better)
                    nextBeam.sort((a, b) -> {
                        double sa = a.score - a.totalTravelTime * 3.0;
                        double sb = b.score - b.totalTravelTime * 3.0;
                        return Double.compare(sb, sa);
                    });
                } else {
                    nextBeam.sort((a, b) -> Double.compare(b.score, a.score));
                }
                nextBeam = new ArrayList<>(nextBeam.subList(0, beamWidth));
            }

            // Evaluate top entries as complete routes
            for (var entry : nextBeam) {
                double score;
                if ("FASTEST".equals(goal)) {
                    // For FASTEST: heavily penalize total travel time
                    score = (entry.score - entry.totalTravelTime * 5.0) / entry.visited.size();
                } else {
                    score = entry.score / entry.visited.size();
                }
                if (score > bestScore && entry.visited.size() >= 2) {
                    bestScore = score;
                    bestRoute = buildRoute(entry, intent, goal);
                }
            }

            beam = nextBeam;
        }

        // Fallback: if no route found, create a simple one from top POIs
        if (bestRoute == null && !candidates.isEmpty()) {
            var first = candidates.get(0);
            var fallback = new BeamEntry(
                    new ArrayList<>(List.of(first)), first,
                    intent.startTime() != null ? intent.startTime() : first.openTime(),
                    first.avgCost(), computePOIScore(first, goal), 0.0
            );
            if (candidates.size() >= 2) {
                var second = candidates.get(1);
                double travelTime = getTravelTime(first, second, intent.travelMode());
                fallback = new BeamEntry(
                        new ArrayList<>(List.of(first, second)), second,
                        fallback.departureTime.plusMinutes((long) travelTime + second.visitDuration()),
                        first.avgCost() + second.avgCost(),
                        fallback.score + computePOIScore(second, goal),
                        travelTime
                );
            }
            bestRoute = buildRoute(fallback, intent, goal);
        }

        return bestRoute;
    }

    private Route buildRoute(BeamEntry entry, UserIntent intent, String goal) {
        var segments = new ArrayList<Route.RouteSegment>();
        POI prev = null;
        LocalTime currentTime = intent.startTime() != null ? intent.startTime() : LocalTime.of(9, 0);

        for (var poi : entry.visited) {
            double travelTime = prev != null ? getTravelTime(prev, poi, intent.travelMode()) : 0.0;
            if (prev != null) {
                currentTime = currentTime.plusMinutes((long) travelTime);
            }
            // Ensure we don't arrive before opening (wait if needed)
            if (currentTime.isBefore(poi.openTime())) {
                currentTime = poi.openTime();
            }
            var departure = currentTime.plusMinutes(poi.visitDuration() + (long) poi.queueTime());

            segments.add(new Route.RouteSegment(poi, currentTime, departure, travelTime,
                    intent.travelMode() != null ? intent.travelMode() : "WALKING"));

            currentTime = departure;
            prev = poi;
        }

        double totalCost = entry.visited.stream().mapToDouble(POI::avgCost).sum();
        double totalRating = entry.visited.stream().mapToDouble(POI::rating).sum();
        String routeId = "route_" + UUID.randomUUID().toString().substring(0, 8);

        return new Route(routeId, "", "", segments, totalCost,
                entry.totalTravelTime, totalRating, goal, List.of(), List.of(), entry.score);
    }

    private double computePOIScore(POI poi, String goal) {
        return switch (goal) {
            case "BEST_EXPERIENCE" -> poi.rating() * 20 + poi.popularityScore() * 0.3;
            case "FASTEST" -> (100 - poi.visitDuration()) * 0.5 + poi.rating() * 5;
            case "CHEAPEST" -> Math.max(0, 500 - poi.avgCost()) * 0.3 + poi.rating() * 5;
            case "PREFERENCE" -> poi.rating() * 10 + poi.popularityScore() * 0.2;
            default -> poi.rating() * 10 + poi.popularityScore() * 0.2;
        };
    }

    private double computeCompositeScore(Route route, List<Constraint> constraints) {
        double ratingScore = route.segments().stream()
                .mapToDouble(s -> s.poi().rating()).average().orElse(0) * 20;
        double costPenalty = constraints.stream()
                .filter(c -> "budget".equals(c.id()))
                .findFirst()
                .map(c -> {
                    double budget = c.getValueAs(Double.class).orElse(Double.MAX_VALUE);
                    return Math.max(0, 100 - (route.totalCost() / budget) * 100);
                })
                .orElse(50.0);
        return ratingScore * 0.6 + costPenalty * 0.4;
    }

    /**
     * Estimate travel time between two POIs using Haversine distance.
     */
    public double estimateTravelTime(POI from, POI to, String travelMode) {
        String cacheKey = from.id() + "-" + to.id() + "-" + travelMode;
        return travelTimeCache.computeIfAbsent(cacheKey, k -> {
            double distance = haversine(from.lat(), from.lng(), to.lat(), to.lng());
            double speed = "DRIVING".equalsIgnoreCase(travelMode) ? AVG_DRIVE_SPEED_KMH : AVG_WALK_SPEED_KMH;
            double timeHours = distance / speed;
            double timeMinutes = timeHours * 60;
            // Minimum travel time of 2 minutes
            return Math.max(2, timeMinutes);
        });
    }

    public double getTravelTime(POI from, POI to, String travelMode) {
        return estimateTravelTime(from, to, travelMode);
    }

    /**
     * Haversine formula for distance in km.
     */
    public static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private List<Route> handleInsufficientPOIs(List<POI> candidates, UserIntent intent) {
        if (candidates.isEmpty()) return List.of();
        var segments = candidates.stream()
                .map(poi -> new Route.RouteSegment(poi, poi.openTime(),
                        poi.openTime().plusMinutes(poi.visitDuration()), 0, "WALKING"))
                .toList();
        double cost = candidates.stream().mapToDouble(POI::avgCost).sum();
        double rating = candidates.stream().mapToDouble(POI::rating).sum();
        return List.of(new Route("route_simple", "简化方案", "候选POI数量不足，生成简化路线",
                segments, cost, 0, rating, "BEST_EXPERIENCE", List.of(), List.of(), 50));
    }

    private String generateDescription(Route route) {
        var names = route.segments().stream().map(s -> s.poi().name()).toList();
        var times = route.segments().stream()
                .map(s -> s.arrivalTime().toString().substring(0, 5))
                .toList();
        var builder = new StringBuilder();
        for (int i = 0; i < names.size(); i++) {
            if (i > 0) builder.append(" → ");
            builder.append(times.get(i)).append(" ").append(names.get(i));
        }
        builder.append(" | 总费用: ¥").append(String.format("%.0f", route.totalCost()));
        builder.append(" | 评分: ").append(String.format("%.1f",
                route.totalRating() / route.segments().size()));
        return builder.toString();
    }

    // Beam search helper record
    private record BeamEntry(
            List<POI> visited,
            POI last,
            LocalTime departureTime,
            double totalCost,
            double score,
            double totalTravelTime
    ) {}
}
