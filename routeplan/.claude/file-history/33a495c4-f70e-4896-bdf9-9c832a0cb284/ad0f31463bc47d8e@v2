package com.meituan.route.solver;

import com.meituan.route.model.Constraint;
import com.meituan.route.model.POI;
import com.meituan.route.model.Route;
import com.meituan.route.model.UserIntent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Constraint engine managing hard and soft constraints with priority-based relaxation.
 * Hard constraints must be satisfied (pruning). Soft constraints are scored and can be relaxed.
 */
@Component
public class ConstraintEngine {

    private static final Logger log = LoggerFactory.getLogger(ConstraintEngine.class);

    /**
     * Validate all constraints against a route. Returns violations.
     */
    public ConstraintResult validate(Route route, List<Constraint> constraints, UserIntent intent) {
        var violations = new ArrayList<ConstraintViolation>();
        var satisfied = new ArrayList<Constraint>();

        for (var c : constraints) {
            boolean ok = switch (c.type()) {
                case HARD -> checkHard(c, route);
                case SOFT -> checkSoft(c, route);
            };
            if (ok) {
                satisfied.add(c);
            } else {
                violations.add(new ConstraintViolation(c, c.type() == Constraint.ConstraintType.HARD
                        ? Severity.CRITICAL : Severity.WARNING, describeViolation(c, route)));
            }
        }
        return new ConstraintResult(violations, satisfied, route);
    }

    /**
     * Build constraints from user intent.
     */
    public List<Constraint> buildConstraints(UserIntent intent, List<POI> candidates) {
        var constraints = new ArrayList<Constraint>();
        int idx = 0;

        // Time window constraint (hard)
        if (intent.startTime() != null && intent.endTime() != null) {
            constraints.add(new Constraint("tw_" + idx++, Constraint.ConstraintType.HARD,
                    Constraint.Scope.GLOBAL, 10, 0,
                    "Time window: " + intent.startTime() + " - " + intent.endTime(),
                    List.of(intent.startTime(), intent.endTime())));
        }

        // Category constraints for sequential POIs
        if (intent.preferredCategories() != null) {
            for (var cat : intent.preferredCategories()) {
                constraints.add(Constraint.category(cat, 8));
            }
        }

        // Budget constraint (soft, can relax)
        if (intent.budget() > 0) {
            constraints.add(Constraint.budget(intent.budget(), 6));
        }

        // Rating (soft)
        if (intent.minRating() > 0) {
            constraints.add(Constraint.minRating(intent.minRating(), 5));
        }

        // Queue tolerance (soft)
        if (intent.maxQueueMinutes() > 0) {
            constraints.add(Constraint.maxQueue(intent.maxQueueMinutes(), 4));
        }

        // Travel mode (soft)
        if (intent.travelMode() != null) {
            constraints.add(Constraint.travelMode(intent.travelMode(), 3));
        }

        return constraints;
    }

    /**
     * Attempt constraint relaxation when no solution exists.
     * Returns relaxed constraints ordered by relaxation level.
     */
    public List<List<Constraint>> relaxConstraints(List<Constraint> constraints) {
        var hard = constraints.stream().filter(c -> c.type() == Constraint.ConstraintType.HARD).toList();
        var soft = new ArrayList<>(constraints.stream()
                .filter(c -> c.type() == Constraint.ConstraintType.SOFT)
                .sorted(Comparator.comparingDouble(Constraint::priority))
                .toList());

        List<List<Constraint>> relaxations = new ArrayList<>();

        // Level 0: remove lowest priority soft constraint
        if (!soft.isEmpty()) {
            var relaxed = new ArrayList<>(hard);
            for (int i = 1; i < soft.size(); i++) {
                relaxed.add(soft.get(i));
            }
            relaxations.add(relaxed);
        }

        // Level 1: remove two lowest priority soft constraints
        if (soft.size() >= 3) {
            var relaxed = new ArrayList<>(hard);
            for (int i = 2; i < soft.size(); i++) {
                relaxed.add(soft.get(i));
            }
            relaxations.add(relaxed);
        }

        // Level 2: also relax budget by 50%
        var relaxed = new ArrayList<>(constraints);
        relaxed = relaxed.stream().map(c -> {
            if ("budget".equals(c.id())) {
                double newBudget = c.getValueAs(Double.class).orElse(0.0) * 1.5;
                return Constraint.budget(newBudget, c.priority());
            }
            return c;
        }).collect(Collectors.toCollection(ArrayList::new));
        relaxations.add(relaxed);

        return relaxations;
    }

