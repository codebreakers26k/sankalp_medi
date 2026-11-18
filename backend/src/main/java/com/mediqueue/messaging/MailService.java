package com.mediqueue.messaging;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

@Service
public class MailService {
    private final JavaMailSender sender;
    private final String username;
    private final String from;
    private final String fromName;

    public MailService(JavaMailSender sender,
                       @Value("${spring.mail.username:}") String username,
                       @Value("${app.mail-from:}") String from,
                       @Value("${app.mail-from-name:MediQueue Pro}") String fromName) {
        this.sender = sender;
        this.username = username;
        this.from = from;
        this.fromName = fromName;
    }

    public boolean configured() {
        return StringUtils.hasText(username) && StringUtils.hasText(from);
    }

    public boolean sendOtp(String email, String otp, String purpose) {
        String safePurpose = HtmlUtils.htmlEscape(purpose);
        return send(email, "Your MediQueue verification code", """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <h2>MediQueue verification</h2>
              <p>Use this code to verify your %s request:</p>
              <p style="font-size:32px;font-weight:700;letter-spacing:6px">%s</p>
              <p>This code expires in 10 minutes. Never share it with anyone.</p>
            </div>
            """.formatted(safePurpose, otp));
    }

    public boolean sendAppointmentConfirmation(String email, Map<String, Object> details) {
        String patient = escaped(details, "patientName", "Patient");
        String doctor = escaped(details, "doctorName", "Doctor");
        String hospital = escaped(details, "hospitalName", "Hospital");
        String department = escaped(details, "departmentName", "Department");
        String date = escaped(details, "date", "Scheduled date");
        String slot = escaped(details, "timeSlot", "Scheduled time");
        String id = escaped(details, "appointmentId", "N/A");
        return send(email, "MediQueue appointment confirmed", """
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
              <h2>Appointment confirmed</h2><p>Dear %s,</p>
              <p>Your appointment with %s at %s (%s) is confirmed.</p>
              <p><strong>Date:</strong> %s<br><strong>Time:</strong> %s<br><strong>Reference:</strong> %s</p>
              <p>Please arrive 15 minutes early.</p>
            </div>
            """.formatted(patient, doctor, hospital, department, date, slot, id));
    }

    private boolean send(String to, String subject, String html) {
        if (!configured()) return false;
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    private static String escaped(Map<String, Object> details, String key, String fallback) {
        Object value = details.get(key);
        return HtmlUtils.htmlEscape(value == null ? fallback : value.toString());
    }
}
