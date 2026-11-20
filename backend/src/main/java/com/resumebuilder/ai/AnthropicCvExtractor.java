package com.resumebuilder.ai;

import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.DocumentBlockParam;
import com.anthropic.models.messages.JsonOutputFormat;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.UploadDtos.Extraction;

import tools.jackson.databind.json.JsonMapper;

/** Reads an uploaded CV with Claude. PDFs go to the model as documents, so scans and odd Bangla fonts still work. */
public class AnthropicCvExtractor implements CvExtractor {

    private static final Logger log = LoggerFactory.getLogger(AnthropicCvExtractor.class);

    private final JsonMapper json;
    private final AnthropicClient client;
    private final String model;
    private final long maxOutputTokens;

    public AnthropicCvExtractor(JsonMapper json, String apiKey, String model, long maxOutputTokens, long timeoutSeconds) {
        this.json = json;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.client = AnthropicOkHttpClient.builder()
                .apiKey(apiKey)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .maxRetries(1)
                .build();
    }

    /** The request exactly as it will be sent. Separate from `extract` so it can be checked without calling the API. */
    MessageCreateParams buildParams(Source source) {
        List<ContentBlockParam> content;
        if (source.pdf() != null) {
            content = List.of(
                    ContentBlockParam.ofDocument(DocumentBlockParam.builder()
                            .base64Source(Base64.getEncoder().encodeToString(source.pdf()))
                            .build()),
                    ContentBlockParam.ofText("Convert the attached CV."));
        } else {
            content = List.of(ContentBlockParam.ofText(
                    "Convert this CV.\n<cv_text>\n" + source.text() + "\n</cv_text>"));
        }
        return MessageCreateParams.builder()
                .model(model)
                .maxTokens(maxOutputTokens)
                .system(UploadPrompts.SYSTEM)
                .outputConfig(OutputConfig.builder()
                        .format(JsonOutputFormat.builder()
                                .schema(JsonOutputFormat.Schema.builder().additionalProperties(UploadPrompts.schema()).build())
                                .build())
                        .build())
                .addUserMessageOfContentBlockParams(content)
                .build();
    }

    @Override
    public Result extract(Source source) {
        Message response;
        try {
            response = client.messages().create(buildParams(source));
        } catch (AnthropicServiceException e) {
            log.warn("Anthropic API error {} during CV upload: {}", e.statusCode(), e.getMessage());
            throw new ModelException(e.statusCode() == 429 ? 429 : e.statusCode() == 401 || e.statusCode() == 403 || e.statusCode() == 404 ? 503 : 502,
                    friendly(e.statusCode()), e);
        } catch (AnthropicException e) {
            log.warn("Anthropic client error during CV upload: {}", e.getMessage());
            throw new ModelException(502, "Could not reach the AI service. Please try again.", e);
        }

        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new ModelException(422, "We could not read that file. Please try a different one.", null);
        }
        if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
            throw new ModelException(422, "That CV is too long to convert in one go. Please try a shorter file.", null);
        }
        String text = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(t -> t.text())
                .collect(Collectors.joining());
        Extraction cv;
        try {
            cv = json.readValue(text, Extraction.class);
        } catch (RuntimeException e) {
            log.warn("The model's reply was not valid JSON for the CV schema (stop reason {}).", response.stopReason());
            throw new ModelException(502, "We could not read that file. Please try again.", e);
        }
        var usage = response.usage();
        return new Result(cv, new Usage(
                (int) usage.inputTokens(),
                (int) usage.outputTokens(),
                usage.cacheReadInputTokens().orElse(0L).intValue()));
    }

    private static String friendly(long status) {
        if (status == 429) return "The AI service is busy right now. Please try again in a moment.";
        if (status == 401 || status == 403) return "The AI service is not set up correctly. Please tell the site owner.";
        if (status == 404) return "The AI model is not available. Please tell the site owner.";
        if (status == 400 || status == 413) return "We could not read that file. Please try a different one.";
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
