package com.resumebuilder.ai;

import java.time.Instant;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.resumebuilder.ai.ChatModelClient.Usage;

@Repository
class AiUsageRepository {

    private final JdbcClient jdbc;

    AiUsageRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    void record(UUID userId, String action, String model, boolean demo, Usage usage) {
        jdbc.sql("""
                INSERT INTO ai_usage (user_id, action, model, demo, input_tokens, output_tokens, cache_read_tokens)
                VALUES (:user, :action, :model, :demo, :in, :out, :cache)
                """)
                .param("user", userId)
                .param("action", action)
                .param("model", model)
                .param("demo", demo)
                .param("in", usage.inputTokens())
                .param("out", usage.outputTokens())
                .param("cache", usage.cacheReadTokens())
                .update();
    }

    long countSince(UUID userId, Instant since) {
        return jdbc.sql("SELECT count(*) FROM ai_usage WHERE user_id = :user AND created_at >= :since AND demo = FALSE")
                .param("user", userId)
                .param("since", java.sql.Timestamp.from(since))
                .query(Long.class)
                .single();
    }

    /** Calls of the given kinds (any model, real calls only) since the given time. */
    long countSince(UUID userId, Instant since, java.util.List<String> actions) {
        return jdbc.sql("SELECT count(*) FROM ai_usage WHERE user_id = :user AND created_at >= :since AND demo = FALSE AND action IN (:actions)")
                .param("user", userId)
                .param("since", java.sql.Timestamp.from(since))
                .param("actions", actions)
                .query(Long.class)
                .single();
    }
}
