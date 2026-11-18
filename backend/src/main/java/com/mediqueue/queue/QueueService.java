package com.mediqueue.queue;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediqueue.api.ApiException;
import com.mediqueue.util.QrCodeGenerator;

@Service
public class QueueService {
    private final JdbcClient jdbc;
    private final ObjectMapper json;
    private final QrCodeGenerator qrCodes;

    public QueueService(JdbcClient jdbc, ObjectMapper json, QrCodeGenerator qrCodes) {
        this.jdbc = jdbc;
        this.json = json;
        this.qrCodes = qrCodes;
    }

    @Transactional
    public Map<String, Object> join(String userId, Map<String, Object> request) {
        String patientName = required(request, "patientName", "name");
        String hospitalId = required(request, "hospitalId");
        String departmentId = required(request, "departmentId");
        String doctorId = optional(request, "doctorId");
        ensureUserExists(userId);

        int position = jdbc.sql("""
            SELECT COALESCE(MAX(position),0)+1 FROM queue
            WHERE hospital_id=CAST(:hospital AS uuid) AND department_id=CAST(:department AS uuid) AND status='waiting'
            """).param("hospital", hospitalId).param("department", departmentId).query(Integer.class).single();
        int average = doctorId == null ? 15 : jdbc.sql("SELECT COALESCE(average_treatment_time,15) FROM doctors WHERE id=CAST(:id AS uuid)")
            .param("id", doctorId).query(Integer.class).optional().orElse(15);
        int token = ThreadLocalRandom.current().nextInt(1000, 10000);
        Map<String, Object> payload = Map.of("tokenNumber", token, "patientId", userId, "position", position,
            "hospitalId", hospitalId, "departmentId", departmentId, "issuedAt", OffsetDateTime.now().toString());
        String qrCode = qrCodes.dataUrl(toJson(payload));

        JdbcClient.StatementSpec insert = jdbc.sql("""
            INSERT INTO queue (token_number,patient_id,patient_name,hospital_id,department_id,doctor_id,date,time,
              treatment_type,is_emergency,qr_code,status,position,estimated_wait_time,priority,service_type,location_id,is_remote,arrival_time)
            VALUES (:token,:patientId,:patientName,CAST(:hospital AS uuid),CAST(:department AS uuid),CAST(:doctor AS uuid),NOW(),NOW(),
              :treatment,false,:qr,'waiting',:position,:wait,:priority,:serviceType,:location,:remote,NOW())
            RETURNING *
            """).param("token", token).param("patientId", userId).param("patientName", patientName)
            .param("hospital", hospitalId).param("department", departmentId).param("doctor", doctorId)
            .param("treatment", value(request, "treatmentType", "General Consultation"))
            .param("qr", qrCode).param("position", position).param("wait", Math.max(0, (position - 1) * average))
            .param("priority", value(request, "priority", "regular")).param("serviceType", value(request, "serviceType", "general"))
            .param("location", value(request, "locationId", "default")).param("remote", bool(request.get("isRemote")));
        Map<String, Object> row = insert.query().singleRow();
        notifyUser(userId, "Joined Queue", "You are now position " + position + " in the queue", "queue");
        return row;
    }

