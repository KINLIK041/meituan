package com.meituan.route.llm;

import com.meituan.route.config.ModelProviders;
import com.meituan.route.config.ModelProviders.Provider;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provides per-user ChatLanguageModel instances keyed by (providerId, apiKey).
 * Supports multiple LLM providers: DeepSeek, OpenAI, Moonshot, Zhipu, Qwen, Anthropic.
 * Falls back to system default when no user key is available.
 */
@Component
public class DynamicLLMProvider {

    private static final Logger log = LoggerFactory.getLogger(DynamicLLMProvider.class);

    private final ChatLanguageModel defaultModel;
    private final String defaultProviderId;
    private final Map<String, ChatLanguageModel> cache = new ConcurrentHashMap<>();

    public DynamicLLMProvider(ChatLanguageModel defaultModel) {
        this.defaultModel = defaultModel;
        this.defaultProviderId = "deepseek";
    }

    /**
     * Get model for a specific user. Uses their provider + API key.
     * Falls back to system default if no key configured.
     */
    public ChatLanguageModel getModel(String providerId, String userApiKey) {
        if (userApiKey == null || userApiKey.isBlank()) {
            return defaultModel;
        }
        final Provider p = ModelProviders.byId(providerId != null ? providerId : "deepseek");
        final Provider resolved = p != null ? p : ModelProviders.byId("deepseek");

        String cacheKey = resolved.id() + ":" + userApiKey;
        return cache.computeIfAbsent(cacheKey, k -> {
            log.info("Creating LLM model: provider={}, model={}", resolved.name(), resolved.defaultModel());
            return OpenAiChatModel.builder()
                    .apiKey(userApiKey)
                    .baseUrl(resolved.baseUrl())
                    .modelName(resolved.defaultModel())
                    .timeout(Duration.ofSeconds(30))
                    .maxRetries(1)
                    .logRequests(false)
                    .logResponses(false)
                    .build();
        });
    }

    public ChatLanguageModel getDefaultModel() {
        return defaultModel;
    }

    public String getDefaultProviderId() {
        return defaultProviderId;
    }
}

