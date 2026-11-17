package com.resumebuilder.ai;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** A per-user limit on how fast AI turns may be asked for, in memory (it resets when the server restarts). */
final class AiRateLimiter {

    private final Map<UUID, Deque<Long>> recent = new ConcurrentHashMap<>();
    private final int perMinute;

    AiRateLimiter(int perMinute) {
        this.perMinute = perMinute;
    }

    /** True if the turn is allowed now (and counts it). */
    boolean tryAcquire(UUID user, long nowMillis) {
        Deque<Long> times = recent.computeIfAbsent(user, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && nowMillis - times.peekFirst() >= 60_000) times.pollFirst();
            if (times.size() >= perMinute) return false;
            times.addLast(nowMillis);
            return true;
        }
    }
}
