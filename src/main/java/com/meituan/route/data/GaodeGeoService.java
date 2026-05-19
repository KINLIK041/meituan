package com.meituan.route.data;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.math.BigInteger;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Gaode Maps Web Service API — geocoding and reverse geocoding.
 * Uses AMap REST API (restapi.amap.com) to convert addresses to coordinates and vice versa.
 */
@Service
public class GaodeGeoService {

    private static final Logger log = LoggerFactory.getLogger(GaodeGeoService.class);

    private final WebClient client;
    private final String apiKey;
    private final String securityKey;

    public GaodeGeoService(
            WebClient.Builder builder,
            @Value("${gaode.api.key}") String apiKey,
            @Value("${gaode.api.security-key:}") String securityKey,
            @Value("${gaode.api.base-url}") String baseUrl) {
        this.apiKey = apiKey;
        this.securityKey = securityKey;
        this.client = builder
                .baseUrl(baseUrl)
                .build();
        log.info("GaodeGeoService initialized: baseUrl={}, securityKey={}", baseUrl,
                securityKey != null && !securityKey.isEmpty() ? "***" : "none");
    }

    /**
     * Geocode an address string to a [lng, lat] pair.
     */
    @SuppressWarnings("unchecked")
    public Mono<double[]> geocode(String address, String city) {
        log.debug("Geocoding: address={}, city={}", address, city);

        var params = new TreeMap<String, String>();
        params.put("key", apiKey());
        params.put("address", address);
        params.put("city", city != null ? city : "北京");
        params.put("output", "json");

        return client.get()
                .uri(signUri("/v3/geocode/geo", params))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .flatMap(response -> {
                    try {
                        var status = String.valueOf(response.getOrDefault("status", "0"));
                        if (!"1".equals(status)) {
                            log.warn("Geocode failed: status={}, info={}", status, response.get("info"));
                            return Mono.empty();
                        }
                        var geocodes = (List<Map<String, Object>>) response.get("geocodes");
                        if (geocodes == null || geocodes.isEmpty()) return Mono.empty();
                        var loc = String.valueOf(geocodes.get(0).get("location"));
                        var parts = loc.split(",");
                        if (parts.length == 2) {
                            double lng = Double.parseDouble(parts[0]);
                            double lat = Double.parseDouble(parts[1]);
                            return Mono.just(new double[]{lng, lat});
                        }
                        return Mono.empty();
                    } catch (Exception e) {
                        log.warn("Failed to parse geocode response: {}", e.getMessage());
                        return Mono.empty();
                    }
                })
                .onErrorResume(e -> {
                    log.warn("Geocode API error: {}", e.getMessage());
                    return Mono.empty();
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Reverse geocode: convert [lng, lat] to an address string.
     */
    @SuppressWarnings("unchecked")
    public Mono<String> reverseGeocode(double lng, double lat) {
        log.debug("Reverse geocoding: lng={}, lat={}", lng, lat);

        var params = new TreeMap<String, String>();
        params.put("key", apiKey());
        params.put("location", lng + "," + lat);
        params.put("output", "json");

        return client.get()
                .uri(signUri("/v3/geocode/regeo", params))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .flatMap(response -> {
                    try {
                        var status = String.valueOf(response.getOrDefault("status", "0"));
                        if (!"1".equals(status)) return Mono.empty();
                        var regeocode = (Map<String, Object>) response.get("regeocode");
                        if (regeocode == null) return Mono.empty();
                        return Mono.justOrEmpty(
                                String.valueOf(regeocode.getOrDefault("formatted_address", "")));
                    } catch (Exception e) {
                        return Mono.empty();
                    }
                })
                .onErrorResume(e -> Mono.empty())
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Search POIs near a location using Gaode POI search API.
     */
    @SuppressWarnings("unchecked")
    public Mono<List<Map<String, Object>>> searchNearby(
            String keywords, String types, String city, double lng, double lat, int radius) {
        log.debug("POI search: keywords={}, city={}, lng={}, lat={}, radius={}", keywords, city, lng, lat, radius);

        var params = new TreeMap<String, String>();
        params.put("key", apiKey());
        params.put("location", lng + "," + lat);
        params.put("radius", String.valueOf(radius));
        params.put("output", "json");
        params.put("offset", "25");
        if (keywords != null && !keywords.isBlank()) params.put("keywords", keywords);
        if (types != null && !types.isBlank()) params.put("types", types);
        if (city != null && !city.isBlank()) params.put("city", city);

        return client.get()
                .uri(signUri("/v3/place/around", params))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(5))
                .flatMap(response -> {
                    try {
                        var status = String.valueOf(response.getOrDefault("status", "0"));
                        if (!"1".equals(status)) return Mono.just(List.<Map<String, Object>>of());
                        var pois = (List<Map<String, Object>>) response.get("pois");
                        return Mono.just(pois != null ? pois : List.<Map<String, Object>>of());
                    } catch (Exception e) {
                        return Mono.just(List.<Map<String, Object>>of());
                    }
                })
                .onErrorResume(e -> {
                    log.warn("POI search API error: {}", e.getMessage());
                    return Mono.just(List.<Map<String, Object>>of());
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    // ─── AMap signature ──────────────────────────────────────────

    /**
     * Build a signed URI string. AMap requires sorted params + MD5(concat + securityKey).
     */
    private String signUri(String path, TreeMap<String, String> params) {
        var sb = new StringBuilder();
        for (var e : params.entrySet()) {
            if (!sb.isEmpty()) sb.append("&");
            sb.append(e.getKey()).append("=").append(e.getValue());
        }
        if (securityKey != null && !securityKey.isEmpty()) {
            String sig = md5(sb.toString() + securityKey);
            sb.append("&sig=").append(sig);
        }
        return path + "?" + sb.toString();
    }

    private String md5(String input) {
        try {
            var md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            // Pad to 32 hex chars — BigInteger drops leading zeros
            return String.format("%032x", new BigInteger(1, digest));
        } catch (Exception e) {
            return "";
        }
    }

    private String apiKey() {
        return apiKey;
    }
}
