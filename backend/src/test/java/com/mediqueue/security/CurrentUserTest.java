package com.mediqueue.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class CurrentUserTest {
    @Test
    void readsSubjectAndDirectRole() {
        Jwt jwt = jwt(Map.of("role", "admin"));
        assertEquals("user_123", CurrentUser.id(jwt));
        assertEquals("admin", CurrentUser.role(jwt));
    }

    @Test
    void readsClerkPublicMetadataRole() {
        Jwt jwt = jwt(Map.of("public_metadata", Map.of("role", "doctor")));
        assertEquals("doctor", CurrentUser.role(jwt));
    }

    @Test
    void defaultsToPatient() {
        assertEquals("patient", CurrentUser.role(jwt(Map.of())));
    }

    private Jwt jwt(Map<String, Object> claims) {
        var builder = Jwt.withTokenValue("test-token")
            .header("alg", "none")
            .subject("user_123")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300));
        claims.forEach(builder::claim);
        return builder.build();
    }
}
