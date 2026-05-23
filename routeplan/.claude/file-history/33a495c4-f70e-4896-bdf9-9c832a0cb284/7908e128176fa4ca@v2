package com.meituan.route.agent;

import com.meituan.route.llm.IntentParser;
import com.meituan.route.model.UserIntent;
import com.meituan.route.state.SessionStateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

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
     * Process a natural language request and produce a structured intent.
     * For new sessions, creates a fresh intent.
     * For existing sessions, merges the adjustment with prior context.
     */
    public ConversationResult process(String query, String sessionId) {
        log.info("ConversationAgent processing query: '{}' for session: {}", query, sessionId);

        String actualSessionId = sessionId;
        if (actualSessionId == null || actualSessionId.isBlank()) {
            actualSessionId = sessionManager.createSession();
            log.info("Created new session: {}", actualSessionId);
        }

        // Parse the query into intent
        var intent = intentParser.parse(query, actualSessionId);

        // Check if this is an adjustment to an existing session
        var existingSession = sessionManager.getSession(actualSessionId);
        boolean isAdjustment = existingSession.isPresent()
                && existingSession.get().snapshots() != null
                && !existingSession.get().snapshots().isEmpty();

        if (isAdjustment) {
            sessionManager.updateIntent(actualSessionId, intent);
        }

        // Detect adjustments keywords
        String adjustmentQuery = null;
        if (isAdjustment && isAdjustmentQuery(query)) {
            adjustmentQuery = query;
        }

        log.info("ConversationAgent produced intent: city={}, district={}, categories={}",
                intent.city(), intent.district(), intent.preferredCategories());

        return new ConversationResult(actualSessionId, intent, adjustmentQuery,
                existingSession.map(s -> s.currentIntent()).orElse(null));
    }

    private boolean isAdjustmentQuery(String query) {
        var adj = query.toLowerCase();
        return adj.contains("换") || adj.contains("改") || adj.contains("调整")
                || adj.contains("不要") || adj.contains("替换") || adj.contains("去掉");
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
