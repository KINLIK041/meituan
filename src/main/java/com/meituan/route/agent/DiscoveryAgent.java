package com.meituan.route.agent;

import com.meituan.route.data.DataService;
import com.meituan.route.model.POI;
import com.meituan.route.model.UserIntent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DiscoveryAgent receives a UserIntent and retrieves candidate POIs from the DataService.
 * Applies hard constraint filtering (time, category matching).
 */
@Component
public class DiscoveryAgent {

    private static final Logger log = LoggerFactory.getLogger(DiscoveryAgent.class);

    private final DataService dataService;

    public DiscoveryAgent(DataService dataService) {
        this.dataService = dataService;
    }

    /**
     * Discover candidate POIs based on user intent.
     * Uses parallel queries for different categories.
     */
    public Mono<DiscoveryResult> discover(UserIntent intent) {
        log.info("DiscoveryAgent searching for POIs in {} {} categories: {}",
                intent.city(), intent.district(), intent.preferredCategories());

        String city = intent.city() != null ? intent.city() : "北京";

        // If specific categories are provided, search by each in parallel
        List<String> categories = intent.preferredCategories();
        if (categories == null || categories.isEmpty()) {
            categories = List.of("RESTAURANT", "ATTRACTION", "SHOPPING", "ENTERTAINMENT", "CULTURE");
        }

        // Parallel search across categories using virtual threads
        var poiFluxes = categories.stream()
                .map(cat -> dataService.searchByCategory(city, intent.district(), cat))
                .toList();

        var allPOIs = Flux.merge(poiFluxes)
                .distinct(POI::id)
                .collectList()
                .flatMap(pois -> applyHardFilters(pois, intent));

        return allPOIs.map(pois -> {
            log.info("DiscoveryAgent found {} POIs after filtering", pois.size());
            return new DiscoveryResult(pois, categorizePOIs(pois), intent);
        });
    }

    /**
     * Apply hard constraints to filter candidates.
     */
    private Mono<List<POI>> applyHardFilters(List<POI> pois, UserIntent intent) {
        var filtered = pois.stream()
                .filter(poi -> {
                    // Budget filter (hard ceiling at 2x budget for flexibility)
                    if (intent.budget() > 0 && poi.avgCost() > intent.budget() * 2) {
                        return false;
                    }
                    return true;
                })
                .sorted(Comparator.<POI, Double>comparing(p -> -p.rating())
                        .thenComparing(p -> -p.popularityScore()))
                .limit(20) // Limit candidates for solver performance
                .toList();

        return Mono.just(filtered);
    }

    /**
     * Categorize POIs for easier processing by PlanningAgent.
     */
    private Map<String, List<POI>> categorizePOIs(List<POI> pois) {
        return pois.stream()
                .collect(Collectors.groupingBy(POI::category));
    }

    /**
     * Extract a user's special request keywords into POI tag filters.
     */
    public List<String> extractPreferenceTags(UserIntent intent) {
        var tags = new ArrayList<String>();
        if (intent.specialRequest() != null) {
            var req = intent.specialRequest();
            if (req.contains("拍照")) tags.add("拍照");
            if (req.contains("约会")) tags.add("约会");
            if (req.contains("安静")) tags.add("安静");
        }
        if (intent.keywords() != null) {
            tags.addAll(intent.keywords());
        }
        return tags;
    }

    /**
     * Create a broad intent for speculative discovery — search all categories
     * in the default city while LLM parses the real intent in parallel.
     */
    public static UserIntent broadIntent(String defaultCity) {
        return new UserIntent(
                "", defaultCity, null,
                null, // all categories
                null,
                java.time.LocalTime.of(14, 0), java.time.LocalTime.of(22, 0),
                0, 2, 3.5, 30,
                "WALKING", "BEST_EXPERIENCE",
                null, List.of(), null
        );
    }

    /**
     * Filter speculative discovery results to match the parsed intent's categories.
     * When speculative results already exist, this avoids a second API call.
     */
    public DiscoveryResult filterForIntent(DiscoveryResult speculative, UserIntent intent) {
        var targetCats = intent.preferredCategories();
        if (targetCats == null || targetCats.isEmpty()) {
            return speculative; // broad search already covers all
        }

        var targetSet = new java.util.HashSet<>(targetCats.stream()
                .map(String::toUpperCase).toList());

        var filtered = speculative.candidates().stream()
                .filter(poi -> {
                    var cat = poi.category() != null ? poi.category().toUpperCase() : "";
                    return targetSet.contains(cat) || targetSet.stream().anyMatch(cat::contains);
                })
                .sorted(java.util.Comparator.<POI, Double>comparing(p -> -p.rating())
                        .thenComparing(p -> -p.popularityScore()))
                .limit(20)
                .toList();

        log.info("DiscoveryAgent filtered speculative {} POIs → {} POIs for intent categories",
                speculative.candidates().size(), filtered.size());
        return new DiscoveryResult(filtered, categorizePOIs(filtered), intent);
    }

    public record DiscoveryResult(
            List<POI> candidates,
            Map<String, List<POI>> categorizedPOIs,
            UserIntent intent
    ) {}
}
