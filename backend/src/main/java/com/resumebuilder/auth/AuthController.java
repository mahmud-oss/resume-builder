package com.resumebuilder.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.resumebuilder.auth.AuthDtos.AuthResponse;
import com.resumebuilder.auth.AuthDtos.LoginRequest;
import com.resumebuilder.auth.AuthDtos.RegisterRequest;
import com.resumebuilder.auth.AuthDtos.UserView;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request);
    }

    @PostMapping("/auth/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @GetMapping("/me")
    UserView me(@AuthenticationPrincipal Jwt jwt) {
        return new UserView(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("email"), null);
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
