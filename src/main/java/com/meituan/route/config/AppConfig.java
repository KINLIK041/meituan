package com.meituan.route.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Application-wide configuration.
 * Creates beans for LLM (DeepSeek), ObjectMapper, WebClient.
 */
@Configuration
public class AppConfig {

    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);

    @Value("${langchain4j.open-ai.chat-model.api-key:sk-f159def9d5344341bafaea5f56fde07a}")
    private String deepseekApiKey;

    @Value("${langchain4j.open-ai.chat-model.base-url:https://api.deepseek.com/v1}")
    private String deepseekBaseUrl;

    @Value("${langchain4j.open-ai.chat-model.model-name:deepseek-chat}")
    private String deepseekModel;

    @Value("${langchain4j.open-ai.chat-model.temperature:0.1}")
    private double temperature;

    @Value("${langchain4j.open-ai.chat-model.timeout:60000}")
    private int timeout;

    @Bean
    public ObjectMapper objectMapper() {
        var mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    /**
     * ChatLanguageModel bean backed by DeepSeek API (OpenAI-compatible).
     * LangChain4j's OpenAI integration works with any OpenAI-compatible endpoint.
     */
    @Bean
    public ChatLanguageModel chatLanguageModel() {
        log.info("Configuring ChatLanguageModel: provider=DeepSeek, model={}, baseUrl={}",
                deepseekModel, deepseekBaseUrl);

        return OpenAiChatModel.builder()
                .apiKey(deepseekApiKey)
                .baseUrl(deepseekBaseUrl)
                .modelName(deepseekModel)
                .temperature(temperature)
                .timeout(Duration.ofMillis(timeout))
                .maxRetries(2)
                .logRequests(false)
                .logResponses(false)
                .build();
    }
}
