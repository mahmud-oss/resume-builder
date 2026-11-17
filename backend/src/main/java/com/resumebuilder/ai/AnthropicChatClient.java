package com.resumebuilder.ai;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.JsonOutputFormat;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;

import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Topics;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Talks to Claude through the official Anthropic Java SDK. The API key never leaves this server. */
public class AnthropicChatClient implements ChatModelClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicChatClient.class);

    private final JsonMapper json;
    private final AnthropicClient client;
    private final String model;
    private final OutputConfig.Effort effort;
    private final long maxOutputTokens;

    public AnthropicChatClient(JsonMapper json, String apiKey, String model, String effort, long maxOutputTokens,
                               long timeoutSeconds) {
        this.json = json;
        this.model = model;
        this.effort = parseEffort(effort);
        this.maxOutputTokens = maxOutputTokens;
        this.client = AnthropicOkHttpClient.builder()
                .apiKey(apiKey)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .maxRetries(2)
                .build();
    }

    private static OutputConfig.Effort parseEffort(String value) {
        return switch (value == null ? "" : value.trim().toLowerCase()) {
            case "medium" -> OutputConfig.Effort.MEDIUM;
            case "high" -> OutputConfig.Effort.HIGH;
            default -> OutputConfig.Effort.LOW;
        };
    }

    /** The request exactly as it will be sent. Separate from `complete` so it can be checked without calling the API. */
    MessageCreateParams buildParams(List<ChatDtos.Message> history, JsonNode cv, Topics topics, List<ChatDtos.PendingDraft> pending, String correction) {
        MessageCreateParams.Builder request = MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxOutputTokens)
                .system(ChatPrompts.SYSTEM)
                .outputConfig(OutputConfig.builder()
                        .effort(effort)
                        .format(JsonOutputFormat.builder()
                                .schema(JsonOutputFormat.Schema.builder().additionalProperties(ChatPrompts.schema()).build())
                                .build())
                        .build());

        // Earlier turns are plain text. The CV state, topics and any note go with the latest user message only,
        // so the earlier part of the conversation stays the same from turn to turn.
        for (int i = 0; i < history.size(); i++) {
            ChatDtos.Message m = history.get(i);
            boolean last = i == history.size() - 1;
            if ("assistant".equals(m.role())) {
                request.addAssistantMessage(m.content());
            } else if (last) {
                request.addUserMessage(ChatPrompts.userTurn(json, cv, topics, pending, m.content(), correction));
            } else {
                request.addUserMessage(m.content());
            }
        }
        return request.build();
    }

    @Override
    public Result complete(List<ChatDtos.Message> history, JsonNode cv, Topics topics, List<ChatDtos.PendingDraft> pending, String correction) {
        MessageCreateParams params = buildParams(history, cv, topics, pending, correction);

        Message response;
        try {
            response = client.messages().create(params);
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error {}: {}", e.statusCode(), e.getMessage());
            throw new ModelException(mapStatus(e.statusCode()), friendly(e.statusCode()), e);
        } catch (AnthropicException e) {
            log.warn("Anthropic client error: {}", e.getMessage());
            throw new ModelException(502, "Could not reach the AI service. Please try again.", e);
        }

        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new ModelException(422, "The assistant could not help with that message. Please rephrase it.", null);
        }
        String text = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(t -> t.text())
                .collect(Collectors.joining());
        ModelTurn turn;
        try {
            turn = json.readValue(text, ModelTurn.class);
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "The assistant's reply was not usable. Please try again.", e);
        }
        var usage = response.usage();
        return new Result(turn, new Usage(
                (int) usage.inputTokens(),
                (int) usage.outputTokens(),
                usage.cacheReadInputTokens().orElse(0L).intValue()));
    }

    private static int mapStatus(long status) {
        if (status == 429) return 429;
        if (status == 401 || status == 403 || status == 404) return 503; // our key or model setting, not the user's fault
        if (status == 400 || status == 413) return 502;
        return 502;
    }

    private static String friendly(long status) {
        if (status == 429) return "The AI service is busy right now. Please try again in a moment.";
        if (status == 401 || status == 403) return "The AI service is not set up correctly. Please tell the site owner.";
        if (status == 404) return "The AI model is not available. Please tell the site owner.";
        return "The AI service had a problem. Please try again.";
    }

    @Override
    public boolean demo() {
        return false;
    }

    @Override
    public String modelName() {
        return model;
    }

    // Kept for a unit test that checks the schema is well formed.
    static Map<String, com.anthropic.core.JsonValue> schemaForTest() {
        return ChatPrompts.schema();
    }
}
