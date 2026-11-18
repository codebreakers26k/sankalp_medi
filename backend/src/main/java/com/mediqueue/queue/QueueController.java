package com.mediqueue.queue;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping("/queue")
public class QueueController {
    private final QueueService queues;
    private final JdbcClient jdbc;

    public QueueController(QueueService queues, JdbcClient jdbc) {
        this.queues = queues;
        this.jdbc = jdbc;
    }

    @PostMapping("/join")
    Map<String, Object> join(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        Map<String, Object> row = queues.join(CurrentUser.id(jwt), request);
        return Map.of("success", true, "data", row);
    }

    @GetMapping("/status")
    Map<String, Object> status(@RequestParam(defaultValue = "default") String locationId,
                               @RequestParam(required = false) String hospitalId,
                               @RequestParam(required = false) String departmentId) {
        return Map.of("success", true, "data", queues.status(locationId, hospitalId, departmentId));
    }

    @GetMapping("/live")
    Map<String, Object> live() {
        var rows = jdbc.sql("""
            SELECT q.id,q.token_number,
              CASE WHEN length(q.patient_name)>0 THEN left(q.patient_name,1)||'***' ELSE 'Patient' END AS patient_name,
              h.name AS hospital_name,d.name AS department_name,doc.name AS doctor_name,
              q.estimated_wait_time,q.position,q.status,q.is_emergency,q.called_at
            FROM queue q LEFT JOIN hospitals h ON h.id=q.hospital_id
              LEFT JOIN departments d ON d.id=q.department_id LEFT JOIN doctors doc ON doc.id=q.doctor_id
            WHERE q.status IN ('waiting','in-treatment')
            ORDER BY q.is_emergency DESC,q.position NULLS LAST,q.created_at
            """).query().listOfRows();
        return Map.of("success", true, "data", rows, "count", rows.size());
    }

    @PatchMapping("/mine/{queueId}/cancel")
    Map<String, Object> cancelMine(@AuthenticationPrincipal Jwt jwt, @PathVariable String queueId) {
        int changed = jdbc.sql("""
            UPDATE queue SET status='cancelled' WHERE id=CAST(:id AS uuid) AND patient_id=:patient
              AND status IN ('waiting','in-treatment')
            """).param("id", queueId).param("patient", CurrentUser.id(jwt)).update();
        if (changed == 0) throw new ApiException(HttpStatus.NOT_FOUND, "Active queue entry not found");
        return Map.of("success", true);
    }

    @PostMapping("/call-next")
    Map<String, Object> callNext(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        requireStaff(jwt);
        return Map.of("success", true, "data", queues.callNext(required(request, "counterId")));
    }

    @PostMapping("/skip")
    Map<String, Object> skip(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        requireStaff(jwt);
        return Map.of("success", true, "data", queues.skip(required(request, "counterId")));
    }

    @PostMapping("/transfer")
    Map<String, Object> transfer(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        requireStaff(jwt);
        return Map.of("success", true, "data", queues.transfer(required(request, "fromCounterId"), required(request, "toCounterId")));
    }

    @PatchMapping("/counter-status")
    Map<String, Object> counterStatus(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        requireStaff(jwt);
        return Map.of("success", true, "data", queues.updateCounter(required(request, "counterId"), required(request, "status")));
    }

    private static void requireStaff(Jwt jwt) {
        String role = CurrentUser.role(jwt);
        if (!role.equals("admin") && !role.equals("doctor") && !role.equals("staff")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Staff access is required");
        }
    }

    private static String required(Map<String, Object> request, String key) {
        Object value = request.get(key);
        if (value == null || value.toString().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value.toString();
    }
}
