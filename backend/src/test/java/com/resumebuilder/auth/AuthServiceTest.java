package com.resumebuilder.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.resumebuilder.auth.AuthDtos.RegisterRequest;
import com.resumebuilder.common.ApiException;

class AuthServiceTest {

    private final UserRepository users = Mockito.mock(UserRepository.class);
    private final PasswordEncoder encoder = Mockito.mock(PasswordEncoder.class);
    private final TokenService tokens = Mockito.mock(TokenService.class);

    private AuthService service(boolean open) {
        Mockito.when(encoder.encode(Mockito.any())).thenReturn("hash");
        return new AuthService(users, encoder, tokens, open);
    }

    @Test
    void reportsWhetherRegistrationIsOpen() {
        assertThat(service(true).registrationOpen()).isTrue();
        assertThat(service(false).registrationOpen()).isFalse();
    }

    @Test
    void whenClosedRegistrationIsRefusedAndNothingIsCreated() {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(
                () -> service(false).register(new RegisterRequest("a@example.com", "Passw0rd!x1", "A")));
        assertThat(t).isInstanceOf(ApiException.class);
        assertThat(((ApiException) t).status().value()).isEqualTo(403);
        Mockito.verifyNoInteractions(users);
    }

    @Test
    void whenOpenRegistrationCreatesTheUser() {
        Mockito.when(users.insert(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenReturn(new User(UUID.randomUUID(), "a@example.com", "hash", "A"));
        Mockito.when(tokens.issue(Mockito.any())).thenReturn("token");
        var response = service(true).register(new RegisterRequest("A@Example.com ", "Passw0rd!x1", "A"));
        assertThat(response.token()).isEqualTo("token");
        Mockito.verify(users).insert(Mockito.eq("a@example.com"), Mockito.any(), Mockito.any()); // email normalised
    }
}
