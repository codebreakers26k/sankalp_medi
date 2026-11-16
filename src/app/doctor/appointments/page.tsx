"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  LogOut,
  UserCheck,
  Building2,
  Activity,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { DoctorNav } from "@/components/doctor/DoctorNav";

interface Appointment {
  id: string;
  patient_id?: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  hospital_id?: string;
  hospital_name?: string;
  department_id?: string;
  department_name?: string;
  date: string;
  time_slot: string;
  status: string;
  created_at?: string;
}

export default function DoctorAppointmentsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [doctorInfo, setDoctorInfo] = useState<any>(null);

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
      fetchAppointments();
    }
  }, [isLoaded, isSignedIn, user]);

  const fetchAppointments = async () => {
    setLoading(true);
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
        }
      );

      // Fetch appointments where doctor_id matches docId or user.id
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .or(`doctor_id.eq.${docId},doctor_id.eq.${user?.id}`)
        .order("date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (error) {
        console.error("Error querying appointments:", error);
      }

      const list = data || [];
      setAppointments(list);

      // Smart initial tab selection: if today has appointments, select today, else all
      const today = new Date().toISOString().split("T")[0];
      const hasToday = list.some((a) => (a.date ? a.date.split("T")[0] : "") === today);
      if (hasToday && filter === "all") {
        setFilter("today");
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const getDateOnly = (d?: string) => (d ? d.split("T")[0] : "");

  const todayCount = appointments.filter((a) => getDateOnly(a.date) === today).length;
  const upcomingCount = appointments.filter((a) => getDateOnly(a.date) > today).length;
  const allCount = appointments.length;

  const filtered = appointments.filter((a) => {
    const d = getDateOnly(a.date);
    if (filter === "today" && d !== today) return false;
    if (filter === "upcoming" && d <= today) return false;
    if (search && !a.patient_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdmitToQueue = async (appt: Appointment) => {
    setActionLoading(appt.id);
    try {
      // Check if already in queue
      const { data: existingQueue } = await supabase
        .from("queue")
        .select("id, token_number")
        .eq("patient_id", appt.patient_id)
        .eq("status", "waiting")
        .maybeSingle();

      if (existingQueue) {
        alert(`Patient ${appt.patient_name} is already in the live queue! Token: ${existingQueue.token_number}`);
        return;
      }

      // Generate a token number
      const now = new Date();
      const tokenNumber = Math.floor(100000 + Math.random() * 900000);

      const { data: deptData } = await supabase
        .from("doctors")
        .select("department_id, hospital_id")
        .eq("id", appt.doctor_id || doctorInfo?.id)
        .maybeSingle();

      const { error: queueError } = await supabase.from("queue").insert({
        token_number: tokenNumber,
        patient_id: appt.patient_id || user?.id,
        patient_name: appt.patient_name,
        hospital_id: appt.hospital_id || deptData?.hospital_id,
        department_id: appt.department_id || deptData?.department_id,
        doctor_id: appt.doctor_id || doctorInfo?.id,
        date: now.toISOString(),
        time: now.toISOString(),
        treatment_type: "Appointment Consultation",
        is_emergency: false,
        status: "waiting",
        position: 1,
        estimated_wait_time: 15,
      });

      if (queueError) {
        throw queueError;
      }

      // Update appointment status to confirmed
      await supabase
        .from("appointments")
        .update({ status: "confirmed", otp_verified: true })
        .eq("id", appt.id);

      alert(`✅ Patient ${appt.patient_name} admitted to Live Queue! Token: ${tokenNumber}`);
      await fetchAppointments();
    } catch (err: any) {
      console.error("Error admitting patient to queue:", err);
      alert(`Failed to admit patient: ${err?.message || "Unknown error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: "confirmed" | "completed" | "cancelled") => {
    setActionLoading(appointmentId);
    try {
      await supabase.from("appointments").update({ status }).eq("id", appointmentId);
      await fetchAppointments();
    } catch (err: any) {
      console.error("Error updating appointment status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#090D16] text-zinc-900 dark:text-zinc-100 transition-colors">
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
              <h1 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                Scheduled Appointments
              </h1>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Dr. {doctorInfo?.name || "Doctor"} · Consultations &amp; Patient Bookings
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAppointments}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DoctorNav currentTab="appointments" />

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#ECE5DB] dark:border-zinc-800 p-6 shadow-xs">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
              <button
                onClick={() => setFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "all"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>All</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-600 font-bold">
                  {allCount}
                </span>
              </button>

              <button
                onClick={() => setFilter("today")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "today"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>Today</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  todayCount > 0 ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" : "bg-zinc-200 dark:bg-zinc-600"
                }`}>
                  {todayCount}
                </span>
              </button>

              <button
                onClick={() => setFilter("upcoming")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === "upcoming"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>Upcoming</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-600 font-bold">
                  {upcomingCount}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search patient name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 mx-auto border-b-2 border-blue-600" />
              <p className="text-xs text-zinc-500 mt-3">Loading appointments...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
              <Calendar className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-60" />
              <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                No appointments found
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {filter === "today" && upcomingCount > 0
                  ? `You have no appointments today, but you have ${upcomingCount} upcoming appointments in other dates.`
                  : "There are no scheduled visits matching this filter."}
              </p>
              {filter === "today" && upcomingCount > 0 && (
                <button
                  onClick={() => setFilter("all")}
                  className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  View All ({allCount}) Appointments
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((appt) => {
                const isToday = getDateOnly(appt.date) === today;
                const formattedDate = appt.date
                  ? new Date(appt.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Date N/A";

                return (
                  <div
                    key={appt.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 -mx-6 px-6 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border ${
                        isToday
                          ? "bg-purple-100 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                          : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                      }`}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                            {appt.patient_name}
                          </p>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            {appt.time_slot}
                          </span>
                          <span>·</span>
                          <span>{formattedDate}</span>
                          {appt.department_name && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-zinc-400" />
                                {appt.department_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          appt.status === "confirmed"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : appt.status === "completed"
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            : appt.status === "cancelled"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {appt.status}
                      </span>

                      {/* Action: Admit to Queue */}
                      {appt.status !== "completed" && appt.status !== "cancelled" && (
                        <button
                          onClick={() => handleAdmitToQueue(appt)}
                          disabled={actionLoading === appt.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Place patient directly into the Live Waiting Queue"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>Admit to Queue</span>
                        </button>
                      )}

                      {/* Action: Complete */}
                      {appt.status !== "completed" && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                          disabled={actionLoading === appt.id}
                          className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 text-zinc-600 dark:text-zinc-400 transition-colors"
                          title="Mark Consultation Completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Action: Cancel */}
                      {appt.status !== "cancelled" && appt.status !== "completed" && (
                        <button
                          onClick={() => {
                            if (confirm(`Cancel appointment for ${appt.patient_name}?`)) {
                              handleUpdateStatus(appt.id, "cancelled");
                            }
                          }}
                          disabled={actionLoading === appt.id}
                          className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 text-zinc-600 dark:text-zinc-400 transition-colors"
                          title="Cancel Appointment"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
