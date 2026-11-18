package com.mediqueue.ai;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediqueue.api.ApiException;

@Service
public class TriageService {
    private final RestClient client;
    private final ObjectMapper json;
    private final String apiKey;

    public TriageService(RestClient.Builder builder, ObjectMapper json,
                         @Value("${app.gemini-api-key:}") String apiKey) {
        this.client = builder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.json = json;
        this.apiKey = apiKey;
    }

    public Map<String, Object> triage(Map<String, Object> input) {
        String symptoms = input.get("symptoms") == null ? "" : input.get("symptoms").toString().trim();
        if (symptoms.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Symptoms description is required for AI triage");
        if (apiKey.isBlank()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI triage is not configured");
        String system = """
            You are a clinical triage assistant for a hospital queue system. Do not diagnose. Recommend one department from
            Cardiology, General Medicine, Pediatrics, Orthopedics, Dermatology, Emergency, or Neurology; classify urgency as
            routine, urgent, or emergency; provide brief reasoning and safe preliminary advice. If warning signs may be
            life-threatening, choose Emergency and advise immediate local emergency care. Return only valid JSON with keys
            department, urgency, confidence, reasoning, and selfCareAdvice (an array of strings).
            """;
        String prompt = "Age: " + value(input, "age", "Not specified") + "\nGender: " + value(input, "gender", "Not specified") +
            "\nVitals: " + value(input, "vitals", "Not specified") + "\nSymptoms: " + symptoms;
        Map<String, Object> request = Map.of(
            "systemInstruction", Map.of("parts", List.of(Map.of("text", system))),
            "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
        try {
            Map<?, ?> response = client.post()
                .uri(uri -> uri.path("/v1beta/models/gemini-2.5-flash:generateContent").queryParam("key", apiKey).build())
                .body(request).retrieve().body(Map.class);
            String text = extractText(response);
            String cleaned = text.replaceFirst("(?is)^```(?:json)?\\s*", "").replaceFirst("(?is)\\s*```$", "").trim();
            return json.readValue(cleaned, new TypeReference<>() {});
        } catch (Exception exception) {
            return Map.of("department", "General Medicine", "urgency", "routine", "confidence", 0.5,
                "reasoning", "The automated triage response was unavailable; a clinician should review the symptoms.",
                "selfCareAdvice", List.of("Seek urgent medical help immediately if symptoms worsen or warning signs appear."));
        }
    }

    @SuppressWarnings("unchecked")
    private static String extractText(Map<?, ?> response) {
        if (response == null) return "";
        try {
            var candidates = (List<Map<String, Object>>) response.get("candidates");
            var content = (Map<String, Object>) candidates.get(0).get("content");
            var parts = (List<Map<String, Object>>) content.get("parts");
            return parts.get(0).get("text").toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String value(Map<String, Object> input, String key, String fallback) {
        Object value = input.get(key);
        return value == null || value.toString().isBlank() ? fallback : value.toString();
    }
}
