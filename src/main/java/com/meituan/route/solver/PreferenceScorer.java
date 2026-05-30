package com.meituan.route.solver;

import com.meituan.route.model.POI;
import com.meituan.route.model.Route;
import com.meituan.route.model.UserPreference;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Computes preference-match scores for POIs and routes against a user profile.
 * Algorithm: score = sum(matched preference_tag weights) - sum(matched avoid_tag weights)
 */
@Component
public class PreferenceScorer {

    /**
     * Score a single POI against a user's preference profile.
     * Positive = matches preferences, negative = matches avoidances.
     */
    public double scorePOI(POI poi, UserPreference profile) {
        if (profile == null || poi == null) return 0;
        var poiTags = poi.tags();
        if (poiTags == null || poiTags.isEmpty()) return 0;

        double score = 0;
        for (var entry : profile.preferenceTags().entrySet()) {
            if (tagMatches(poiTags, entry.getKey())) {
                score += entry.getValue();
            }
        }
        for (var entry : profile.avoidTags().entrySet()) {
            if (tagMatches(poiTags, entry.getKey())) {
                score -= entry.getValue();
            }
        }
        return score;
    }

    /**
     * Score a route as the average of all its POI preference scores.
     */
    public double scoreRoute(Route route, UserPreference profile) {
        if (route == null || route.segments() == null || route.segments().isEmpty()) return 0;
        return route.segments().stream()
                .mapToDouble(s -> scorePOI(s.poi(), profile))
                .average().orElse(0);
    }

    /**
     * Normalize raw preference score to 0-100 scale using a sigmoid function.
     */
    public double normalizedScore(Route route, UserPreference profile) {
        double raw = scoreRoute(route, profile);
        return 100.0 / (1.0 + Math.exp(-raw * 2.5));
    }

    /**
     * Get the top matched preference tags for display (up to 4).
     * Returns the preference tag names that matched POIs in the route.
     */
    public List<String> matchedTags(Route route, UserPreference profile) {
        if (profile == null || route == null || route.segments() == null) return List.of();
        Set<String> allPoiTags = new HashSet<>();
        for (var seg : route.segments()) {
            var tags = seg.poi().tags();
            if (tags != null) allPoiTags.addAll(tags);
        }
        return profile.preferenceTags().keySet().stream()
                .filter(tag -> allPoiTags.stream().anyMatch(pt -> tagMatches(List.of(pt), tag)))
                .sorted((a, b) -> Double.compare(
                        profile.preferenceTags().getOrDefault(b, 0.0),
                        profile.preferenceTags().getOrDefault(a, 0.0)))
                .limit(4)
                .toList();
    }

    /**
     * Combined route score: 50% constraint satisfaction + 50% preference match.
     */
    public double combinedScore(Route route, UserPreference profile) {
        double prefNorm = normalizedScore(route, profile);
        double existingScore = route.score();
        return existingScore * 0.5 + prefNorm * 0.5;
    }

    private boolean tagMatches(List<String> poiTags, String profileTag) {
        for (var pt : poiTags) {
            if (pt.contains(profileTag) || profileTag.contains(pt)) return true;
        }
        return false;
    }
}
