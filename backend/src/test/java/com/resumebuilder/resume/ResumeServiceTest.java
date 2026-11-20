package com.resumebuilder.resume;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.resumebuilder.common.ApiException;
import com.resumebuilder.resume.ResumeDtos.CreateResumeRequest;

import tools.jackson.databind.json.JsonMapper;

class ResumeServiceTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final UUID USER = UUID.randomUUID();

    private final ResumeRepository repository = Mockito.mock(ResumeRepository.class);
    private final ResumeService service = new ResumeService(repository, JSON, 1_000_000);

    private static ResumeRepository.Row row(UUID id, UUID tailoredFrom) {
        return new ResumeRepository.Row(id, "T", "classic", "{}", "{}", tailoredFrom, Instant.now(), Instant.now());
    }

    private void insertReturnsWhatItIsGiven() {
        Mockito.when(repository.insert(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()))
                .thenAnswer(inv -> row(UUID.randomUUID(), inv.getArgument(5)));
    }

    private static CreateResumeRequest create(UUID tailoredFrom) {
        return new CreateResumeRequest("Tailored", "classic", null, null, tailoredFrom);
    }

    private static ApiException rejected(Runnable call) {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(call::run);
        assertThat(t).isInstanceOf(ApiException.class);
        return (ApiException) t;
    }

    @Test
    void anOrdinaryResumeHasNoOriginal() {
        insertReturnsWhatItIsGiven();
        assertThat(service.create(USER, create(null)).tailoredFrom()).isNull();
        Mockito.verify(repository, Mockito.never()).find(Mockito.any(), Mockito.any());
    }

    @Test
    void aTailoredVersionPointsAtItsOriginal() {
        UUID original = UUID.randomUUID();
        Mockito.when(repository.find(USER, original)).thenReturn(Optional.of(row(original, null)));
        insertReturnsWhatItIsGiven();
        assertThat(service.create(USER, create(original)).tailoredFrom()).isEqualTo(original);
    }

    @Test
    void anOriginalThatIsNotTheUsersOrDoesNotExistIsRefused() {
        UUID someoneElses = UUID.randomUUID();
        Mockito.when(repository.find(USER, someoneElses)).thenReturn(Optional.empty()); // every query is scoped to the user
        ApiException e = rejected(() -> service.create(USER, create(someoneElses)));
        assertThat(e.status().value()).isEqualTo(400);
        Mockito.verify(repository, Mockito.never()).insert(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    void aTailoredVersionCannotBeTailoredAgain() {
        UUID original = UUID.randomUUID();
        UUID version = UUID.randomUUID();
        Mockito.when(repository.find(USER, version)).thenReturn(Optional.of(row(version, original)));
        ApiException e = rejected(() -> service.create(USER, create(version)));
        assertThat(e.status().value()).isEqualTo(400);
        assertThat(e.getMessage()).contains("original");
        Mockito.verify(repository, Mockito.never()).insert(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    void listAndGetShowTheLink() {
        UUID original = UUID.randomUUID();
        UUID version = UUID.randomUUID();
        Mockito.when(repository.list(USER)).thenReturn(java.util.List.of(row(version, original), row(original, null)));
        Mockito.when(repository.find(USER, version)).thenReturn(Optional.of(row(version, original)));
        var list = service.list(USER);
        assertThat(list).extracting(s -> s.tailoredFrom()).containsExactly(original, null);
        assertThat(service.get(USER, version).tailoredFrom()).isEqualTo(original);
    }

    @Test
    void updatingDoesNotTouchTheLink() {
        // The update request has no tailoredFrom: a version stays a version and an original stays an original.
        assertThat(ResumeDtos.UpdateResumeRequest.class.getRecordComponents())
                .extracting(c -> c.getName()).doesNotContain("tailoredFrom");
    }
}
