package com.resumebuilder.auth;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 128, message = "must be between 8 and 128 characters") String password,
            @Size(max = 100) String name) {
    }

    public record LoginRequest(
            @NotBlank String email,
            @NotBlank String password) {
    }

    public record UserView(UUID id, String email, String name) {
    }

    public record AuthResponse(String token, UserView user) {
    }
}
