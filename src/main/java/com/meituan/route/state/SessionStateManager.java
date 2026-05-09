package com.meituan.route.state;

import com.meituan.route.model.Route;
import com.meituan.route.model.UserIntent;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages session state for multi-turn conversation.
 * Stores route planning snapshots for incremental adjustments.
 */
@Component
public class SessionStateManager {

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    /**
     * Create a new session and return its ID.
     */
    public String createSession() {
        String id = "sess_" + UUID.randomUUID().toString().substring(0, 8);
        sessions.put(id, new Session(id, new ArrayList<>(), null, Instant.now(), Instant.now()));
        return id;
    }

    /**
     * Get session by ID.
     */
    public Optional<Session> getSession(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    /**
     * Store a route snapshot for a session.
     */
    public void addSnapshot(String sessionId, Route route, UserIntent intent) {
        var session = sessions.get(sessionId);
        if (session != null) {
            var newSnapshots = new ArrayList<>(session.snapshots());
            newSnapshots.add(new Snapshot(newSnapshots.size() + 1, route, intent, Instant.now()));
            var updated = new Session(sessionId, newSnapshots, intent, session.createdAt(), Instant.now());
            sessions.put(sessionId, updated);
        }
    }

    /**
     * Update the latest intent for a session.
     */
    public void updateIntent(String sessionId, UserIntent intent) {
        var session = sessions.get(sessionId);
        if (session != null) {
            sessions.put(sessionId, new Session(sessionId, session.snapshots(), intent,
                    session.createdAt(), Instant.now()));
        }
    }

    /**
     * Get the latest route for a session.
     */
    public Optional<Route> getLatestRoute(String sessionId) {
        return getSession(sessionId)
                .map(Session::snapshots)
                .filter(s -> !s.isEmpty())
                .map(s -> s.get(s.size() - 1).route());
    }

    /**
     * Get all routes for a session.
     */
    public List<Route> getAllRoutes(String sessionId) {
        return getSession(sessionId)
                .map(Session::snapshots)
                .orElse(List.of())
                .stream()
                .map(Snapshot::route)
                .toList();
    }

    /**
     * Handle adjustment: keep prefix, regenerate suffix.
     * Returns the number of POIs to keep from the front.
     */
    public int resolveAdjustment(String adjustment, Route currentRoute) {
        var adj = adjustment.toLowerCase();

        if (adj.contains("前面") || adj.contains("前几家")) {
            // Try to parse how many to keep
            if (adj.contains("都不")) return 0;
            if (adj.contains("一家") || adj.contains("一个")) return 1;
            if (adj.contains("两家") || adj.contains("两个")) return 2;
            return 1; // default: keep first
        }

        if (adj.contains("最后") || adj.contains("后面")) {
            if (adj.contains("一家") || adj.contains("一个")) {
                int segCount = currentRoute.segments().size();
                return segCount - 1; // keep all except last
            }
            return 0;
        }

        if (adj.contains("换成") || adj.contains("换")) {
            // Find which POI to replace
            for (int i = 0; i < currentRoute.segments().size(); i++) {
                var seg = currentRoute.segments().get(i);
                if (adj.contains(seg.poi().name()) || adj.contains(seg.poi().category())) {
                    return i; // keep up to this POI
                }
            }
            // Replace last POI of matching category
            return currentRoute.segments().size() - 1;
        }

        // Default: full re-plan
        return 0;
    }

    public record Session(
            String sessionId,
            List<Snapshot> snapshots,
            UserIntent currentIntent,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record Snapshot(
            int version,
            Route route,
            UserIntent intent,
            Instant timestamp
    ) {}
}
