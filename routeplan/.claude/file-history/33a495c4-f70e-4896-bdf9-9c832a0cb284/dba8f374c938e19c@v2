package com.meituan.route.model;

import java.time.LocalTime;
import java.util.List;

/**
 * Point of Interest - a location that can be visited in a route.
 */
public record POI(
        String id,
        String name,
        String category,       // RESTAURANT, ATTRACTION, SHOPPING, ENTERTAINMENT, CULTURE
        String subCategory,
        double lat,
        double lng,
        String address,
        String district,       // e.g. "三里屯", "国贸"
        String city,
        double rating,
        double avgCost,
        double queueTime,      // estimated queue time in minutes
        LocalTime openTime,
        LocalTime closeTime,
        int visitDuration,     // recommended stay in minutes
        List<String> tags,
        String imageUrl,
        String description,
        double popularityScore // 0-100
) {
    public boolean isOpenDuring(LocalTime start, LocalTime end) {
        return !start.isBefore(openTime) && !end.isAfter(closeTime);
    }

    public boolean matchesCategory(String cat) {
        return category.equalsIgnoreCase(cat) || tags.stream().anyMatch(t -> t.contains(cat));
    }
}
