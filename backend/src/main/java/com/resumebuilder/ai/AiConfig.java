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

    /** Reads uploaded CVs: the real model when an API key is set, otherwise a fixed sample (demo mode). */
    @Bean
    CvExtractor cvExtractor(
            JsonMapper json,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.upload-model:claude-sonnet-5-5}") String model,
            @Value("${app.ai.upload-max-output-tokens:8000}") long maxOutputTokens,
            @Value("${app.ai.upload-timeout-seconds:120}") long timeoutSeconds) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set: CV upload runs in DEMO mode (returns a sample CV).");
            return new DemoCvExtractor();
        }
        log.info("CV upload uses Anthropic model {}.", model);
        return new AnthropicCvExtractor(json, apiKey.trim(), model, maxOutputTokens, timeoutSeconds);
    }

    /** Reviews a CV's wording: the real model when an API key is set, otherwise a sample (demo mode). */
    @Bean
    WritingReviewer writingReviewer(
            JsonMapper json,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.review-model:claude-haiku-5-5}") String model,
            @Value("${app.ai.review-max-output-tokens:3000}") long maxOutputTokens,
            @Value("${app.ai.review-timeout-seconds:60}") long timeoutSeconds) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set: the writing review runs in DEMO mode (one sample item).");
            return new DemoReviewer();
        }
        log.info("Writing review uses Anthropic model {}.", model);
        return new AnthropicReviewer(json, apiKey.trim(), model, maxOutputTokens, timeoutSeconds);
    }

    /** Compares a CV with a job description: the real model when an API key is set, otherwise a sample (demo mode). */
    @Bean
    MatchAnalyzer matchAnalyzer(
            JsonMapper json,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.match-model:claude-sonnet-5-5}") String model,
            @Value("${app.ai.match-max-output-tokens:4000}") long maxOutputTokens,
            @Value("${app.ai.match-timeout-seconds:90}") long timeoutSeconds) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set: job match runs in DEMO mode (a rough sample).");
            return new DemoMatchAnalyzer();
        }
        log.info("Job match uses Anthropic model {}.", model);
        return new AnthropicMatchAnalyzer(json, apiKey.trim(), model, maxOutputTokens, timeoutSeconds);
    }

    /** Proposes tailoring changes: the real model when an API key is set, otherwise a harmless sample (demo mode). */
    @Bean
    Tailorer tailorer(
            JsonMapper json,
            @Value("${app.ai.api-key:}") String apiKey,
            @Value("${app.ai.tailor-model:claude-sonnet-5-5}") String model,
            @Value("${app.ai.tailor-max-output-tokens:6000}") long maxOutputTokens,
            @Value("${app.ai.tailor-timeout-seconds:120}") long timeoutSeconds) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("ANTHROPIC_API_KEY is not set: tailoring runs in DEMO mode (only reorders skills).");
            return new DemoTailorer();
        }
        log.info("Tailoring uses Anthropic model {}.", model);
        return new AnthropicTailorer(json, apiKey.trim(), model, maxOutputTokens, timeoutSeconds);
    }
}
