package com.resumebuilder.resume;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Every query is scoped by user_id, so a user can never read or change another user's resume.
 * The JSON columns are handled as raw JSON text.
 */
@Repository
public class ResumeRepository {

    /** A stored resume, with data and design as raw JSON text. */
    public record Row(UUID id, String title, String templateId, String data, String design, UUID tailoredFrom,
                      java.time.Instant createdAt, java.time.Instant updatedAt) {
    }

    private static final String COLUMNS = "id, title, template_id, data::text AS data, design::text AS design, tailored_from, created_at, updated_at";

    private static final RowMapper<Row> ROW_MAPPER = (ResultSet rs, int i) -> mapRow(rs);

    private final JdbcClient jdbc;

    public ResumeRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Row> list(UUID userId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM resumes WHERE user_id = :userId ORDER BY updated_at DESC")
                .param("userId", userId)
                .query(ROW_MAPPER)
                .list();
    }

    public Optional<Row> find(UUID userId, UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM resumes WHERE id = :id AND user_id = :userId")
                .param("id", id)
                .param("userId", userId)
                .query(ROW_MAPPER)
                .optional();
    }

    public Row insert(UUID userId, String title, String templateId, String dataJson, String designJson, UUID tailoredFrom) {
        return jdbc.sql("""
                INSERT INTO resumes (user_id, title, template_id, data, design, tailored_from)
                VALUES (:userId, :title, :templateId, CAST(:data AS jsonb), CAST(:design AS jsonb), :tailoredFrom)
                RETURNING\s""" + COLUMNS)
                .param("userId", userId)
                .param("title", title)
                .param("templateId", templateId)
                .param("data", dataJson)
                .param("design", designJson)
                .param("tailoredFrom", tailoredFrom)
                .query(ROW_MAPPER)
                .single();
    }

    public Optional<Row> update(UUID userId, UUID id, String title, String templateId, String dataJson, String designJson) {
        return jdbc.sql("""
                UPDATE resumes
                   SET title = :title,
                       template_id = :templateId,
                       data = CAST(:data AS jsonb),
                       design = CAST(:design AS jsonb),
                       updated_at = now()
                 WHERE id = :id AND user_id = :userId
                RETURNING\s""" + COLUMNS)
                .param("id", id)
                .param("userId", userId)
                .param("title", title)
                .param("templateId", templateId)
                .param("data", dataJson)
                .param("design", designJson)
                .query(ROW_MAPPER)
                .optional();
    }

    public boolean delete(UUID userId, UUID id) {
        return jdbc.sql("DELETE FROM resumes WHERE id = :id AND user_id = :userId")
                .param("id", id)
                .param("userId", userId)
                .update() > 0;
    }

    private static Row mapRow(ResultSet rs) throws SQLException {
        return new Row(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("template_id"),
                rs.getString("data"),
                rs.getString("design"),
                rs.getObject("tailored_from", UUID.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                rs.getObject("updated_at", OffsetDateTime.class).toInstant());
    }
}