    @Transactional
    public Map<String, Object> emergency(String userId, Map<String, Object> request) {
        String hospitalId = required(request, "hospitalId");
        String patientName = value(request, "patientName", "Emergency Patient").toString();
        ensureUserExists(userId);
        Map<String, Object> department = jdbc.sql("""
            SELECT * FROM departments WHERE hospital_id=CAST(:hospital AS uuid) AND lower(name)='emergency' LIMIT 1
            """).param("hospital", hospitalId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Emergency department not found for this hospital"));
        String departmentId = department.get("id").toString();
        jdbc.sql("UPDATE queue SET position=COALESCE(position,0)+1 WHERE department_id=CAST(:department AS uuid) AND status='waiting'")
            .param("department", departmentId).update();
        String doctorId = jdbc.sql("""
            SELECT id::text FROM doctors WHERE hospital_id=CAST(:hospital AS uuid) AND department_id=CAST(:department AS uuid)
              AND COALESCE(is_on_leave,false)=false ORDER BY rating DESC NULLS LAST LIMIT 1
            """).param("hospital", hospitalId).param("department", departmentId).query(String.class).optional().orElse(null);
        int token = ThreadLocalRandom.current().nextInt(1000, 10000);
        String qr = qrCodes.dataUrl(toJson(Map.of("tokenNumber", "E" + token, "isEmergency", true,
            "patientId", userId, "issuedAt", OffsetDateTime.now().toString())));
        Map<String, Object> row = jdbc.sql("""
            INSERT INTO queue (token_number,patient_id,patient_name,hospital_id,department_id,doctor_id,date,time,treatment_type,
              is_emergency,qr_code,status,position,estimated_wait_time,priority,service_type,location_id,arrival_time)
            VALUES (:token,:patientId,:patientName,CAST(:hospital AS uuid),CAST(:department AS uuid),CAST(:doctor AS uuid),NOW(),NOW(),
              'Emergency',true,:qr,'waiting',1,0,'emergency','emergency','default',NOW()) RETURNING *
            """).param("token", token).param("patientId", userId).param("patientName", patientName)
            .param("hospital", hospitalId).param("department", departmentId).param("doctor", doctorId).param("qr", qr)
            .query().singleRow();
        jdbc.sql("INSERT INTO notifications (user_id,title,message,type) VALUES (NULL,'Emergency case',:message,'emergency')")
            .param("message", "Emergency patient " + patientName + " requires immediate attention").update();
        Map<String, Object> result = new LinkedHashMap<>(row);
        result.put("hospitalName", jdbc.sql("SELECT name FROM hospitals WHERE id=CAST(:id AS uuid)").param("id", hospitalId).query(String.class).single());
        result.put("departmentName", department.get("name"));
        result.put("doctorName", doctorId == null ? "Emergency Team" : jdbc.sql("SELECT name FROM doctors WHERE id=CAST(:id AS uuid)").param("id", doctorId).query(String.class).single());
        result.put("estimatedWaitTime", 0);
        result.put("isEmergency", true);
        return result;
    }

    public Map<String, Object> status(String locationId, String hospitalId, String departmentId) {
        StringBuilder where = new StringBuilder(" WHERE q.status IN ('waiting','in-treatment') AND q.location_id=:location");
        if (hospitalId != null) where.append(" AND q.hospital_id=CAST(:hospital AS uuid)");
        if (departmentId != null) where.append(" AND q.department_id=CAST(:department AS uuid)");
        JdbcClient.StatementSpec queueStatement = jdbc.sql("SELECT q.* FROM queue q" + where + " ORDER BY q.position NULLS LAST,q.created_at")
            .param("location", locationId);
        JdbcClient.StatementSpec counterStatement = jdbc.sql("SELECT * FROM counters WHERE location_id=:location ORDER BY counter_number")
            .param("location", locationId);
        if (hospitalId != null) queueStatement = queueStatement.param("hospital", hospitalId);
        if (departmentId != null) queueStatement = queueStatement.param("department", departmentId);
        List<Map<String, Object>> queue = queueStatement.query().listOfRows().stream().map(row -> {
            var item = new LinkedHashMap<String, Object>(row);
            item.put("name", row.get("patient_name"));
            item.put("estimatedWaitTime", row.get("estimated_wait_time"));
            item.put("serviceType", row.get("service_type"));
            item.put("arrivalTime", row.get("arrival_time"));
            item.put("counterId", row.get("counter_id"));
            return (Map<String, Object>) item;
        }).toList();
        List<Map<String, Object>> counters = counterStatement.query().listOfRows().stream().map(row -> {
            var item = new LinkedHashMap<String, Object>(row);
            item.put("currentCustomerId", row.get("current_patient_id"));
            item.put("queueLength", 0);
            item.put("averageServiceTime", row.get("average_service_time"));
            item.put("staffId", row.get("staff_id"));
            return (Map<String, Object>) item;
        }).toList();
        double averageWait = queue.isEmpty() ? 0 : queue.stream()
            .map(row -> row.get("estimated_wait_time")).filter(Number.class::isInstance).map(Number.class::cast)
            .mapToDouble(Number::doubleValue).average().orElse(0);
        StringBuilder completedWhere = new StringBuilder(" WHERE status='completed' AND location_id=:location AND service_end_time >= NOW() - INTERVAL '1 hour'");
        if (hospitalId != null) completedWhere.append(" AND hospital_id=CAST(:hospital AS uuid)");
        if (departmentId != null) completedWhere.append(" AND department_id=CAST(:department AS uuid)");
        JdbcClient.StatementSpec completedStatement = jdbc.sql("SELECT COUNT(*) FROM queue" + completedWhere)
            .param("location", locationId);
        if (hospitalId != null) completedStatement = completedStatement.param("hospital", hospitalId);
        if (departmentId != null) completedStatement = completedStatement.param("department", departmentId);
        int customersServedPerHour = completedStatement.query(Integer.class).single();
        Map<String, Object> metrics = Map.of("totalCustomers", queue.size(),
            "queueLength", queue.stream().filter(row -> "waiting".equals(row.get("status"))).count(),
            "inTreatment", queue.stream().filter(row -> "in-treatment".equals(row.get("status"))).count(),
            "emergencyCount", queue.stream().filter(row -> Boolean.TRUE.equals(row.get("is_emergency"))).count(),
            "averageWaitTime", averageWait, "longestWaitTime", queue.stream().map(row -> row.get("estimated_wait_time"))
                .filter(Number.class::isInstance).map(Number.class::cast).mapToInt(Number::intValue).max().orElse(0),
            "customersServedPerHour", customersServedPerHour);
        return Map.of("queue", queue, "counters", counters, "metrics", metrics, "recommendations", List.of(),
            "lastUpdated", OffsetDateTime.now().toString());
    }

    @Transactional
    public Map<String, Object> callNext(String counterId) {
        Map<String, Object> counter = counter(counterId);
        String scope = counter.get("department_id") == null ? "" : " AND department_id=CAST(:department AS uuid)";
        JdbcClient.StatementSpec statement = jdbc.sql("SELECT * FROM queue WHERE status='waiting'" + scope + " ORDER BY is_emergency DESC,position,created_at FOR UPDATE SKIP LOCKED LIMIT 1");
        if (!scope.isEmpty()) statement = statement.param("department", counter.get("department_id").toString());
        Map<String, Object> patient = statement.query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No patients in queue"));
        String patientId = patient.get("patient_id").toString();
        Map<String, Object> updated = jdbc.sql("""
            UPDATE queue SET status='in-treatment',called_at=NOW(),service_start_time=NOW(),counter_id=CAST(:counter AS uuid),counter_number=:number
            WHERE id=CAST(:id AS uuid) RETURNING *
            """).param("counter", counterId).param("number", counter.get("counter_number")).param("id", patient.get("id").toString())
            .query().singleRow();
        jdbc.sql("UPDATE counters SET status='busy',current_patient_id=:patient,last_service_time=NOW() WHERE id=CAST(:id AS uuid)")
            .param("patient", patientId).param("id", counterId).update();
        notifyUser(patientId, "Your Turn!", "Please proceed to " + counter.get("name"), "queue");
        renumberWaiting();
        return Map.of("customer", updated, "counterId", counterId, "queueLength", waitingCount());
    }

    @Transactional
    public Map<String, Object> skip(String counterId) {
        Map<String, Object> counter = counter(counterId);
        Object patientId = counter.get("current_patient_id");
        if (patientId == null) throw new ApiException(HttpStatus.NOT_FOUND, "No patient is being served at this counter");
        Map<String, Object> skipped = jdbc.sql("""
            UPDATE queue SET status='skipped',skip_reason='Staff action',skip_time=NOW()
            WHERE patient_id=:patient AND status='in-treatment' RETURNING *
            """).param("patient", patientId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Active queue entry not found"));
        jdbc.sql("UPDATE counters SET status='open',current_patient_id=NULL,last_service_time=NOW() WHERE id=CAST(:id AS uuid)")
            .param("id", counterId).update();
        return Map.of("skippedCustomer", skipped, "counterId", counterId, "queueLength", waitingCount());
    }

    @Transactional
    public Map<String, Object> transfer(String fromCounterId, String toCounterId) {
        if (fromCounterId.equals(toCounterId)) throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot transfer to the same counter");
        Map<String, Object> from = counter(fromCounterId);
        Map<String, Object> to = counter(toCounterId);
        if (!"open".equals(to.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "Target counter is not open");
        Object patientId = from.get("current_patient_id");
        if (patientId == null) throw new ApiException(HttpStatus.NOT_FOUND, "Source counter has no active patient");
        Map<String, Object> patient = jdbc.sql("""
            UPDATE queue SET counter_id=CAST(:to AS uuid),counter_number=:number,transfer_time=NOW(),transfer_from_counter=CAST(:from AS uuid)
            WHERE patient_id=:patient AND status='in-treatment' RETURNING *
            """).param("to", toCounterId).param("number", to.get("counter_number")).param("from", fromCounterId)
            .param("patient", patientId).query().singleRow();
        jdbc.sql("UPDATE counters SET status='open',current_patient_id=NULL WHERE id=CAST(:id AS uuid)").param("id", fromCounterId).update();
        jdbc.sql("UPDATE counters SET status='busy',current_patient_id=:patient WHERE id=CAST(:id AS uuid)")
            .param("patient", patientId).param("id", toCounterId).update();
        notifyUser(patientId.toString(), "Counter Transfer", "Please move to " + to.get("name"), "queue");
        return Map.of("transferredCustomer", patient, "fromCounter", from, "toCounter", to);
    }

    public Map<String, Object> updateCounter(String counterId, String status) {
        if (!List.of("open", "closed", "busy").contains(status)) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid counter status");
        Map<String, Object> counter = jdbc.sql("UPDATE counters SET status=:status WHERE id=CAST(:id AS uuid) RETURNING *")
            .param("status", status).param("id", counterId).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Counter not found"));
        return counter;
    }

    private Map<String, Object> counter(String id) {
        return jdbc.sql("SELECT * FROM counters WHERE id=CAST(:id AS uuid)").param("id", id).query().listOfRows().stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Counter not found"));
    }

    private void ensureUserExists(String userId) {
        boolean exists = jdbc.sql("SELECT EXISTS(SELECT 1 FROM users WHERE id=:id)").param("id", userId).query(Boolean.class).single();
        if (!exists) throw new ApiException(HttpStatus.CONFLICT, "Create the user profile before joining a queue");
    }

    private void notifyUser(String userId, String title, String message, String type) {
        jdbc.sql("INSERT INTO notifications (user_id,title,message,type) VALUES (:user,:title,:message,:type)")
            .param("user", userId).param("title", title).param("message", message).param("type", type).update();
    }

    private void renumberWaiting() {
        jdbc.sql("""
            WITH ranked AS (SELECT id,ROW_NUMBER() OVER (PARTITION BY hospital_id,department_id ORDER BY is_emergency DESC,created_at) AS new_position FROM queue WHERE status='waiting')
            UPDATE queue q SET position=ranked.new_position,estimated_wait_time=(ranked.new_position-1)*5 FROM ranked WHERE q.id=ranked.id
            """).update();
    }

    private int waitingCount() {
        return jdbc.sql("SELECT COUNT(*) FROM queue WHERE status='waiting'").query(Integer.class).single();
    }

    private String toJson(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException(exception); }
    }

    private static String required(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            String value = optional(map, key);
            if (value != null && !value.isBlank()) return value;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, keys[0] + " is required");
    }

    private static String optional(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null || value.toString().isBlank() ? null : value.toString();
    }

    private static Object value(Map<String, Object> map, String key, Object fallback) {
        return map.get(key) == null ? fallback : map.get(key);
    }

    private static boolean bool(Object value) {
        return value instanceof Boolean booleanValue && booleanValue;
    }
}
