package com.mediqueue.security;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;

import com.mediqueue.api.ApiException;

public final class CurrentUser {
    private CurrentUser() {}

    public static String id(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return jwt.getSubject();
    }

    public static String role(Jwt jwt) {
        Object direct = jwt.getClaims().get("role");
        if (direct instanceof String role && !role.isBlank()) return role;
        for (String claim : new String[] {"public_metadata", "publicMetadata", "metadata"}) {
            Object metadata = jwt.getClaims().get(claim);
            if (metadata instanceof Map<?, ?> map && map.get("role") instanceof String role && !role.isBlank()) return role;
            if (metadata instanceof Map<?, ?> map && map.get("public_metadata") instanceof Map<?, ?> nested
                    && nested.get("role") instanceof String role && !role.isBlank()) return role;
        }
        return "patient";
    }

    public static void requireRole(Jwt jwt, String expected) {
        if (!expected.equals(role(jwt))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This operation requires the " + expected + " role");
        }
    }

    public static void requireSelfOrRole(Jwt jwt, String userId, String... roles) {
        if (id(jwt).equals(userId)) return;
        String actual = role(jwt);
        for (String role : roles) {
            if (role.equals(actual)) return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "You cannot access another user's data");
    }
}
