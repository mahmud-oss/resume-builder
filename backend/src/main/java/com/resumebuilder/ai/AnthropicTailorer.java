package com.resumebuilder.ai;

import java.time.Duration;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.JsonOutputFormat;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.TailorDtos.ModelRegen;
import com.resumebuilder.ai.TailorDtos.ModelTailor;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Proposes tailoring changes using Claude. */
public class AnthropicTailorer implements Tailorer {

    private static final Logger log = LoggerFactory.getLogger(AnthropicTailorer.class);

    private final JsonMapper json;
    private final AnthropicClient client;
    private final String model;
    private final long maxOutputTokens;

    public AnthropicTailorer(JsonMapper json, String apiKey, String model, long maxOutputTokens, long timeoutSeconds) {
        this.json = json;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.client = AnthropicOkHttpClient.builder().apiKey(apiKey).timeout(Duration.ofSeconds(timeoutSeconds)).maxRetries(1).build();
    }

    private static String lang(String language) {
        return "bn".equals(language) ? "bn" : "en";
    }

    private MessageCreateParams params(String system, Map<String, JsonValue> schema, String user) {
        return MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxOutputTokens)
                .system(system)
                .outputConfig(OutputConfig.builder()
                        .effort(OutputConfig.Effort.LOW)
                        .format(JsonOutputFormat.builder()
                                .schema(JsonOutputFormat.Schema.builder().additionalProperties(schema).build())
                                .build())
                        .build())
                .addUserMessage(user)
                .build();
    }

    /** The requests exactly as they will be sent, separate so they can be checked without calling the API. */
    MessageCreateParams buildTailorParams(JsonNode cv, String jobDescription, String language) {
        return params(TailorPrompts.SYSTEM, TailorPrompts.schema(),
                "<cv>" + cv + "</cv>\n<job_description>" + jobDescription + "</job_description>\n<language>" + lang(language) + "</language>");
    }

    MessageCreateParams buildRegenParams(JsonNode cv, String jobDescription, String entry, String field, String previous, String hint, String language) {
        return params(TailorPrompts.REGEN_SYSTEM, TailorPrompts.regenSchema(),
                "<cv>" + cv + "</cv>\n<job_description>" + jobDescription + "</job_description>\n<change entry=\"" + entry.replace("\"", "") + "\" field=\""
                        + field.replace("\"", "") + "\"/>\n<previous>" + (previous == null ? "" : previous) + "</previous>\n<hint>"
                        + (hint == null ? "" : hint) + "</hint>\n<language>" + lang(language) + "</language>");
    }

    private Message call(MessageCreateParams request) {
        Message response;
        try {
            response = client.messages().create(request);
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error {} during tailoring: {}", e.statusCode(), e.getMessage());
            long s = e.statusCode();
            throw new ModelException(s == 429 ? 429 : s == 401 || s == 403 || s == 404 ? 503 : 502, friendly(s), e);
        } catch (AnthropicException e) {
            log.warn("Anthropic client error during tailoring: {}", e.getMessage());
            throw new ModelException(502, "Could not reach the AI service. Please try again.", e);
        }
        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new ModelException(422, "Changes could not be made for this resume and job description.", null);
        }
        if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
            throw new ModelException(422, "That job description or resume is too long to tailor in one go.", null);
        }
        return response;
    }

    private static String textOf(Message response) {
        return response.content().stream().flatMap(b -> b.text().stream()).map(t -> t.text()).collect(Collectors.joining());
    }

    private static Usage usageOf(Message response) {
        var u = response.usage();
        return new Usage((int) u.inputTokens(), (int) u.outputTokens(), u.cacheReadInputTokens().orElse(0L).intValue());
    }

    @Override
    public Result tailor(JsonNode cv, String jobDescription, String language) {
        Message response = call(buildTailorParams(cv, jobDescription, language));
        try {
            return new Result(json.readValue(textOf(response), ModelTailor.class), usageOf(response));
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the tailor schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "The changes were not usable. Please try again.", e);
        }
    }

    @Override
    public RegenResult regenerate(JsonNode cv, String jobDescription, String entry, String field, String previous, String hint, String language) {
        Message response = call(buildRegenParams(cv, jobDescription, entry, field, previous, hint, language));
        try {
            return new RegenResult(json.readValue(textOf(response), ModelRegen.class), usageOf(response));
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the regenerate schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "The new wording was not usable. Please try again.", e);
        }
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
}