    /**
     * Score a route against soft constraints (0-100).
     */
    public double scoreRoute(Route route, List<Constraint> constraints) {
        if (constraints.isEmpty()) return 100.0;

        double totalWeight = constraints.stream()
                .filter(c -> c.type() == Constraint.ConstraintType.SOFT)
                .mapToDouble(Constraint::weight)
                .sum();

        double score = 0;
        for (var c : constraints) {
            if (c.type() != Constraint.ConstraintType.SOFT) continue;
            score += c.weight() * scoreConstraint(c, route);
        }

        return totalWeight > 0 ? (score / totalWeight) * 100 : 100.0;
    }

    private boolean checkHard(Constraint c, Route route) {
        return switch (c.id()) {
            case "time_window" -> checkTimeWindow(c, route);
            case "category" -> checkCategory(c, route);
            default -> true;
        };
    }

    private boolean checkSoft(Constraint c, Route route) {
        return switch (c.id()) {
            case "budget" -> route.totalCost() <= c.getValueAs(Double.class).orElse(Double.MAX_VALUE);
            case "min_rating" -> route.totalRating() / Math.max(1, route.segments().size()) >= c.getValueAs(Double.class).orElse(0.0);
            case "max_queue" -> route.segments().stream()
                    .noneMatch(s -> s.poi().queueTime() > c.getValueAs(Double.class).orElse(999.0));
            default -> true;
        };
    }

    private double scoreConstraint(Constraint c, Route route) {
        return switch (c.id()) {
            case "budget" -> {
                double budget = c.getValueAs(Double.class).orElse(1.0);
                yield Math.max(0, 1 - route.totalCost() / budget);
            }
            case "min_rating" -> {
                double min = c.getValueAs(Double.class).orElse(0.0);
                double avg = route.totalRating() / Math.max(1, route.segments().size());
                yield Math.min(1, avg / (min + 0.01));
            }
            case "max_queue" -> {
                double max = c.getValueAs(Double.class).orElse(999.0);
                double avgQueue = route.segments().stream().mapToDouble(s -> s.poi().queueTime()).average().orElse(0);
                yield Math.max(0, 1 - avgQueue / (max + 0.01));
            }
            default -> 0.5;
        };
    }

    private boolean checkTimeWindow(Constraint c, Route route) {
        var times = c.getValueAs(List.class).orElse(List.of());
        if (times.size() < 2) return true;
        LocalTime windowStart = (LocalTime) times.get(0);
        LocalTime windowEnd = (LocalTime) times.get(1);

        return route.segments().stream().allMatch(seg -> {
            var poi = seg.poi();
            return seg.arrivalTime() != null && seg.departureTime() != null
                    && !seg.arrivalTime().isBefore(poi.openTime())
                    && !seg.departureTime().isAfter(poi.closeTime())
                    && !seg.arrivalTime().isBefore(windowStart)
                    && !seg.departureTime().isAfter(windowEnd);
        });
    }

    private boolean checkCategory(Constraint c, Route route) {
        String cat = c.getValueAs(String.class).orElse("");
        return route.segments().stream().anyMatch(s -> s.poi().matchesCategory(cat));
    }

    private String describeViolation(Constraint c, Route route) {
        return switch (c.id()) {
            case "budget" -> "Total cost ¥%.0f exceeds budget".formatted(route.totalCost());
            case "time_window" -> "Route extends outside available time window";
            case "min_rating" -> "Average rating %.1f is below minimum".formatted(
                    route.totalRating() / Math.max(1, route.segments().size()));
            case "max_queue" -> "Queue time exceeds tolerance";
            default -> "Constraint violation: " + c.description();
        };
    }

    // --- Result types ---

    public record ConstraintViolation(Constraint constraint, Severity severity, String message) {}

    public enum Severity { CRITICAL, WARNING, INFO }

    public record ConstraintResult(
            List<ConstraintViolation> violations,
            List<Constraint> satisfied,
            Route route
    ) {
        public boolean hasHardViolations() {
            return violations.stream().anyMatch(v -> v.severity() == Severity.CRITICAL);
        }
    }
}
