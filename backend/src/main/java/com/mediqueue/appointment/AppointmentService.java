package com.mediqueue.appointment;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mediqueue.api.ApiException;

@Service
public class AppointmentService {
    private final JdbcClient jdbc;

    public AppointmentService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public Map<String, Object> create(String userId, Map<String, Object> body) {
        String patientName = required(body, "patientName");
        String hospitalId = required(body, "hospitalId");
        String departmentId = required(body, "departmentId");
        String doctorId = required(body, "doctorId");
        String date = required(body, "date");
        String timeSlot = required(body, "timeSlot");
        boolean occupied = jdbc.sql("""
            SELECT EXISTS(SELECT 1 FROM appointments WHERE doctor_id=CAST(:doctor AS uuid) AND date::date=CAST(:date AS date)
              AND time_slot=:slot AND status NOT IN ('cancelled','no_show'))
            """).param("doctor", doctorId).param("date", date).param("slot", timeSlot).query(Boolean.class).single();
        if (occupied) throw new ApiException(HttpStatus.CONFLICT, "Selected time slot is not available");
        Map<String, Object> appointment = jdbc.sql("""
            INSERT INTO appointments (patient_id,patient_name,hospital_id,department_id,doctor_id,date,time_slot,status,otp_verified,
              hospital_name,department_name,doctor_name)
            SELECT :patient,:patientName,h.id,d.id,doc.id,CAST(:date AS date)::timestamptz,:slot,'confirmed',true,h.name,d.name,doc.name
            FROM hospitals h JOIN departments d ON d.id=CAST(:department AS uuid) AND d.hospital_id=h.id
              JOIN doctors doc ON doc.id=CAST(:doctor AS uuid) AND doc.department_id=d.id
            WHERE h.id=CAST(:hospital AS uuid) RETURNING *
            """).param("patient", userId).param("patientName", patientName).param("hospital", hospitalId)
            .param("department", departmentId).param("doctor", doctorId).param("date", date).param("slot", timeSlot)
            .query().listOfRows().stream().findFirst().orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Hospital, department, and doctor do not match"));
        notify(userId, "Appointment Confirmed", "Your appointment is confirmed for " + date + " at " + timeSlot, "appointment");
        return appointment;
    }

    public List<Map<String, Object>> forPatient(String userId) {
        return jdbc.sql("""
            SELECT a.*,COALESCE(a.hospital_name,h.name) AS hospital_name,COALESCE(a.department_name,d.name) AS department_name,
              COALESCE(a.doctor_name,doc.name) AS doctor_name
            FROM appointments a LEFT JOIN hospitals h ON h.id=a.hospital_id LEFT JOIN departments d ON d.id=a.department_id
              LEFT JOIN doctors doc ON doc.id=a.doctor_id WHERE a.patient_id=:patient ORDER BY a.created_at DESC
            """).param("patient", userId).query().listOfRows();
    }

    public List<Map<String, Object>> forDoctor(String doctorId, LocalDate date) {
        String sql = "SELECT * FROM appointments WHERE doctor_id=CAST(:doctor AS uuid)" +
            (date == null ? "" : " AND date::date=:date") + " ORDER BY date,time_slot";
        JdbcClient.StatementSpec statement = jdbc.sql(sql).param("doctor", doctorId);
        if (date != null) statement = statement.param("date", date);
        return statement.query().listOfRows();
    }

    public List<String> bookedSlots(String doctorId, LocalDate date) {
        return jdbc.sql("""
            SELECT time_slot FROM appointments WHERE doctor_id=CAST(:doctor AS uuid) AND date::date=:date
              AND status NOT IN ('cancelled','no_show') ORDER BY time_slot
            """).param("doctor", doctorId).param("date", date).query(String.class).list();
    }

