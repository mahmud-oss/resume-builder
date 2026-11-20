package com.resumebuilder.ai;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.resumebuilder.ai.ChatDtos.ChatRequest;
import com.resumebuilder.ai.ChatDtos.ChatResponse;
import com.resumebuilder.ai.ChatDtos.Status;
import com.resumebuilder.ai.UploadDtos.UploadResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ChatService chat;
    private final UploadService uploads;

    public AiController(ChatService chat, UploadService uploads) {
        this.chat = chat;
        this.uploads = uploads;
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

    /** Turns an uploaded CV (PDF or DOCX) into the fields of a resume. The file is read in memory and never stored. */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    UploadResponse upload(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) throws java.io.IOException {
        return uploads.convert(UUID.fromString(jwt.getSubject()), file.getOriginalFilename(), file.getBytes());
    }
}
