-- Users. Email is stored lower-cased and is unique.
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    name          TEXT        NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resumes. The content ("data") is kept independent of the template, so a user can
-- switch templates without losing anything. "design" holds the user's design settings
-- (font, size, accent colour, spacing, section order and visibility).
CREATE TABLE resumes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    template_id TEXT        NOT NULL,
    data        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    design      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resumes_user_updated ON resumes (user_id, updated_at DESC);
