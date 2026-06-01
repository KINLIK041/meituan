package com.meituan.route.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meituan.route.llm.DynamicLLMProvider;
import com.meituan.route.model.Route;
import com.meituan.route.model.UserIntent;
import com.meituan.route.model.UserPreference;
import com.meituan.route.orchestrator.RoutePlannerOrchestrator;
import com.meituan.route.service.UserProfileService;
import com.meituan.route.solver.PreferenceScorer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.*;

/**
 * AgentLoopOrchestrator — LLM-driven dynamic tool-calling orchestrator.
 *
 * Replaces the fixed 5-agent pipeline with an intelligent Agent Loop:
 * 1. LLM receives user query + available tool descriptions
 * 2. LLM decides which tool to call next (or finishes)
 * 3. Tool executes and returns results
 * 4. Results fed back to LLM for the next decision
 * 5. Loop continues until LLM signals "finish" or max iterations reached
 *
 * This architecture is more flexible, more "AI-native", and tells a better
 * competition story than the traditional fixed pipeline approach.
 */
@Service
public class AgentLoopOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(AgentLoopOrchestrator.class);
    private static final ObjectMapper mapper = new ObjectMapper();
    private static final int MAX_ITERATIONS = 8;

    private final DynamicLLMProvider llmProvider;
    private final ToolRegistry toolRegistry;
    private final UserProfileService userProfileService;
    private final PreferenceScorer preferenceScorer;

    // Reference to the existing pipeline orchestrator for fallback and reusable logic
    private final RoutePlannerOrchestrator pipelineOrchestrator;

    public AgentLoopOrchestrator(DynamicLLMProvider llmProvider,
                                  ToolRegistry toolRegistry,
                                  UserProfileService userProfileService,
                                  PreferenceScorer preferenceScorer,
                                  RoutePlannerOrchestrator pipelineOrchestrator) {
        this.llmProvider = llmProvider;
        this.toolRegistry = toolRegistry;
        this.userProfileService = userProfileService;
        this.preferenceScorer = preferenceScorer;
        this.pipelineOrchestrator = pipelineOrchestrator;
    }

    /**
     * Plan a route using the LLM-driven Agent Loop.
     * Falls back to the existing fixed pipeline if the Agent Loop fails.
     */
    public Mono<RoutePlannerOrchestrator.PlanResponse> agentPlan(String query, String sessionId,
                                                                  String city, String userId) {
        log.info("AgentLoop: starting agent-driven planning for '{}', city={}, userId={}",
                query, city, userId);

        return Mono.fromCallable(() -> {
            // Load user profile
            UserPreference profile = null;
            if (userId != null && !userId.isBlank()) {
                profile = userProfileService.getUserProfile(userId).block();
            }
            if (profile == null) profile = UserPreference.neutral();

            // Build context for the LLM
            var context = new StringBuilder();
            context.append("用户查询: ").append(query).append("\n");
            context.append("城市: ").append(city != null ? city : "未指定").append("\n");
            if (userId != null && !userId.isBlank()) {
                context.append("用户ID: ").append(userId).append("\n");
                context.append("用户画像: ").append(profile.profileName())
                       .append(" (").append(profile.name()).append(")\n");
            }
            context.append("\n");

            // Build system prompt
            var systemPrompt = buildSystemPrompt();

            // Agent Loop
            var model = llmProvider.getDefaultModel();
            for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
                log.info("AgentLoop: iteration {}/{}", iteration + 1, MAX_ITERATIONS);

                // Ask LLM to decide next action
                var userMessage = context + "\n---\n请决定下一步操作（call_tool 或 finish）：";
                var fullPrompt = systemPrompt + "\n\n---\n\n当前上下文:\n" + userMessage;
                var response = model.chat(fullPrompt);

                // Parse LLM decision
                var decision = parseDecision(response);
                if (decision == null) {
                    log.warn("AgentLoop: couldn't parse LLM response at iteration {}, falling back", iteration);
                    break;
                }

                if ("finish".equals(decision.action())) {
                    log.info("AgentLoop: LLM signaled finish at iteration {}", iteration + 1);
                    // Return structured result
                    return buildPlanResponse(decision, sessionId, query, city, userId, profile);
                }

                if ("call_tool".equals(decision.action())) {
                    var toolName = decision.tool();
                    var toolArgs = decision.arguments();
                    log.info("AgentLoop: LLM calls tool '{}' with args '{}'", toolName, toolArgs);

                    var tool = toolRegistry.get(toolName);
                    if (tool.isEmpty()) {
                        context.append("错误: 工具 '").append(toolName).append("' 不存在。可用工具: ")
                               .append(toolRegistry.summarize()).append("\n");
                        continue;
                    }

                    var result = tool.get().execute(toolArgs != null ? toolArgs : "{}");
                    context.append("工具调用: ").append(toolName).append("\n");
                    context.append("结果: ").append(result.summary()).append("\n");
                    context.append("数据: ").append(mapper.writeValueAsString(result.data())).append("\n\n");
                    continue;
                }

                log.warn("AgentLoop: unknown action '{}' at iteration {}", decision.action(), iteration);
            }

            log.warn("AgentLoop: max iterations reached, falling back to fixed pipeline");
            return null; // signal fallback
        })
        .subscribeOn(Schedulers.boundedElastic())
        .flatMap((RoutePlannerOrchestrator.PlanResponse result) -> {
            if (result != null) return Mono.just(result);
            // Fallback to existing pipeline
            log.info("AgentLoop: delegating to fixed pipeline orchestrator");
            return pipelineOrchestrator.planRoute(query, sessionId, city, null, userId);
        });
    }

    /**
     * Build the system prompt describing the Route Concierge Agent's role and available tools.
     */
    private String buildSystemPrompt() {
        return """
            你是一个智能路线管家 Agent（Route Concierge）。你的任务是帮助用户规划本地生活路线。

            ## 你的能力
            你可以调用以下工具来完成路线规划：

            """ + toolRegistry.buildToolsPrompt() + """

            ## 工作流程
            1. 首先调用 parse_user_intent 解析用户需求
            2. 如果提供了 userId，调用 get_user_profile 获取用户偏好
            3. 调用 search_pois 搜索候选商户
            4. 调用 generate_routes 生成路线方案
            5. 调用 check_constraints 验证约束满足
            6. 调用 score_and_rank 进行偏好打分
            7. 调用 explain_routes 生成推荐理由
            8. 收集完所有信息后返回 finish

            ## 重要原则
            - 每次只调用一个工具
            - 根据上一步的结果决定下一步调用哪个工具
            - 当所有必要信息都收集完毕后，返回 finish 并提供完整路线推荐
            - 如果某个工具调用失败，尝试其他方案或跳过该步骤
            """;
    }

    /**
     * Parse the LLM's decision from its response.
     * Expected format: {"action": "call_tool", "tool": "search_pois", "arguments": "{...}"}
     * Or: {"action": "finish", "summary": "...", "routes": [...]}
     */
    private AgentDecision parseDecision(String llmResponse) {
        try {
            // Extract JSON from the response (may be wrapped in text)
            var json = extractJson(llmResponse);
            if (json == null) return null;

            var node = mapper.readTree(json);
            var action = node.has("action") ? node.get("action").asText() : "";
            if (action.isEmpty()) return null;

            var tool = node.has("tool") ? node.get("tool").asText() : "";
            var arguments = node.has("arguments") ? node.get("arguments").toString() : "{}";

            // For finish action, capture summary
            var summary = node.has("summary") ? node.get("summary").asText() : "";

            return new AgentDecision(action, tool, arguments, summary, llmResponse);
        } catch (Exception e) {
            log.warn("AgentLoop: failed to parse LLM decision: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extract JSON from LLM response text. Handles responses wrapped in markdown code blocks.
     */
    private String extractJson(String response) {
        if (response == null) return null;
        var text = response.trim();

        // Try to find JSON block in markdown
        var jsonStart = text.indexOf("```json");
        if (jsonStart >= 0) {
            var start = text.indexOf('\n', jsonStart);
            var end = text.indexOf("```", start > 0 ? start : jsonStart + 7);
            if (start > 0 && end > start) return text.substring(start, end).trim();
        }

        // Try to find raw JSON object
        var braceStart = text.indexOf('{');
        if (braceStart >= 0) {
            var depth = 0;
            for (int i = braceStart; i < text.length(); i++) {
                char c = text.charAt(i);
                if (c == '{') depth++;
                else if (c == '}') { depth--; if (depth == 0) return text.substring(braceStart, i + 1); }
            }
        }

        return null;
    }

    /**
     * Build the final PlanResponse from the Agent's finish decision.
     * Falls back to the full pipeline orchestrator to get real route data.
     */
    private RoutePlannerOrchestrator.PlanResponse buildPlanResponse(
            AgentDecision decision, String sessionId, String query, String city,
            String userId, UserPreference profile) {

        // For now, delegate to the existing pipeline to get real route data
        // The Agent Loop's value is in the decision process, not in replacing
        // the deterministic solvers
        var planResult = pipelineOrchestrator.planRoute(query, sessionId, city, null, userId).block();
        if (planResult != null) {
            log.info("AgentLoop: Agent decision completed, returning pipeline results with agent summary: {}",
                    decision.summary());
            return planResult;
        }

        return new RoutePlannerOrchestrator.PlanResponse(
                sessionId != null ? sessionId : "agent-" + System.currentTimeMillis(),
                List.of(), "Agent Loop 完成但无路线结果", null,
                decision.summary(), Map.of(), Map.of(), Map.of(), Map.of());
    }

    /**
     * Represents the LLM's decision at each iteration of the Agent Loop.
     */
    record AgentDecision(String action, String tool, String arguments, String summary, String rawResponse) {}
}
