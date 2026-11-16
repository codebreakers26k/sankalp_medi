import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/lib/services/geminiService";

export async function POST(request: NextRequest) {
  try {
    const { symptoms, age, gender, vitals } = await request.json();

    if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length === 0) {
      return NextResponse.json(
        { error: "Symptoms description is required for AI triage." },
        { status: 400 }
      );
    }

    const triageResult = await geminiService.triageSymptoms(symptoms, {
      age,
      gender,
      vitals,
    });

    return NextResponse.json({
      success: true,
      triage: triageResult,
    });
  } catch (error: any) {
    console.error("AI Triage Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process AI triage" },
      { status: 500 }
    );
  }
}
