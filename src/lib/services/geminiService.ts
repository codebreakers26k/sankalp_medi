/**
 * Google Gemini AI Service
 * Powered by Gemini 2.5 Flash for high-speed, intelligent healthcare triage and assistant workflows.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface TriageResult {
  department: string;
  urgency: "routine" | "urgent" | "emergency";
  confidence: number;
  reasoning: string;
  recommendedDepartmentId?: string;
  selfCareAdvice: string[];
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || GEMINI_API_KEY;
  }

  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.apiKey}`;

    const body: any = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error (${response.status}): ${
          errData?.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "";
    return text;
  }

  /**
   * AI-powered patient symptom triage and department recommendation
   */
  async triageSymptoms(
    symptoms: string,
    meta?: { age?: string; gender?: string; vitals?: string }
  ): Promise<TriageResult> {
    const systemPrompt = `You are an expert AI Clinical Triage System for a hospital OPD queue management platform.
Analyze the user's symptoms and classify them into:
1. Recommended Department (one of: Cardiology, General Medicine, Pediatrics, Orthopedics, Dermatology, Emergency, Neurology)
2. Urgency level ('routine', 'urgent', or 'emergency')
3. Brief medical reasoning (2 sentences max)
4. Self-care / preliminary instructions before seeing the doctor (2-3 concise bullets)

Return ONLY valid JSON matching this schema:
{
  "department": "Department Name",
  "urgency": "routine" | "urgent" | "emergency",
  "confidence": 0.95,
  "reasoning": "Explanation...",
  "selfCareAdvice": ["Advice 1", "Advice 2"]
}`;

    const prompt = `Patient details:
Age: ${meta?.age || "Not specified"}
Gender: ${meta?.gender || "Not specified"}
Reported Symptoms / Reason for visit:
"${symptoms}"

Please provide triage assessment in JSON format.`;

    const rawResponse = await this.generateContent(prompt, systemPrompt);
    
    // Extract JSON block if surrounded by markdown code fences
    const cleanJson = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleanJson);
    } catch {
      return {
        department: "General Medicine",
        urgency: "routine",
        confidence: 0.8,
        reasoning: "General consultation recommended based on the reported symptoms.",
        selfCareAdvice: ["Rest and monitor symptoms before appointment."],
      };
    }
  }

  /**
   * Clinical notes summary for doctors
   */
  async summarizeClinicalNotes(notes: string): Promise<string> {
    const systemPrompt = `You are a medical assistant helping physicians format clean clinical summaries and follow-up care plans from shorthand notes. Return concise markdown format.`;
    return this.generateContent(notes, systemPrompt);
  }
}

export const geminiService = new GeminiService();
