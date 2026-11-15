package com.resumebuilder.auth;

import java.util.UUID;

public record User(UUID id, String email, String passwordHash, String name) {
}
