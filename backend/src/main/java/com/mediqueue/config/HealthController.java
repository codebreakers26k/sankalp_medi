package com.mediqueue.config;

import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final JdbcClient jdbc;

    public HealthController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    Map<String, Object> health() {
        Integer value = jdbc.sql("SELECT 1").query(Integer.class).single();
        return Map.of("status", "UP", "service", "mediqueue-spring-backend",
            "database", value == 1 ? "UP" : "DOWN");
    }
}
