-- One row per AI call: who, what, which model, and how many tokens. Used for rate limits now and for
-- credits and cost tracking later. It never stores the conversation or any CV content.
CREATE TABLE ai_usage (
    id                BIGSERIAL PRIMARY KEY,
    user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    action            TEXT        NOT NULL,
    model             TEXT        NOT NULL,
    demo              BOOLEAN     NOT NULL DEFAULT FALSE,
    input_tokens      INTEGER     NOT NULL DEFAULT 0,
    output_tokens     INTEGER     NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_time ON ai_usage (user_id, created_at DESC);
