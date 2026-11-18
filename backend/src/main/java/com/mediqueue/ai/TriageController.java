package com.mediqueue.ai;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
public class TriageController {
    private final TriageService triage;

    public TriageController(TriageService triage) {
        this.triage = triage;
    }

    @PostMapping("/triage")
    Map<String, Object> triage(@RequestBody Map<String, Object> request) {
        return Map.of("success", true, "triage", triage.triage(request));
    }
}
