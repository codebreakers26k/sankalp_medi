package com.mediqueue.catalog;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestClient;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping
public class CatalogController {
    private final JdbcClient jdbc;
    private final RestClient storage;
    private final String storageUrl;
    private final String storageKey;

    public CatalogController(JdbcClient jdbc, RestClient.Builder rest,
                             @Value("${app.supabase-url:}") String storageUrl,
                             @Value("${app.supabase-service-role-key:}") String storageKey) {
        this.jdbc = jdbc;
        this.storageUrl = storageUrl.replaceAll("/+$", "");
        this.storageKey = storageKey;
        this.storage = rest.baseUrl(this.storageUrl.isBlank() ? "http://localhost" : this.storageUrl).build();
    }

    @GetMapping("/hospitals")
    Map<String, Object> hospitals() {
        List<Map<String, Object>> data = jdbc.sql("SELECT * FROM hospitals WHERE COALESCE(is_active, true) ORDER BY name")
            .query().listOfRows();
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @GetMapping("/departments")
    Map<String, Object> departments(@RequestParam String hospitalId) {
        List<Map<String, Object>> data = jdbc.sql("SELECT * FROM departments WHERE hospital_id = CAST(:hospitalId AS uuid) ORDER BY name")
            .param("hospitalId", hospitalId).query().listOfRows();
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @GetMapping("/doctors")
    Map<String, Object> doctors(@RequestParam(required = false) String hospitalId,
                                @RequestParam(required = false) String departmentId) {
        StringBuilder sql = new StringBuilder("SELECT * FROM doctors WHERE COALESCE(is_on_leave, false) = false");
        if (hospitalId != null && !hospitalId.isBlank()) sql.append(" AND hospital_id = CAST(:hospitalId AS uuid)");
        if (departmentId != null && !departmentId.isBlank()) sql.append(" AND department_id = CAST(:departmentId AS uuid)");
        sql.append(" ORDER BY rating DESC NULLS LAST, name");
        JdbcClient.StatementSpec statement = jdbc.sql(sql.toString());
        if (hospitalId != null && !hospitalId.isBlank()) statement = statement.param("hospitalId", hospitalId);
        if (departmentId != null && !departmentId.isBlank()) statement = statement.param("departmentId", departmentId);
        List<Map<String, Object>> data = statement.query().listOfRows();
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @PostMapping("/admin/hospitals")
    Map<String, Object> createHospital(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        require(body, "name", "address", "city", "state", "pincode", "phone", "email");
        Map<String, Object> hospital = jdbc.sql("""
            INSERT INTO hospitals (name,address,city,state,pincode,phone,email,hospital_type,bed_count,accreditation,website,license_number,license_document_url)
            VALUES (:name,:address,:city,:state,:pincode,:phone,:email,:hospitalType,:bedCount,:accreditation,:website,:licenseNumber,:licenseDocumentUrl)
            RETURNING *
            """)
            .param("name", body.get("name")).param("address", body.get("address"))
            .param("city", body.get("city")).param("state", body.get("state"))
            .param("pincode", body.get("pincode")).param("phone", body.get("phone"))
            .param("email", body.get("email")).param("hospitalType", value(body, "hospital_type", "private"))
            .param("bedCount", integer(body.get("bed_count"), 0)).param("accreditation", value(body, "accreditation", null))
            .param("website", value(body, "website", null)).param("licenseNumber", value(body, "license_number", null))
            .param("licenseDocumentUrl", value(body, "license_document_url", null)).query().singleRow();
        return Map.of("success", true, "data", hospital);
    }

    @GetMapping("/admin/hospitals")
    Map<String, Object> adminHospitals(@AuthenticationPrincipal Jwt jwt) {
        CurrentUser.requireRole(jwt, "admin");
        List<Map<String, Object>> data = jdbc.sql("SELECT * FROM hospitals ORDER BY created_at DESC").query().listOfRows();
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @PostMapping(value = "/admin/hospitals/license-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String, Object> uploadLicense(@AuthenticationPrincipal Jwt jwt, @RequestPart("file") MultipartFile file) {
        CurrentUser.requireRole(jwt, "admin");
        if (storageUrl.isBlank() || storageKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Server-side document storage is not configured");
        }
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "License file must be between 1 byte and 10 MB");
        }
        String contentType = file.getContentType();
        if (!List.of("application/pdf", "image/jpeg", "image/png", "image/webp").contains(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF, JPEG, PNG, and WebP files are accepted");
        }
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String extension = original.contains(".") ? original.substring(original.lastIndexOf('.')).replaceAll("[^A-Za-z0-9.]", "") : "";
        String path = "licenses/" + java.util.UUID.randomUUID() + extension;
        try {
            RestClient.RequestBodySpec request = storage.post()
                .uri("/storage/v1/object/hospital-documents/" + path)
                .header("apikey", storageKey);
            if (!storageKey.startsWith("sb_secret_")) {
                request.header("Authorization", "Bearer " + storageKey);
            }
            request.contentType(MediaType.parseMediaType(contentType))
                .body(file.getBytes()).retrieve().toBodilessEntity();
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Document storage rejected the upload");
        }
        return Map.of("success", true, "data", Map.of("url",
            storageUrl + "/storage/v1/object/public/hospital-documents/" + path));
    }

    @PostMapping("/admin/departments")
    Map<String, Object> createDepartment(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        require(body, "hospital_id", "name");
        Map<String, Object> department = jdbc.sql("""
            INSERT INTO departments(hospital_id,name,description,floor)
            VALUES (CAST(:hospital AS uuid),:name,:description,:floor) RETURNING *
            """).param("hospital", body.get("hospital_id")).param("name", body.get("name"))
            .param("description", value(body, "description", null)).param("floor", value(body, "floor", null))
            .query().singleRow();
        return Map.of("success", true, "data", department);
    }

    @PatchMapping("/admin/hospitals/{id}")
    Map<String, Object> updateHospital(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                                       @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        Map<String, Object> existing = jdbc.sql("SELECT * FROM hospitals WHERE id=CAST(:id AS uuid)")
            .param("id", id).query().listOfRows().stream().findFirst().orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Hospital not found"));
        Map<String, Object> updated = jdbc.sql("""
            UPDATE hospitals SET name=:name,address=:address,city=:city,state=:state,pincode=:pincode,phone=:phone,email=:email,
              hospital_type=:hospitalType,bed_count=:bedCount,accreditation=:accreditation,website=:website,
              license_number=:licenseNumber,license_document_url=:licenseDocumentUrl,is_active=:active
            WHERE id=CAST(:id AS uuid) RETURNING *
            """).param("id", id)
            .param("name", merged(body, existing, "name")).param("address", merged(body, existing, "address"))
            .param("city", merged(body, existing, "city")).param("state", merged(body, existing, "state"))
            .param("pincode", merged(body, existing, "pincode")).param("phone", merged(body, existing, "phone"))
            .param("email", merged(body, existing, "email")).param("hospitalType", merged(body, existing, "hospital_type"))
            .param("bedCount", merged(body, existing, "bed_count")).param("accreditation", merged(body, existing, "accreditation"))
            .param("website", merged(body, existing, "website")).param("licenseNumber", merged(body, existing, "license_number"))
            .param("licenseDocumentUrl", merged(body, existing, "license_document_url"))
            .param("active", merged(body, existing, "is_active")).query().singleRow();
        return Map.of("success", true, "data", updated);
    }

    @DeleteMapping("/admin/hospitals/{id}")
    Map<String, Object> deactivateHospital(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        CurrentUser.requireRole(jwt, "admin");
        int changed = jdbc.sql("UPDATE hospitals SET is_active=false WHERE id=CAST(:id AS uuid)").param("id", id).update();
        if (changed == 0) throw new ApiException(HttpStatus.NOT_FOUND, "Hospital not found");
        return Map.of("success", true);
    }

    private static void require(Map<String, Object> body, String... fields) {
        for (String field : fields) {
            if (body.get(field) == null || body.get(field).toString().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, field + " is required");
            }
        }
    }

    private static Object value(Map<String, Object> body, String key, Object fallback) {
        return body.get(key) == null ? fallback : body.get(key);
    }

    private static Object merged(Map<String, Object> body, Map<String, Object> existing, String key) {
        return body.containsKey(key) ? body.get(key) : existing.get(key);
    }

    private static int integer(Object value, int fallback) {
        if (value instanceof Number number) return number.intValue();
        try { return value == null ? fallback : Integer.parseInt(value.toString()); }
        catch (NumberFormatException ignored) { return fallback; }
    }
}
