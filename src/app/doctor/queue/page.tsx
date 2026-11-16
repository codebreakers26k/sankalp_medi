"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Users,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Stethoscope,
  Calendar,
  Building2,
  UserCheck,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { DoctorNav } from "@/components/doctor/DoctorNav";

interface QueuePatient {
  id: string;
  token_number: number;
  patient_id: string;
  patient_name: string;
  position: number;
  status: string;
  is_emergency: boolean;
  created_at: string;
  estimated_wait_time: number;
}

interface ScheduledAppointment {
  id: string;
  patient_id?: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  hospital_id?: string;
  department_id?: string;
  department_name?: string;
  date: string;
  time_slot: string;
  status: string;
}

export default function DoctorQueuePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [appointments, setAppointments] = useState<ScheduledAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if ((user?.publicMetadata?.role as string) !== "doctor") {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      fetchQueueData();
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!doctorInfo) return;
    const subQueue = supabase
      .channel("doctor-queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () =>
        fetchQueueData()
      )
      .subscribe();

    const subAppts = supabase
      .channel("doctor-appts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () =>
        fetchQueueData()
      )
      .subscribe();

    return () => {
      subQueue.unsubscribe();
      subAppts.unsubscribe();
    };
  }, [doctorInfo]);

  const fetchQueueData = async () => {
    try {
      const email = user?.primaryEmailAddress?.emailAddress;
      const { data: doctor } = await supabase
        .from("doctors")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      const docId = doctor?.id || user?.id;
      setDoctorInfo(
        doctor || {
          id: docId,
          name: user?.fullName || "Doctor",
          email,
          specialization: "Cardiology",
          average_treatment_time: 15,
        }
      );

      // Query live queue for this doctor
      const { data: queueData } = await supabase
        .from("queue")
        .select("*")
        .or(`doctor_id.eq.${docId},doctor_id.eq.${user?.id}`)
        .eq("status", "waiting")
        .order("is_emergency", { ascending: false })
        .order("position", { ascending: true });

      setQueue(queueData || []);

      // Query today's scheduled appointments for this doctor
      const today = new Date().toISOString().split("T")[0];
      const { data: apptData } = await supabase
        .from("appointments")
        .select("*")
        .or(`doctor_id.eq.${docId},doctor_id.eq.${user?.id}`)
        .gte("date", `${today}T00:00:00.000Z`)
        .lte("date", `${today}T23:59:59.999Z`)
        .neq("status", "cancelled")
        .order("time_slot", { ascending: true });

      setAppointments(apptData || []);
    } catch (err) {
      console.error("Error fetching queue & appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const callNextPatient = async () => {
    if (queue.length === 0) return;
    const next = queue[0];
    setActionLoading(true);
    try {
      await supabase.from("queue").update({ status: "in-treatment" }).eq("id", next.id);
      await supabase.from("notifications").insert({
        type: "queue",
        title: "Your Turn!",
        message: `Please proceed to Dr. ${doctorInfo?.name || "Doctor"}. Token: ${next.token_number}`,
        read: false,
        created_at: new Date().toISOString(),
        metadata: {
          patientId: next.patient_id,
          doctorId: doctorInfo?.id,
          tokenNumber: next.token_number,
        },
      });
      fetchQueueData();
    } catch (error) {
      console.error("Error calling next patient:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const movePatient = async (patientId: string, currentPos: number, direction: "up" | "down") => {
    const targetPos = direction === "up" ? currentPos - 1 : currentPos + 1;
    const otherPatient = queue.find((p) => p.position === targetPos);
    if (!otherPatient) return;

    try {
      await Promise.all([
        supabase.from("queue").update({ position: targetPos }).eq("id", patientId),
        supabase.from("queue").update({ position: currentPos }).eq("id", otherPatient.id),
      ]);
      fetchQueueData();
    } catch (error) {
      console.error("Error reordering patient:", error);
    }
  };

  const markCompleted = async (patientId: string) => {
    try {
      await supabase.from("queue").update({ status: "completed" }).eq("id", patientId);
      fetchQueueData();
    } catch (error) {
      console.error("Error completing patient:", error);
    }
  };

  const admitAppointmentToQueue = async (appt: ScheduledAppointment) => {
    setAdmittingId(appt.id);
    try {
      // Check if already in queue
      const { data: existingQueue } = await supabase
        .from("queue")
        .select("id, token_number")
        .eq("patient_id", appt.patient_id)
        .eq("status", "waiting")
        .maybeSingle();

      if (existingQueue) {
        alert(`Patient ${appt.patient_name} is already waiting in queue with Token: ${existingQueue.token_number}`);
        return;
      }

      const now = new Date();
      const tokenNumber = Math.floor(100000 + Math.random() * 900000);
      const position = queue.length + 1;

      const { error: insertErr } = await supabase.from("queue").insert({
        token_number: tokenNumber,
        patient_id: appt.patient_id || user?.id,
        patient_name: appt.patient_name,
        hospital_id: appt.hospital_id || doctorInfo?.hospital_id,
        department_id: appt.department_id || doctorInfo?.department_id,
        doctor_id: appt.doctor_id || doctorInfo?.id,
        date: now.toISOString(),
        time: now.toISOString(),
        treatment_type: "Appointment Consultation",
        is_emergency: false,
        status: "waiting",
        position,
        estimated_wait_time: position * (doctorInfo?.average_treatment_time || 15),
      });

      if (insertErr) throw insertErr;

      // Update appointment status to confirmed
      await supabase.from("appointments").update({ status: "confirmed" }).eq("id", appt.id);

      alert(`✅ Patient ${appt.patient_name} admitted to Live Queue! Token: ${tokenNumber}`);
      await fetchQueueData();
    } catch (err: any) {
      console.error("Error admitting appointment:", err);
      alert(`Could not admit patient to queue: ${err?.message || "Unknown error"}`);
    } finally {
      setAdmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#090D16] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF8F5]/90 dark:bg-[#090D16]/90 border-b border-[#ECE5DB] dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/doctor"
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                  Live OPD Waiting Queue
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  {queue.length} In Line
                </span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Dr. {doctorInfo?.name || "Doctor"} · OPD Consultation Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchQueueData}
              title="Refresh queue"
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={callNextPatient}
              disabled={queue.length === 0 || actionLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Call Next Patient</span>
            </button>
            <button
              onClick={async () => {
                await signOut({ redirectUrl: "/" });
              }}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DoctorNav currentTab="queue" />

        {/* Live Queue Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#ECE5DB] dark:border-zinc-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 dark:text-white">
                Current Waiting Queue ({queue.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tokens sorted by medical priority (emergencies first) and arrival order.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Automated Call Alerts Enabled</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 mx-auto border-b-2 border-blue-600" />
              <p className="text-xs text-zinc-500 mt-3">Fetching queue records...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Queue is currently clear
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                {appointments.length > 0
                  ? `You have ${appointments.length} patient appointment(s) scheduled for today. You can admit them to the live queue below.`
                  : "New patients checking in via kiosk or app will appear here in real-time."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {queue.map((patient, idx) => (
                <div
                  key={patient.id}
                  className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    patient.is_emergency
                      ? "bg-red-50/50 dark:bg-red-950/20 -mx-6 px-6"
                      : "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 -mx-6 px-6"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold font-mono text-sm shadow-xs ${
                        patient.is_emergency
                          ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      <span className="text-[9px] uppercase font-sans tracking-wider opacity-80">
                        Token
                      </span>
                      <span>#{patient.token_number}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          {patient.patient_name}
                        </span>
                        {patient.is_emergency && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          Est: ~{patient.estimated_wait_time || 15} mins
                        </span>
                        <span>·</span>
                        <span>Pos: #{patient.position || idx + 1}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
                      <button
                        onClick={() => movePatient(patient.id, patient.position, "up")}
                        disabled={idx === 0}
                        title="Prioritize (Move Up)"
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </button>
                      <button
                        onClick={() => movePatient(patient.id, patient.position, "down")}
                        disabled={idx === queue.length - 1}
                        title="Move Down"
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                      </button>
                    </div>

                    <button
                      onClick={() => markCompleted(patient.id)}
                      title="Mark Completed"
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Scheduled Appointments Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#ECE5DB] dark:border-zinc-800 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-zinc-900 dark:text-white">
                  Today's Scheduled Appointments ({appointments.length})
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Today
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Patients who booked consultations for today. Click "Admit to Queue" to generate a live token.
              </p>
            </div>
            <Link
              href="/doctor/appointments"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All Appointments</span>
              <span>→</span>
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
              <Calendar className="w-8 h-8 text-zinc-400 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No appointments booked for today
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Check the{" "}
                <Link href="/doctor/appointments" className="text-blue-600 dark:text-blue-400 underline">
                  Appointments Tab
                </Link>{" "}
                for upcoming dates.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">
                        {appt.patient_name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {appt.time_slot}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{appt.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => admitAppointmentToQueue(appt)}
                      disabled={admittingId === appt.id}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{admittingId === appt.id ? "Admitting..." : "Admit to Queue"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
