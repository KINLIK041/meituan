package com.meituan.route.agent;

import com.meituan.route.llm.IntentParser;
import com.meituan.route.model.UserIntent;
import com.meituan.route.state.SessionStateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * ConversationAgent handles multi-turn dialogue, maintains session context,
 * and outputs a structured UserIntent.
 *
 * Responsibilities:
 * - Parse natural language queries into structured intents
 * - Maintain conversation history across turns
 * - Detect intent changes for incremental adjustments
 */
@Component
public class ConversationAgent {

    private static final Logger log = LoggerFactory.getLogger(ConversationAgent.class);

    private final IntentParser intentParser;
    private final SessionStateManager sessionManager;

    public ConversationAgent(IntentParser intentParser, SessionStateManager sessionManager) {
        this.intentParser = intentParser;
        this.sessionManager = sessionManager;
    }

    /**
     * Synchronous entry point kept for backward compatibility.
     */
    public ConversationResult process(String query, String sessionId) {
        return processAsync(query, sessionId, null).block();
    }

    /**
     * Reactive entry point: runs the LLM intent parse and the session DB
     * lookup in parallel via Mono.zip, then assembles the result.
     *
     * @param cityHint user's selected city — passed through to the LLM so
     *                 queries without explicit city mention default to the
     *                 correct city instead of always "北京"
     */
    public Mono<ConversationResult> processAsync(String query, String sessionId) {
        return processAsync(query, sessionId, null);
    }

    public Mono<ConversationResult> processAsync(String query, String sessionId, String cityHint) {
        log.info("ConversationAgent processing query: '{}' for session: {}, cityHint={}", query, sessionId, cityHint);

        String actualSessionId = sessionId;
        if (actualSessionId == null || actualSessionId.isBlank()) {
            actualSessionId = sessionManager.createSession();
            log.info("Created new session: {}", actualSessionId);
        }

        final var sid = actualSessionId;

        // LLM parse (reactive, offloaded to boundedElastic) and session lookup in parallel
        var intentMono = intentParser.parseAsync(query, sid, cityHint);
        var sessionMono = Mono.fromCallable(() -> sessionManager.getSession(sid))
                .subscribeOn(Schedulers.boundedElastic());

        return Mono.zip(intentMono, sessionMono).map(tuple -> {
            var intent = tuple.getT1();
            var existingSession = tuple.getT2();

            boolean isAdjustment = existingSession.isPresent()
                    && existingSession.get().snapshots() != null
                    && !existingSession.get().snapshots().isEmpty();

            if (isAdjustment) {
                sessionManager.updateIntent(sid, intent);
            }

            String adjustmentQuery = null;
            if (isAdjustment && isAdjustmentQuery(query)) {
                adjustmentQuery = query;
            }

            log.info("ConversationAgent produced intent: city={}, district={}, categories={}",
                    intent.city(), intent.district(), intent.preferredCategories());

            return new ConversationResult(sid, intent, adjustmentQuery,
                    existingSession.map(s -> s.currentIntent()).orElse(null));
        });
    }

    private boolean isAdjustmentQuery(String query) {
        var adj = query.toLowerCase();
        return adj.contains("换") || adj.contains("改") || adj.contains("调整")
                || adj.contains("不要") || adj.contains("替换") || adj.contains("去掉")
                || adj.contains("少走") || adj.contains("便宜") || adj.contains("排队")
                || adj.contains("口味") || adj.contains("出片") || adj.contains("地铁")
                || adj.contains("安静") || adj.contains("省时");
    }

    /**
     * Result from ConversationAgent processing.
     */
    public record ConversationResult(
            String sessionId,
            UserIntent intent,
            String adjustmentQuery,
            UserIntent previousIntent
    ) {
        public boolean isAdjustment() {
            return adjustmentQuery != null;
        }
    }
}