    @Transactional
    public Map<String, Object> cancel(String userId, Map<String, Object> body) {
        String id = required(body, "appointmentId");
        Map<String, Object> current = owned(id, userId);
        if ("cancelled".equals(current.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "Appointment is already cancelled");
        Map<String, Object> cancelled = jdbc.sql("""
            UPDATE appointments SET previous_status=status,status='cancelled',cancelled_at=NOW(),cancellation_reason=:reason
            WHERE id=CAST(:id AS uuid) AND patient_id=:patient RETURNING *
            """).param("reason", body.getOrDefault("reason", "User requested cancellation")).param("id", id).param("patient", userId)
            .query().singleRow();
        offerFirstWaitlisted(current);
        notify(userId, "Appointment Cancelled", "Your appointment has been cancelled", "appointment");
        return cancelled;
    }

    @Transactional
    public Map<String, Object> reschedule(String userId, Map<String, Object> body) {
        String id = required(body, "appointmentId");
        String date = required(body, "newDate");
        String slot = required(body, "newTimeSlot");
        Map<String, Object> current = owned(id, userId);
        boolean occupied = jdbc.sql("""
            SELECT EXISTS(SELECT 1 FROM appointments WHERE doctor_id=CAST(:doctor AS uuid) AND date::date=CAST(:date AS date)
              AND time_slot=:slot AND id<>CAST(:id AS uuid) AND status NOT IN ('cancelled','no_show'))
            """).param("doctor", current.get("doctor_id").toString()).param("date", date).param("slot", slot).param("id", id)
            .query(Boolean.class).single();
        if (occupied) throw new ApiException(HttpStatus.CONFLICT, "Selected time slot is not available");
        String fromJson = "{\"date\":\"" + current.get("date") + "\",\"timeSlot\":\"" + current.get("time_slot") + "\"}";
        Map<String, Object> updated = jdbc.sql("""
            UPDATE appointments SET previous_status=status,status='confirmed',date=CAST(:date AS date)::timestamptz,time_slot=:slot,
              rescheduled_at=NOW(),rescheduled_from=CAST(:fromJson AS jsonb),reschedule_reason=:reason
            WHERE id=CAST(:id AS uuid) AND patient_id=:patient RETURNING *
            """).param("date", date).param("slot", slot).param("fromJson", fromJson)
            .param("reason", body.getOrDefault("reason", "User requested reschedule")).param("id", id).param("patient", userId)
            .query().singleRow();
        notify(userId, "Appointment Rescheduled", "Your appointment is now " + date + " at " + slot, "appointment");
        return updated;
    }

    public List<Map<String, Object>> waitlist(String doctorId, LocalDate date, String slot) {
        return jdbc.sql("""
            SELECT * FROM appointment_waitlist WHERE doctor_id::text=:doctor AND date=:date AND time_slot=:slot
              AND status IN ('waiting','offered') ORDER BY position
            """).param("doctor", doctorId).param("date", date).param("slot", slot).query().listOfRows();
    }

    @Transactional
    public Map<String, Object> joinWaitlist(String userId, Map<String, Object> body) {
        String doctorId = required(body, "doctorId");
        LocalDate date = LocalDate.parse(required(body, "date"));
        String slot = required(body, "timeSlot");
        boolean duplicate = jdbc.sql("""
            SELECT EXISTS(SELECT 1 FROM appointment_waitlist WHERE user_id=:user AND doctor_id::text=:doctor
              AND date=:date AND time_slot=:slot AND status IN ('waiting','offered'))
            """).param("user", userId).param("doctor", doctorId).param("date", date).param("slot", slot).query(Boolean.class).single();
        if (duplicate) throw new ApiException(HttpStatus.CONFLICT, "You are already on this waitlist");
        int position = jdbc.sql("""
            SELECT COALESCE(MAX(position),0)+1 FROM appointment_waitlist WHERE doctor_id::text=:doctor
              AND date=:date AND time_slot=:slot AND status='waiting'
            """).param("doctor", doctorId).param("date", date).param("slot", slot).query(Integer.class).single();
        Map<String, Object> entry = jdbc.sql("""
            INSERT INTO appointment_waitlist (user_id,user_name,user_email,doctor_id,date,time_slot,position,priority,reason,status,expires_at)
            VALUES (:user,:name,:email,CAST(:doctor AS uuid),:date,:slot,:position,:priority,:reason,'waiting',NOW()+INTERVAL '24 hours') RETURNING *
            """).param("user", userId).param("name", required(body, "userName")).param("email", body.get("userEmail"))
            .param("doctor", doctorId).param("date", date).param("slot", slot).param("position", position)
            .param("priority", body.getOrDefault("priority", "regular")).param("reason", body.getOrDefault("reason", "Requested appointment"))
            .query().singleRow();
        notify(userId, "Added to Waitlist", "You are position " + position + " on the waitlist", "general");
        return entry;
    }

    @Transactional
    public Map<String, Object> acceptWaitlist(String userId, String waitlistId) {
        Map<String, Object> entry = jdbc.sql("""
            SELECT * FROM appointment_waitlist WHERE id=CAST(:id AS uuid) AND user_id=:user FOR UPDATE
            """).param("id", waitlistId).param("user", userId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Waitlist entry not found"));
        if (!"offered".equals(entry.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This waitlist offer is unavailable");
        if (entry.get("expires_at") instanceof OffsetDateTime expiry && expiry.isBefore(OffsetDateTime.now())) {
            throw new ApiException(HttpStatus.GONE, "This waitlist offer has expired");
        }
        Map<String, Object> user = jdbc.sql("SELECT * FROM users WHERE id=:id").param("id", userId).query().singleRow();
        Map<String, Object> doctor = jdbc.sql("SELECT * FROM doctors WHERE id=CAST(:id AS uuid)")
            .param("id", entry.get("doctor_id").toString()).query().singleRow();
        Map<String, Object> appointment = jdbc.sql("""
            INSERT INTO appointments (patient_id,patient_name,hospital_id,department_id,doctor_id,date,time_slot,status,otp_verified,created_from_waitlist)
            VALUES (:patient,:name,CAST(:hospital AS uuid),CAST(:department AS uuid),CAST(:doctor AS uuid),CAST(CAST(:date AS date) AS timestamptz),:slot,'confirmed',true,CAST(:waitlist AS uuid)) RETURNING *
            """).param("patient", userId).param("name", user.get("name")).param("hospital", doctor.get("hospital_id").toString())
            .param("department", doctor.get("department_id").toString()).param("doctor", doctor.get("id").toString())
            .param("date", entry.get("date")).param("slot", entry.get("time_slot")).param("waitlist", waitlistId).query().singleRow();
        jdbc.sql("UPDATE appointment_waitlist SET status='accepted',accepted_at=NOW(),appointment_id=CAST(:appointment AS uuid) WHERE id=CAST(:id AS uuid)")
            .param("appointment", appointment.get("id").toString()).param("id", waitlistId).update();
        notify(userId, "Appointment Confirmed", "Your waitlist appointment is confirmed", "appointment");
        return appointment;
    }

    public Map<String, Object> updateStatus(String appointmentId, String status) {
        if (!List.of("pending", "confirmed", "completed", "cancelled", "rescheduled", "no_show").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid appointment status");
        }
        return jdbc.sql("UPDATE appointments SET previous_status=status,status=:status WHERE id=CAST(:id AS uuid) RETURNING *")
            .param("status", status).param("id", appointmentId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
    }

    private Map<String, Object> owned(String id, String userId) {
        return jdbc.sql("SELECT * FROM appointments WHERE id=CAST(:id AS uuid) AND patient_id=:patient")
            .param("id", id).param("patient", userId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
    }

    private void offerFirstWaitlisted(Map<String, Object> appointment) {
        jdbc.sql("""
            UPDATE appointment_waitlist SET status='offered',offered_at=NOW(),expires_at=NOW()+INTERVAL '2 hours'
            WHERE id=(SELECT id FROM appointment_waitlist WHERE doctor_id::text=:doctor AND date=CAST(:date AS date)
              AND time_slot=:slot AND status='waiting' ORDER BY position LIMIT 1)
            """).param("doctor", appointment.get("doctor_id").toString()).param("date", appointment.get("date"))
            .param("slot", appointment.get("time_slot")).update();
    }

    private void notify(String userId, String title, String message, String type) {
        jdbc.sql("INSERT INTO notifications(user_id,title,message,type) VALUES (:user,:title,:message,:type)")
            .param("user", userId).param("title", title).param("message", message).param("type", type).update();
    }

    private static String required(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value.toString();
    }
}
