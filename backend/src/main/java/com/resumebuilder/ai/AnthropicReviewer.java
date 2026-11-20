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
import com.resumebuilder.ai.ReviewDtos.ModelReview;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reviews a CV's wording with Claude. */
public class AnthropicReviewer implements WritingReviewer {

    private static final Logger log = LoggerFactory.getLogger(AnthropicReviewer.class);

    private final JsonMapper json;
    private final AnthropicClient client;
    private final String model;
    private final long maxOutputTokens;

    public AnthropicReviewer(JsonMapper json, String apiKey, String model, long maxOutputTokens, long timeoutSeconds) {
        this.json = json;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.client = AnthropicOkHttpClient.builder().apiKey(apiKey).timeout(Duration.ofSeconds(timeoutSeconds)).maxRetries(1).build();
    }

    /** The request exactly as it will be sent, separate so it can be checked without calling the API. */
    MessageCreateParams buildParams(JsonNode cv) {
        return MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxOutputTokens)
                .system(ReviewPrompts.SYSTEM)
                .outputConfig(OutputConfig.builder()
                        .effort(OutputConfig.Effort.LOW)
                        .format(JsonOutputFormat.builder()
                                .schema(JsonOutputFormat.Schema.builder().additionalProperties(ReviewPrompts.schema()).build())
                                .build())
                        .build())
                .addUserMessage("<cv>" + cv.toString() + "</cv>")
                .build();
    }

    @Override
    public Result review(JsonNode cv) {
        Message response;
        try {
            response = client.messages().create(buildParams(cv));
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error {} during writing review: {}", e.statusCode(), e.getMessage());
            long s = e.statusCode();
            throw new ModelException(s == 429 ? 429 : s == 401 || s == 403 || s == 404 ? 503 : 502, friendly(s), e);
        } catch (AnthropicException e) {
            log.warn("Anthropic client error during writing review: {}", e.getMessage());
            throw new ModelException(502, "Could not reach the AI service. Please try again.", e);
        }
        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new ModelException(422, "The review could not be made for this CV.", null);
        }
        String text = response.content().stream().flatMap(b -> b.text().stream()).map(t -> t.text()).collect(Collectors.joining());
        ModelReview review;
        try {
            review = json.readValue(text, ModelReview.class);
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the review schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "The review was not usable. Please try again.", e);
        }
        var usage = response.usage();
        return new Result(review, new Usage((int) usage.inputTokens(), (int) usage.outputTokens(),
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
