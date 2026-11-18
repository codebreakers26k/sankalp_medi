package com.mediqueue.queue;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.mediqueue.security.CurrentUser;

@RestController
public class EmergencyController {
    private final QueueService queues;

    public EmergencyController(QueueService queues) {
        this.queues = queues;
    }

    @PostMapping("/emergency-queue")
    Map<String, Object> emergency(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return queues.emergency(CurrentUser.id(jwt), request);
    }
}
