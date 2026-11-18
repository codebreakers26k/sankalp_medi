package com.mediqueue.doctor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping("/doctor")
public class DoctorController {
    private final JdbcClient jdbc;

    public DoctorController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/workspace")
    Map<String, Object> workspace(@AuthenticationPrincipal Jwt jwt) {
        Map<String, Object> doctor = currentDoctor(jwt);
        String id = doctor.get("id").toString();
        List<Map<String, Object>> queue = jdbc.sql("""
            SELECT * FROM queue WHERE doctor_id=CAST(:doctor AS uuid) AND status IN ('waiting','in-treatment')
            ORDER BY is_emergency DESC,position NULLS LAST,created_at
            """).param("doctor", id).query().listOfRows();
        List<Map<String, Object>> appointments = jdbc.sql("""
            SELECT * FROM appointments WHERE doctor_id=CAST(:doctor AS uuid) AND date::date=CURRENT_DATE
              AND status NOT IN ('cancelled','no_show') ORDER BY time_slot
            """).param("doctor", id).query().listOfRows();
        List<Map<String, Object>> allAppointments = jdbc.sql("""
            SELECT * FROM appointments WHERE doctor_id=CAST(:doctor AS uuid)
            ORDER BY date DESC,time_slot DESC LIMIT 500
            """).param("doctor", id).query().listOfRows();
        List<Map<String, Object>> history = jdbc.sql("""
            SELECT * FROM queue WHERE doctor_id=CAST(:doctor AS uuid) AND status='completed' ORDER BY updated_at DESC LIMIT 100
            """).param("doctor", id).query().listOfRows();
        int completedToday = jdbc.sql("SELECT COUNT(*) FROM queue WHERE doctor_id=CAST(:doctor AS uuid) AND status='completed' AND updated_at::date=CURRENT_DATE")
            .param("doctor", id).query(Integer.class).single();
        double avgTreatment = jdbc.sql("""
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (service_end_time-service_start_time))/60),0) FROM queue
            WHERE doctor_id=CAST(:doctor AS uuid) AND service_start_time IS NOT NULL AND service_end_time IS NOT NULL
            """).param("doctor", id).query(Double.class).optional().orElse(0d);
        return Map.of("success", true, "data", Map.of(
            "doctor", doctor, "queue", queue, "appointments", appointments,
            "allAppointments", allAppointments, "history", history,
            "metrics", Map.of("waiting", queue.stream().filter(q -> "waiting".equals(q.get("status"))).count(),
                "inTreatment", queue.stream().filter(q -> "in-treatment".equals(q.get("status"))).count(),
                "completedToday", completedToday, "averageTreatmentMinutes", Math.round(avgTreatment))));
    }

