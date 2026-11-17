package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;

class AiRateLimiterTest {

    @Test
    void allowsUpToTheLimitInAMinuteThenRefuses() {
        AiRateLimiter limiter = new AiRateLimiter(3);
        UUID user = UUID.randomUUID();
        assertThat(limiter.tryAcquire(user, 0)).isTrue();
        assertThat(limiter.tryAcquire(user, 1_000)).isTrue();
        assertThat(limiter.tryAcquire(user, 2_000)).isTrue();
        assertThat(limiter.tryAcquire(user, 3_000)).isFalse();
    }

    @Test
    void frees_upAsTheWindowMovesOn() {
        AiRateLimiter limiter = new AiRateLimiter(1);
        UUID user = UUID.randomUUID();
        assertThat(limiter.tryAcquire(user, 0)).isTrue();
        assertThat(limiter.tryAcquire(user, 59_999)).isFalse();
        assertThat(limiter.tryAcquire(user, 60_000)).isTrue();
    }

    @Test
    void countsEachUserSeparately() {
        AiRateLimiter limiter = new AiRateLimiter(1);
        assertThat(limiter.tryAcquire(UUID.randomUUID(), 0)).isTrue();
        assertThat(limiter.tryAcquire(UUID.randomUUID(), 0)).isTrue();
    }
}
