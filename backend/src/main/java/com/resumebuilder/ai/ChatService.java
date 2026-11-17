package com.resumebuilder.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.ai.ChatDtos.ChatRequest;
import com.resumebuilder.ai.ChatDtos.ChatResponse;
import com.resumebuilder.ai.ChatDtos.Draft;
import com.resumebuilder.ai.ChatDtos.DraftText;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Status;
import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Result;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.common.ApiException;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    /** Largest CV state we accept, in characters. A normal CV is a few thousand. */
    private static final int MAX_CV_CHARS = 80_000;

    private final ChatModelClient model;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter;
    private final int maxPerDay;

    ChatService(ChatModelClient model, AiUsageRepository usage,
                @Value("${app.ai.max-turns-per-minute:12}") int perMinute,
                @Value("${app.ai.max-turns-per-day:400}") int perDay) {
        this.model = model;
        this.usage = usage;
        this.limiter = new AiRateLimiter(perMinute);
        this.maxPerDay = perDay;
    }

    public Status status() {
        return new Status(true, model.demo(), model.modelName());
    }

    public ChatResponse chat(UUID userId, ChatRequest request) {
        if (request.cv().toString().length() > MAX_CV_CHARS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "This CV is too large for the assistant.");
        }
        if (!"user".equals(request.messages().get(request.messages().size() - 1).role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The last message must be from the user.");
        }
        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!model.demo() && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1))) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for the assistant. Please try again tomorrow.");
        }

        String corpus = ChatGuard.corpus(request.messages(), request.cv());
        Usage total = Usage.NONE;
        String correction = null;
        ModelTurn turn = null;
        List<List<String>> warnings = List.of();

        // At most two attempts: the second only if a draft contains numbers the user never gave.
        for (int attempt = 0; attempt < 2; attempt++) {
            Result result;
            try {
                result = model.complete(request.messages(), request.cv(), request.topics(),
                        request.pendingDrafts() == null ? List.of() : request.pendingDrafts(), correction);
            } catch (ModelException e) {
                throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
            }
            total = new Usage(total.inputTokens() + result.usage().inputTokens(),
                    total.outputTokens() + result.usage().outputTokens(),
                    total.cacheReadTokens() + result.usage().cacheReadTokens());
            turn = ChatGuard.sanitise(result.turn());
            warnings = draftWarnings(turn, corpus);
            boolean problem = warnings.stream().anyMatch(w -> !w.isEmpty());
            if (!problem || model.demo() || attempt == 1) break;
            correction = "Your last draft contained numbers the user never gave: "
                    + String.join("; ", warnings.stream().flatMap(List::stream).toList())
                    + ". Write the draft again using only facts the user stated, with no new numbers.";
            log.info("Retrying: a draft contained numbers not stated by the user.");
        }

        usage.record(userId, "chat", model.modelName(), model.demo(), total);

        List<Draft> drafts = new ArrayList<>();
        for (int i = 0; i < turn.drafts().size(); i++) {
            DraftText d = turn.drafts().get(i);
            drafts.add(new Draft(d.id(), d.entry(), d.field(), d.text(), warnings.get(i)));
        }
        return new ChatResponse(turn.message(), turn.updates(), drafts, turn.currentTopic(), turn.completedTopics(),
                turn.skippedTopics(), turn.suggestedReplies(), model.demo());
    }

    /** For each draft, a note about every number in it that the user never mentioned. */
    static List<List<String>> draftWarnings(ModelTurn turn, String corpus) {
        List<List<String>> out = new ArrayList<>();
        for (DraftText d : turn.drafts()) {
            List<String> missing = ChatGuard.numbersNotIn(d.text(), corpus);
            out.add(missing.isEmpty() ? List.of() : List.of("Contains numbers you did not mention: " + String.join(", ", missing)));
        }
        return out;
    }
}
