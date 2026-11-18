package com.mediqueue.appointment;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.api.ApiException;
import com.mediqueue.security.CurrentUser;

@RestController
@RequestMapping("/appointments")
public class AppointmentController {
    private final AppointmentService appointments;

    public AppointmentController(AppointmentService appointments) {
        this.appointments = appointments;
    }

    @PostMapping
    Map<String, Object> create(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return Map.of("success", true, "data", appointments.create(CurrentUser.id(jwt), body));
    }

    @GetMapping("/mine")
    Map<String, Object> mine(@AuthenticationPrincipal Jwt jwt) {
        var data = appointments.forPatient(CurrentUser.id(jwt));
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @GetMapping("/doctor")
    Map<String, Object> doctor(@AuthenticationPrincipal Jwt jwt, @RequestParam String doctorId,
                               @RequestParam(required = false) LocalDate date) {
        CurrentUser.requireRole(jwt, "admin");
        var data = appointments.forDoctor(doctorId, date);
        return Map.of("success", true, "data", data, "count", data.size());
    }

    @GetMapping("/booked-slots")
    Map<String, Object> bookedSlots(@RequestParam String doctorId, @RequestParam LocalDate date) {
        List<String> data = appointments.bookedSlots(doctorId, date);
        return Map.of("success", true, "data", data);
    }

    @PostMapping("/cancel")
    Map<String, Object> cancel(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return Map.of("success", true, "data", Map.of("appointment", appointments.cancel(CurrentUser.id(jwt), body),
            "message", "Appointment cancelled successfully"));
    }

    @PostMapping("/reschedule")
    Map<String, Object> reschedule(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        return Map.of("success", true, "data", Map.of("appointment", appointments.reschedule(CurrentUser.id(jwt), body),
            "message", "Appointment rescheduled successfully"));
    }

    @GetMapping("/waitlist")
    Map<String, Object> waitlist(@RequestParam String doctorId, @RequestParam LocalDate date, @RequestParam String timeSlot) {
        var data = appointments.waitlist(doctorId, date, timeSlot);
        return Map.of("success", true, "data", Map.of("waitlist", data, "count", data.size()));
    }

    @PostMapping("/waitlist")
    Map<String, Object> joinWaitlist(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        Map<String, Object> entry = appointments.joinWaitlist(CurrentUser.id(jwt), body);
        return Map.of("success", true, "data", Map.of("waitlistEntry", entry, "position", entry.get("position")));
    }

    @PutMapping("/waitlist")
    Map<String, Object> acceptWaitlist(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        Object id = body.get("waitlistId");
        if (id == null) throw new ApiException(HttpStatus.BAD_REQUEST, "waitlistId is required");
        return Map.of("success", true, "data", Map.of("appointment", appointments.acceptWaitlist(CurrentUser.id(jwt), id.toString())));
    }

    @PatchMapping("/status")
    Map<String, Object> status(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(jwt, "admin");
        Object id = body.get("appointmentId");
        Object status = body.get("status");
        if (id == null || status == null) throw new ApiException(HttpStatus.BAD_REQUEST, "appointmentId and status are required");
        return Map.of("success", true, "data", appointments.updateStatus(id.toString(), status.toString()));
    }
}
