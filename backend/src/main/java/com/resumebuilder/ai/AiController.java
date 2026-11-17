package com.resumebuilder.ai;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.resumebuilder.ai.ChatDtos.ChatRequest;
import com.resumebuilder.ai.ChatDtos.ChatResponse;
import com.resumebuilder.ai.ChatDtos.Status;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ChatService chat;

    public AiController(ChatService chat) {
        this.chat = chat;
    }

    /** Whether the assistant is available, and whether it is the built-in demo. */
    @GetMapping("/status")
    Status status() {
        return chat.status();
    }

    @PostMapping("/chat")
    ChatResponse chat(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChatRequest request) {
        return chat.chat(UUID.fromString(jwt.getSubject()), request);
    }
}
