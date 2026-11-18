package com.mediqueue.user;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping
public class UserController {
    private final JdbcClient jdbc;

    public UserController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/ensure-user")
    Map<String, Object> ensureUser(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        String authenticatedId = CurrentUser.id(jwt);
        String requestedId = string(body.get("userId"));
        if (requestedId != null && !authenticatedId.equals(requestedId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "userId must match the authenticated user");
        }
        String name = required(body, "name");
        String email = required(body, "email");
        String patientId = "PAT" + Math.abs(authenticatedId.hashCode());
        Map<String, Object> user = jdbc.sql("""
            INSERT INTO users (id,name,email,mobile,patient_id)
            VALUES (:id,:name,:email,:mobile,:patientId)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,mobile=COALESCE(EXCLUDED.mobile,users.mobile)
            RETURNING *
            """).param("id", authenticatedId).param("name", name).param("email", email)
            .param("mobile", string(body.get("mobile"))).param("patientId", patientId).query().singleRow();
        return Map.of("success", true, "message", "User ensured successfully", "data", user);
    }

    @GetMapping("/users/me")
    Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> user = jdbc.sql("SELECT * FROM users WHERE id=:id").param("id", CurrentUser.id(jwt))
            .query().listOfRows().stream().findFirst().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User profile not found"));
        return Map.of("success", true, "data", user);
    }

    @GetMapping("/users/me/dashboard")
    Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        String id = CurrentUser.id(jwt);
        var queue = jdbc.sql("""
            SELECT q.*,h.name AS hospital_name,d.name AS department_name,doc.name AS doctor_name
            FROM queue q LEFT JOIN hospitals h ON h.id=q.hospital_id LEFT JOIN departments d ON d.id=q.department_id
              LEFT JOIN doctors doc ON doc.id=q.doctor_id WHERE q.patient_id=:patient ORDER BY q.created_at DESC
            """).param("patient", id).query().listOfRows();
        var appointments = jdbc.sql("""
            SELECT a.*,COALESCE(a.hospital_name,h.name) AS resolved_hospital_name,
              COALESCE(a.department_name,d.name) AS resolved_department_name,COALESCE(a.doctor_name,doc.name) AS resolved_doctor_name
            FROM appointments a LEFT JOIN hospitals h ON h.id=a.hospital_id LEFT JOIN departments d ON d.id=a.department_id
              LEFT JOIN doctors doc ON doc.id=a.doctor_id WHERE a.patient_id=:patient ORDER BY a.created_at DESC
            """).param("patient", id).query().listOfRows();
        return Map.of("success", true, "data", Map.of("queue", queue, "appointments", appointments));
    }

    @PatchMapping("/users/me")
    Map<String, Object> updateMe(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        String id = CurrentUser.id(jwt);
        Map<String, Object> current = jdbc.sql("SELECT * FROM users WHERE id=:id").param("id", id).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User profile not found"));
        Map<String, Object> user = jdbc.sql("UPDATE users SET name=:name,email=:email,mobile=:mobile WHERE id=:id RETURNING *")
            .param("id", id)
            .param("name", body.getOrDefault("name", current.get("name")))
            .param("email", body.getOrDefault("email", current.get("email")))
            .param("mobile", body.containsKey("mobile") ? body.get("mobile") : current.get("mobile"))
            .query().singleRow();
        return Map.of("success", true, "data", user);
    }

    @GetMapping("/notifications")
    Map<String, Object> notifications(@AuthenticationPrincipal Jwt jwt,
                                      @RequestParam(defaultValue = "false") boolean unreadOnly) {
        String sql = "SELECT * FROM notifications WHERE user_id=:id" + (unreadOnly ? " AND read=false" : "") + " ORDER BY created_at DESC";
        var rows = jdbc.sql(sql).param("id", CurrentUser.id(jwt)).query().listOfRows();
        return Map.of("success", true, "data", rows, "count", rows.size());
    }

    private static String required(Map<String, Object> body, String key) {
        String value = string(body.get(key));
        if (value == null || value.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value;
    }

    private static String string(Object value) {
        return value == null ? null : value.toString();
    }
}
