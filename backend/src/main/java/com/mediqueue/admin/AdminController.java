package com.mediqueue.admin;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping("/admin")
public class AdminController {
    private final JdbcClient jdbc;
    private final RestClient clerk;
    private final String clerkSecret;

    public AdminController(JdbcClient jdbc, RestClient.Builder rest,
                           @Value("${app.clerk-secret-key:}") String clerkSecret) {
        this.jdbc = jdbc;
        this.clerk = rest.baseUrl("https://api.clerk.com/v1").build();
        this.clerkSecret = clerkSecret;
    }

    @GetMapping("/doctors")
    Map<String, Object> doctors(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser.requireRole(jwt, "admin");
        List<Map<String, Object>> data = jdbc.sql("""
            SELECT doc.*,h.name AS hospital_name,h.city AS hospital_city,d.name AS department_name
            FROM doctors doc LEFT JOIN hospitals h ON h.id=doc.hospital_id LEFT JOIN departments d ON d.id=doc.department_id
            ORDER BY doc.created_at DESC
            """).query().listOfRows();
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @GetMapping("/overview")
    Map<String, Object> overview(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser.requireRole(jwt, "admin");
        List<Map<String, Object>> hospitals = jdbc.sql("SELECT * FROM hospitals ORDER BY name").query().listOfRows();
        List<Map<String, Object>> counters = jdbc.sql("""
            SELECT c.*,d.name AS department_name,doc.name AS doctor_name,doc.specialization AS doctor_specialization
            FROM counters c LEFT JOIN departments d ON d.id=c.department_id LEFT JOIN doctors doc ON doc.id=c.doctor_id
            ORDER BY c.counter_number
            """).query().listOfRows();
        List<Map<String, Object>> queue = jdbc.sql("SELECT * FROM queue WHERE status='waiting' ORDER BY position").query().listOfRows();
        int doctors = jdbc.sql("SELECT COUNT(*) FROM doctors WHERE COALESCE(is_on_leave,false)=false").query(Integer.class).single();
        int departments = jdbc.sql("SELECT COUNT(*) FROM departments").query(Integer.class).single();
        int appointments = jdbc.sql("SELECT COUNT(*) FROM appointments WHERE date::date>=CURRENT_DATE AND status NOT IN ('cancelled','no_show')")
            .query(Integer.class).single();
        double averageWait = queue.stream().map(row -> row.get("estimated_wait_time")).filter(Number.class::isInstance)
            .map(Number.class::cast).mapToDouble(Number::doubleValue).average().orElse(0);
        List<Map<String, Object>> enriched = hospitals.stream().map(hospital -> {
            String id = hospital.get("id").toString();
            var copy = new java.util.LinkedHashMap<String, Object>(hospital);
            copy.put("counters", counters.stream().filter(counter -> id.equals(String.valueOf(counter.get("hospital_id")))).toList());
            copy.put("queueCount", queue.stream().filter(item -> id.equals(String.valueOf(item.get("hospital_id")))).count());
            copy.put("departmentList", jdbc.sql("SELECT * FROM departments WHERE hospital_id=CAST(:id AS uuid) ORDER BY name")
                .param("id", id).query().listOfRows());
            copy.put("doctorCount", jdbc.sql("SELECT COUNT(*) FROM doctors WHERE hospital_id=CAST(:id AS uuid)")
                .param("id", id).query(Integer.class).single());
            return (Map<String, Object>) copy;
        }).toList();
        return Map.of("success", true, "data", Map.of(
            "resources", Map.of("hospitals", hospitals.size(), "doctors", doctors, "counters", counters.size(), "departments", departments),
            "analytics", Map.of("avgWaitTime", Math.round(averageWait), "patientsServed", appointments, "peakTraffic", "2-4 PM", "appointmentRate", appointments),
            "hospitals", enriched,
            "queue", queue));
    }

    @PostMapping("/doctors")
    Map<String, Object> createDoctor(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        require(body, "name", "email", "phone", "hospital_id", "department_id", "specialization", "qualification");
        Map<String, Object> doctor = jdbc.sql("""
            INSERT INTO doctors(name,email,phone,hospital_id,department_id,specialization,qualification,experience,rating,
              average_treatment_time,is_on_leave,availability)
            VALUES (:name,:email,:phone,CAST(:hospital AS uuid),CAST(:department AS uuid),:specialization,:qualification,
              :experience,:rating,:treatment,false,'[]'::jsonb) RETURNING *
            """).param("name", body.get("name")).param("email", body.get("email")).param("phone", body.get("phone"))
            .param("hospital", body.get("hospital_id")).param("department", body.get("department_id"))
            .param("specialization", body.get("specialization")).param("qualification", body.get("qualification"))
            .param("experience", number(body.get("experience"), 0)).param("rating", number(body.get("rating"), 0))
            .param("treatment", number(body.get("average_treatment_time"), 15)).query().singleRow();
        assignClerkRole(body.get("email").toString(), "doctor");
        audit(jwt, "doctor.created", Map.of("doctorId", doctor.get("id"), "email", body.get("email")));
        return Map.of("success", true, "data", doctor);
    }

    @PatchMapping("/doctors/{id}")
    Map<String, Object> updateDoctor(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                                     @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        Map<String, Object> current = jdbc.sql("SELECT * FROM doctors WHERE id=CAST(:id AS uuid)").param("id", id).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));
        Map<String, Object> doctor = jdbc.sql("""
            UPDATE doctors SET name=:name,email=:email,phone=:phone,hospital_id=CAST(:hospital AS uuid),
              department_id=CAST(:department AS uuid),specialization=:specialization,qualification=:qualification,
              experience=:experience,average_treatment_time=:treatment,is_on_leave=:leave
            WHERE id=CAST(:id AS uuid) RETURNING *
            """).param("id", id).param("name", merged(body,current,"name")).param("email", merged(body,current,"email"))
            .param("phone", merged(body,current,"phone")).param("hospital", merged(body,current,"hospital_id"))
            .param("department", merged(body,current,"department_id")).param("specialization", merged(body,current,"specialization"))
            .param("qualification", merged(body,current,"qualification")).param("experience", merged(body,current,"experience"))
            .param("treatment", merged(body,current,"average_treatment_time")).param("leave", merged(body,current,"is_on_leave"))
            .query().singleRow();
        audit(jwt, "doctor.updated", Map.of("doctorId", id));
        return Map.of("success", true, "data", doctor);
    }

    @DeleteMapping("/doctors/{id}")
    Map<String, Object> deleteDoctor(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        CurrentUser.requireRole(jwt, "admin");
        int changed = jdbc.sql("DELETE FROM doctors WHERE id=CAST(:id AS uuid)").param("id", id).update();
        if (changed == 0) throw new ApiException(HttpStatus.NOT_FOUND, "Doctor not found");
        audit(jwt, "doctor.deleted", Map.of("doctorId", id));
        return Map.of("success", true);
    }

    @PostMapping("/set-role")
    Map<String, Object> setRole(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        String email = required(body, "email");
        String role = required(body, "role");
        if (!List.of("patient", "doctor", "admin", "staff").contains(role)) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid role");
        boolean assigned = assignClerkRole(email, role);
        audit(jwt, "role.assigned", Map.of("email", email, "role", role, "assigned", assigned));
        return Map.of("success", assigned, "message", assigned ? "Role assigned" : "No Clerk account exists for this email yet");
    }

    @SuppressWarnings("unchecked")
    private boolean assignClerkRole(String email, String role) {
        if (clerkSecret.isBlank()) return false;
        List<Map<String, Object>> users = clerk.get().uri(uri -> uri.path("/users").queryParam("email_address", email).build())
            .header("Authorization", "Bearer " + clerkSecret).retrieve().body(List.class);
        if (users == null || users.isEmpty()) return false;
        String id = users.get(0).get("id").toString();
        clerk.patch().uri("/users/{id}/metadata", id).header("Authorization", "Bearer " + clerkSecret)
            .body(Map.of("public_metadata", Map.of("role", role))).retrieve().toBodilessEntity();
        return true;
    }

    private void audit(Jwt jwt, String event, Map<String, Object> details) {
        jdbc.sql("INSERT INTO admin_events(actor_id,event_type,details) VALUES (:actor,:event,CAST(:details AS jsonb))")
            .param("actor", CurrentUser.id(jwt)).param("event", event).param("details", toJson(details)).update();
    }

    private static String toJson(Map<String, Object> map) {
        StringBuilder out = new StringBuilder("{");
        boolean first = true;
        for (var entry : map.entrySet()) {
            if (!first) out.append(',');
            out.append('"').append(entry.getKey().replace("\"", "\\\"")).append("\":\"")
                .append(String.valueOf(entry.getValue()).replace("\"", "\\\"")).append('"');
            first = false;
        }
        return out.append('}').toString();
    }

    private static String required(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value.toString();
    }

    private static void require(Map<String, Object> body, String... keys) {
        for (String key : keys) required(body, key);
    }

    private static Object merged(Map<String, Object> body, Map<String, Object> current, String key) {
        return body.containsKey(key) ? body.get(key) : current.get(key);
    }

    private static Number number(Object value, Number fallback) {
        if (value instanceof Number number) return number;
        try { return value == null ? fallback : Double.parseDouble(value.toString()); }
        catch (NumberFormatException ignored) { return fallback; }
    }
}
