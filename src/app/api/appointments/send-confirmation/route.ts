import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/services/emailService";

export async function POST(request: NextRequest) {
  try {
    const { email, appointmentDetails } = await request.json();

    if (!email || !appointmentDetails) {
      return NextResponse.json(
        { error: "Email and appointment details are required." },
        { status: 400 }
      );
    }

    console.log("📨 Sending appointment confirmation email to:", email, appointmentDetails);

    const emailSent = await emailService.sendAppointmentConfirmation(email, {
      patientName: appointmentDetails.patientName || "Patient",
      doctorName: appointmentDetails.doctorName || "Doctor",
      hospitalName: appointmentDetails.hospitalName || "Hospital",
      departmentName: appointmentDetails.departmentName || "Department",
      date: appointmentDetails.date || new Date().toISOString().split("T")[0],
      timeSlot: appointmentDetails.timeSlot || "Scheduled Slot",
      appointmentId: appointmentDetails.appointmentId || "N/A",
    });

    return NextResponse.json({
      success: true,
      delivered: emailSent,
      message: emailSent
        ? "Confirmation email sent successfully."
        : "Email recorded (check inbox/spam or system logs).",
    });
  } catch (error: any) {
    console.error("❌ Error sending appointment confirmation email:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send appointment confirmation email" },
      { status: 500 }
    );
  }
}