    @PatchMapping("/queue/{queueId}/status")
    Map<String, Object> queueStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String queueId,
                                    @RequestBody Map<String, Object> body) {
        Map<String, Object> doctor = currentDoctor(jwt);
        String status = required(body, "status");
        if (!List.of("waiting", "in-treatment", "completed", "cancelled", "skipped").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid queue status");
        }
        String end = status.equals("completed") ? ",service_end_time=NOW()"
            : status.equals("in-treatment") ? ",called_at=NOW(),service_start_time=NOW()" : "";
        Map<String, Object> queue = jdbc.sql("UPDATE queue SET status=:status" + end + " WHERE id=CAST(:id AS uuid) AND doctor_id=CAST(:doctor AS uuid) RETURNING *")
            .param("status", status).param("id", queueId).param("doctor", doctor.get("id").toString())
            .query().listOfRows().stream().findFirst().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Queue entry not found"));
        return Map.of("success", true, "data", queue);
    }

    @Transactional
    @PatchMapping("/queue/{queueId}/position")
    Map<String, Object> position(@AuthenticationPrincipal Jwt jwt, @PathVariable String queueId,
                                 @RequestBody Map<String, Object> body) {
        Map<String, Object> doctor = currentDoctor(jwt);
        Object positionValue = body.get("position");
        if (!(positionValue instanceof Number number)) throw new ApiException(HttpStatus.BAD_REQUEST, "position is required");
        int newPosition = number.intValue();
        Map<String, Object> current = jdbc.sql("SELECT * FROM queue WHERE id=CAST(:id AS uuid) AND doctor_id=CAST(:doctor AS uuid) FOR UPDATE")
            .param("id", queueId).param("doctor", doctor.get("id").toString()).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Queue entry not found"));
        jdbc.sql("UPDATE queue SET position=:old WHERE doctor_id=CAST(:doctor AS uuid) AND status='waiting' AND position=:new")
            .param("old", current.get("position")).param("doctor", doctor.get("id").toString()).param("new", newPosition).update();
        jdbc.sql("UPDATE queue SET position=:new WHERE id=CAST(:id AS uuid)").param("new", newPosition).param("id", queueId).update();
        return Map.of("success", true);
    }

    @PostMapping("/appointments/{appointmentId}/admit")
    @Transactional
    Map<String, Object> admit(@AuthenticationPrincipal Jwt jwt, @PathVariable String appointmentId) {
        Map<String, Object> doctor = currentDoctor(jwt);
        Map<String, Object> appointment = jdbc.sql("""
            SELECT * FROM appointments WHERE id=CAST(:id AS uuid) AND doctor_id=CAST(:doctor AS uuid)
            """).param("id", appointmentId).param("doctor", doctor.get("id").toString()).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        boolean alreadyWaiting = jdbc.sql("""
            SELECT EXISTS(SELECT 1 FROM queue WHERE patient_id=:patient AND status IN ('waiting','in-treatment'))
            """).param("patient", appointment.get("patient_id")).query(Boolean.class).single();
        if (alreadyWaiting) throw new ApiException(HttpStatus.CONFLICT, "Patient is already in an active queue");
        int position = jdbc.sql("SELECT COALESCE(MAX(position),0)+1 FROM queue WHERE doctor_id=CAST(:doctor AS uuid) AND status='waiting'")
            .param("doctor", doctor.get("id").toString()).query(Integer.class).single();
        Map<String, Object> queue = jdbc.sql("""
            INSERT INTO queue(token_number,patient_id,patient_name,hospital_id,department_id,doctor_id,date,time,treatment_type,
              qr_code,status,position,estimated_wait_time,priority,service_type,arrival_time)
            VALUES (:token,:patient,:name,CAST(:hospital AS uuid),CAST(:department AS uuid),CAST(:doctor AS uuid),NOW(),NOW(),
              'Scheduled Consultation','', 'waiting',:position,:wait,'regular','consultation',NOW()) RETURNING *
            """).param("token", 100000 + new java.security.SecureRandom().nextInt(900000))
            .param("patient", appointment.get("patient_id")).param("name", appointment.get("patient_name"))
            .param("hospital", appointment.get("hospital_id").toString()).param("department", appointment.get("department_id").toString())
            .param("doctor", doctor.get("id").toString()).param("position", position).param("wait", Math.max(0, (position - 1) * 15))
            .query().singleRow();
        jdbc.sql("UPDATE appointments SET status='confirmed' WHERE id=CAST(:id AS uuid)").param("id", appointmentId).update();
        return Map.of("success", true, "data", queue);
    }

    @PatchMapping("/appointments/{appointmentId}/status")
    Map<String, Object> appointmentStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable String appointmentId,
                                          @RequestBody Map<String, Object> body) {
        Map<String, Object> doctor = currentDoctor(jwt);
        String status = required(body, "status");
        if (!List.of("pending", "confirmed", "completed", "cancelled", "rescheduled", "no_show").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid appointment status");
        }
        Map<String, Object> appointment = jdbc.sql("""
            UPDATE appointments SET previous_status=status,status=:status
            WHERE id=CAST(:id AS uuid) AND doctor_id=CAST(:doctor AS uuid) RETURNING *
            """).param("status", status).param("id", appointmentId).param("doctor", doctor.get("id").toString())
            .query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        return Map.of("success", true, "data", appointment);
    }

    private Map<String, Object> currentDoctor(Jwt jwt) {
        CurrentUser.requireRole(jwt, "doctor");
        String userId = CurrentUser.id(jwt);
        return jdbc.sql("""
            SELECT d.* FROM doctors d JOIN users u ON lower(u.email)=lower(d.email) WHERE u.id=:user LIMIT 1
            """).param("user", userId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No doctor profile is linked to this account"));
    }

    private static String required(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value.toString();
    }
}
