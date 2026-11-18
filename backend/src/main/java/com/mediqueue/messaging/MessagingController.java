package com.mediqueue.messaging;

import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.api.ApiException;

@RestController
public class MessagingController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final OtpService otps;
    private final MailService mail;

    public MessagingController(OtpService otps, MailService mail) {
        this.otps = otps;
        this.mail = mail;
    }

    @PostMapping("/send-otp")
    Map<String, Object> sendOtp(@RequestBody Map<String, Object> body) {
        String email = required(body, "email");
        if (!EMAIL.matcher(email).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid email format");
        return otps.create(email.toLowerCase(), value(body, "purpose", "appointment"));
    }

    @PostMapping("/verify-otp")
    Map<String, Object> verifyOtp(@RequestBody Map<String, Object> body) {
        String email = required(body, "email").toLowerCase();
        String otp = required(body, "otp");
        boolean valid = otps.verify(email, otp, value(body, "purpose", "appointment"));
        if (!valid) throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired OTP");
        return Map.of("success", true, "message", "OTP verified successfully");
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/appointments/send-confirmation")
    Map<String, Object> appointmentConfirmation(@RequestBody Map<String, Object> body) {
        String email = required(body, "email");
        Object rawDetails = body.get("appointmentDetails");
        if (!(rawDetails instanceof Map<?, ?>)) throw new ApiException(HttpStatus.BAD_REQUEST, "appointmentDetails is required");
        boolean delivered = mail.sendAppointmentConfirmation(email, (Map<String, Object>) rawDetails);
        return Map.of("success", true, "delivered", delivered,
            "message", delivered ? "Confirmation email sent successfully." : "SMTP delivery is not configured.");
    }

    private static String required(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, key + " is required");
        return value.toString();
    }

    private static String value(Map<String, Object> body, String key, String fallback) {
        Object value = body.get(key);
        return value == null ? fallback : value.toString();
    }
}
