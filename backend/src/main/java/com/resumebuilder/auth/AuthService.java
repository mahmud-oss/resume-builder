package com.resumebuilder.auth;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.resumebuilder.auth.AuthDtos.AuthResponse;
import com.resumebuilder.auth.AuthDtos.LoginRequest;
import com.resumebuilder.auth.AuthDtos.RegisterRequest;
import com.resumebuilder.auth.AuthDtos.UserView;
import com.resumebuilder.common.ApiException;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    /** Compared against when the email is unknown, so response time does not reveal which emails exist. */
    private final String decoyHash;

    /** When false, nobody can create an account; existing users can still log in. */
    private final boolean allowRegistration;

    public AuthService(UserRepository users, PasswordEncoder encoder, TokenService tokens,
            @Value("${app.auth.allow-registration:false}") boolean allowRegistration) {
        this.users = users;
        this.allowRegistration = allowRegistration;
        this.encoder = encoder;
        this.tokens = tokens;
        this.decoyHash = encoder.encode("decoy-password-for-timing");
    }

    /** Whether new accounts can be created now. The sign-up buttons on the website follow this. */
    public boolean registrationOpen() {
        return allowRegistration;
    }

    public AuthResponse register(RegisterRequest request) {
        if (!allowRegistration) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Registration is closed");
        }
        String email = normalise(request.email());
        String name = request.name() == null ? "" : request.name().trim();
        try {
            User user = users.insert(email, encoder.encode(request.password()), name);
            return respond(user);
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }

    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(normalise(request.email())).orElse(null);
        String hash = user == null ? decoyHash : user.passwordHash();
        boolean matches = encoder.matches(request.password(), hash);
        if (user == null || !matches) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return respond(user);
    }

    private AuthResponse respond(User user) {
        return new AuthResponse(tokens.issue(user), new UserView(user.id(), user.email(), user.name()));
    }

    private static String normalise(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
