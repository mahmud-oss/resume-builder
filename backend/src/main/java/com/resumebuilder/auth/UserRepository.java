package com.resumebuilder.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.sql("SELECT id, email, password_hash, name FROM users WHERE email = :email")
                .param("email", email)
                .query((rs, i) -> new User(
                        rs.getObject("id", UUID.class),
                        rs.getString("email"),
                        rs.getString("password_hash"),
                        rs.getString("name")))
                .optional();
    }

    /** Inserts a user. Throws DuplicateKeyException when the email is already registered. */
    public User insert(String email, String passwordHash, String name) {
        return jdbc.sql("""
                INSERT INTO users (email, password_hash, name)
                VALUES (:email, :hash, :name)
                RETURNING id, email, password_hash, name
                """)
                .param("email", email)
                .param("hash", passwordHash)
                .param("name", name)
                .query((rs, i) -> new User(
                        rs.getObject("id", UUID.class),
                        rs.getString("email"),
                        rs.getString("password_hash"),
                        rs.getString("name")))
                .single();
    }
}
