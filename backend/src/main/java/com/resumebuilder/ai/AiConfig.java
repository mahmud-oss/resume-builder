package com.resumebuilder.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.json.JsonMapper;

@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    /** The real assistant when an API key is set; otherwise the built-in demo, so nothing is sent anywhere. */
    @Bean
    ChatModelClient chatModelClient(
            JsonMapper json,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.model:claude-opus-5-5}") String model,
            @Value("${app.ai.effort:low}") String effort,
            @Value("${app.ai.max-output-tokens:4096}") long maxOutputTokens,
            @Value("${app.ai.request-timeout-seconds:60}") long timeoutSeconds) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set: the AI chat runs in DEMO mode (scripted, no external calls).");
            return new DemoChatClient();
        }
        log.info("AI chat uses Anthropic model {} (effort {}).", model, effort);
        return new AnthropicChatClient(json, apiKey.trim(), model, effort, maxOutputTokens, timeoutSeconds);
    }
}
