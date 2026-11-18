package com.mediqueue.messaging;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mediqueue.api.ApiException;

@Service
public class OtpService {
    private final JdbcClient jdbc;
    private final MailService mail;
    private final boolean exposeDevelopmentOtp;
    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder hashes = new BCryptPasswordEncoder(10);

    public OtpService(JdbcClient jdbc, MailService mail,
                      @Value("${app.expose-development-otp:false}") boolean exposeDevelopmentOtp) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.exposeDevelopmentOtp = exposeDevelopmentOtp;
    }

    @Transactional
    public Map<String, Object> create(String email, String purpose) {
        int recent = jdbc.sql("SELECT COUNT(*) FROM otps WHERE email=:email AND created_at>NOW()-INTERVAL '10 minutes'")
            .param("email", email).query(Integer.class).single();
        if (recent >= 5) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many verification codes requested. Try again later.");
        jdbc.sql("UPDATE otps SET verified=true WHERE email=:email AND purpose=:purpose AND verified=false")
            .param("email", email).param("purpose", purpose).update();
        String otp = String.format("%06d", random.nextInt(1_000_000));
        String id = jdbc.sql("""
            INSERT INTO otps(email,otp_hash,purpose,expires_at) VALUES (:email,:hash,:purpose,:expires) RETURNING id::text
            """).param("email", email).param("hash", hashes.encode(otp)).param("purpose", purpose)
            .param("expires", OffsetDateTime.now().plusMinutes(10)).query(String.class).single();
        boolean delivered = mail.sendOtp(email, otp, purpose);
        var response = new java.util.LinkedHashMap<String, Object>();
        response.put("success", true);
        response.put("message", delivered ? "OTP sent to your email." : "OTP generated; SMTP delivery is not configured.");
        response.put("otpId", id);
        response.put("emailSent", delivered);
        if (exposeDevelopmentOtp) response.put("devOtp", otp);
        return response;
    }

    @Transactional
    public boolean verify(String email, String otp, String purpose) {
        Map<String, Object> record = jdbc.sql("""
            SELECT * FROM otps WHERE email=:email AND purpose=:purpose AND verified=false AND expires_at>NOW()
            ORDER BY created_at DESC LIMIT 1 FOR UPDATE
            """).param("email", email).param("purpose", purpose).query().listOfRows().stream().findFirst().orElse(null);
        if (record == null || !hashes.matches(otp, record.get("otp_hash").toString())) return false;
        jdbc.sql("UPDATE otps SET verified=true WHERE id=CAST(:id AS uuid)").param("id", record.get("id").toString()).update();
        return true;
    }
}
