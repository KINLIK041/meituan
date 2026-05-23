package com.meituan.route;

import com.meituan.route.entity.FavoriteEntity;
import com.meituan.route.repository.FavoriteRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;

    public FavoriteController(FavoriteRepository favoriteRepository) {
        this.favoriteRepository = favoriteRepository;
    }

    /**
     * POST /api/favorites — Save a route to favorites.
     */
    @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<FavoriteEntity> save(@RequestBody SaveRequest request) {
        var entity = new FavoriteEntity();
        entity.setRouteJson(request.routeJson());
        entity.setRouteName(request.routeName());
        entity.setScene(request.scene());
        entity.setPoiCount(request.poiCount() != null ? request.poiCount() : 0);
        entity.setTotalTime(request.totalTime());
        entity.setTotalCost(request.totalCost() != null ? request.totalCost() : 0);
        return Mono.just(favoriteRepository.save(entity));
    }

    /**
     * GET /api/favorites — List all saved favorites (newest first).
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<List<FavoriteEntity>> list() {
        return Mono.just(favoriteRepository.findAllByOrderByCreatedAtDesc());
    }

    /**
     * DELETE /api/favorites/{id} — Remove a favorite.
     */
    @DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> delete(@PathVariable Long id) {
        if (favoriteRepository.existsById(id)) {
            favoriteRepository.deleteById(id);
            return Mono.just(Map.of("success", true, "id", id));
        }
        return Mono.just(Map.of("success", false, "message", "Favorite not found"));
    }

    public record SaveRequest(
            String routeJson,
            String routeName,
            String scene,
            Integer poiCount,
            String totalTime,
            Integer totalCost
    ) {}
}
