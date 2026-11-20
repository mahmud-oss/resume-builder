package com.resumebuilder.ai;

import java.time.Duration;
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

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.MatchDtos.ModelMatch;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Compares a CV with a job description using Claude. */
public class AnthropicMatchAnalyzer implements MatchAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(AnthropicMatchAnalyzer.class);

    private final JsonMapper json;
    private final AnthropicClient client;
    private final String model;
    private final long maxOutputTokens;

    public AnthropicMatchAnalyzer(JsonMapper json, String apiKey, String model, long maxOutputTokens, long timeoutSeconds) {
        this.json = json;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.client = AnthropicOkHttpClient.builder().apiKey(apiKey).timeout(Duration.ofSeconds(timeoutSeconds)).maxRetries(1).build();
    }

    /** The request exactly as it will be sent, separate so it can be checked without calling the API. */
    MessageCreateParams buildParams(JsonNode cv, String jobDescription, String language) {
        String user = "<cv>" + cv.toString() + "</cv>\n<job_description>" + jobDescription + "</job_description>\n<language>"
                + ("bn".equals(language) ? "bn" : "en") + "</language>";
        return MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxOutputTokens)
                .system(MatchPrompts.SYSTEM)
                .outputConfig(OutputConfig.builder()
                        .effort(OutputConfig.Effort.LOW)
                        .format(JsonOutputFormat.builder()
                                .schema(JsonOutputFormat.Schema.builder().additionalProperties(MatchPrompts.schema()).build())
                                .build())
                        .build())
                .addUserMessage(user)
                .build();
    }

    @Override
    public Result analyze(JsonNode cv, String jobDescription, String language) {
        Message response;
        try {
            response = client.messages().create(buildParams(cv, jobDescription, language));
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error {} during job match: {}", e.statusCode(), e.getMessage());
            long s = e.statusCode();
            throw new ModelException(s == 429 ? 429 : s == 401 || s == 403 || s == 404 ? 503 : 502, friendly(s), e);
        } catch (AnthropicException e) {
            log.warn("Anthropic client error during job match: {}", e.getMessage());
            throw new ModelException(502, "Could not reach the AI service. Please try again.", e);
        }
        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new ModelException(422, "The match could not be made for this CV and job description.", null);
        }
        if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
            throw new ModelException(422, "That job description is too long to analyse. Please shorten it.", null);
        }
        String text = response.content().stream().flatMap(b -> b.text().stream()).map(t -> t.text()).collect(Collectors.joining());
        ModelMatch match;
        try {
            match = json.readValue(text, ModelMatch.class);
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the match schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "The match was not usable. Please try again.", e);
        }
        var usage = response.usage();
        return new Result(match, new Usage((int) usage.inputTokens(), (int) usage.outputTokens(),
                usage.cacheReadInputTokens().orElse(0L).intValue()));
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
