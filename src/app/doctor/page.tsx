"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Calendar, Activity, ArrowLeft, Bell, ChevronUp, ChevronDown,
  AlertTriangle, User as UserIcon, Clock, CalendarDays, BarChart3,
  ChevronLeft, ChevronRight, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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

interface Appointment {
  id: string;
  patient_name: string;
  date: string;
  time_slot: string;
  status: string;
}

type AnalyticsFilter = "yesterday" | "day_before" | "last_7_days" | "custom";

export default function DoctorDashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientHistory, setPatientHistory] = useState<QueuePatient[]>([]);
  const [stats, setStats] = useState({ patientsServed: 0, waitingPatients: 0, todayAppointments: 0, avgWaitTime: 15 });
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "appointments" | "history" | "analytics" | "calendar">("queue");

  // Analytics
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter>("last_7_days");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [analyticsData, setAnalyticsData] = useState({ patientsServed: 0, completedAppointments: 0 });

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    if ((user?.publicMetadata?.role as string) !== "doctor") router.push("/");
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && (user.publicMetadata?.role as string) === "doctor") fetchDoctorData();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (doctorInfo) {
      const sub = supabase.channel("doctor-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => fetchDoctorData())
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchDoctorData())
        .subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [doctorInfo]);

  useEffect(() => {
    if (doctorInfo) fetchAnalytics();
  }, [analyticsFilter, customRange, doctorInfo]);

  const fetchDoctorData = async () => {
    try {
      const { data: doctor } = await supabase
        .from("doctors")
        .select("*")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (!doctor) { setAccessDenied(true); setLoading(false); return; }
      setDoctorInfo(doctor);

      const today = new Date().toISOString().split("T")[0];

      const [queueRes, apptRes, historyRes] = await Promise.all([
        supabase.from("queue").select("*").eq("doctor_id", doctor.id).eq("status", "waiting")
          .order("is_emergency", { ascending: false }).order("position", { ascending: true }),
        supabase.from("appointments").select("*").eq("doctor_id", doctor.id)
          .gte("date", today).order("date").order("time_slot"),
        supabase.from("queue").select("*").eq("doctor_id", doctor.id).eq("status", "completed")
          .order("created_at", { ascending: false }).limit(20),
      ]);

      setQueue(queueRes.data || []);
      setAppointments(apptRes.data || []);
      setPatientHistory(historyRes.data || []);

      const todayServed = (historyRes.data || []).filter(q => q.created_at?.startsWith(today)).length;
      setStats({
        patientsServed: todayServed,
        waitingPatients: queueRes.data?.length || 0,
        todayAppointments: (apptRes.data || []).filter(a => a.date === today).length,
        avgWaitTime: doctor.average_treatment_time || 15,
      });
    } catch (error) {
      console.error("Error fetching doctor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!doctorInfo) return;
    const today = new Date();
    let fromDate = "", toDate = today.toISOString().split("T")[0];

    if (analyticsFilter === "yesterday") {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      fromDate = toDate = y.toISOString().split("T")[0];
    } else if (analyticsFilter === "day_before") {
      const d = new Date(today); d.setDate(d.getDate() - 2);
      fromDate = toDate = d.toISOString().split("T")[0];
    } else if (analyticsFilter === "last_7_days") {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      fromDate = d.toISOString().split("T")[0];
    } else if (analyticsFilter === "custom") {
      fromDate = customRange.from; toDate = customRange.to;
    }

    if (!fromDate) return;

    const [qRes, aRes] = await Promise.all([
      supabase.from("queue").select("*", { count: "exact", head: true }).eq("doctor_id", doctorInfo.id)
        .eq("status", "completed").gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59"),
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctorInfo.id)
        .eq("status", "completed").gte("date", fromDate).lte("date", toDate),
    ]);

    setAnalyticsData({ patientsServed: qRes.count || 0, completedAppointments: aRes.count || 0 });
  };

  const callNextPatient = async () => {
    if (queue.length === 0) return;
    const next = queue[0];
    try {
      await supabase.from("queue").update({ status: "in-treatment" }).eq("id", next.id);
      await supabase.from("notifications").insert({
        type: "queue", title: "Your Turn!",
        message: `Please proceed to Dr. ${doctorInfo?.name || "Doctor"}. Token: ${next.token_number}`,
        read: false, created_at: new Date().toISOString(),
        metadata: { patientId: next.patient_id, doctorId: doctorInfo?.id, tokenNumber: next.token_number },
      });
      fetchDoctorData();
    } catch (error) { console.error("Error calling next patient:", error); }
  };

  const movePatient = async (patientId: string, currentPos: number, direction: "up" | "down") => {
    const targetPos = direction === "up" ? currentPos - 1 : currentPos + 1;
    if (targetPos < 1 || targetPos > queue.length) return;
    const other = queue.find(p => p.position === targetPos);
    if (!other) return;
    try {
      await Promise.all([
        supabase.from("queue").update({ position: targetPos }).eq("id", patientId),
        supabase.from("queue").update({ position: currentPos }).eq("id", other.id),
      ]);
      fetchDoctorData();
    } catch (error) { console.error("Error moving patient:", error); }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const calendarAppointments = appointments.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear();
  });

  if (!isLoaded || !isSignedIn || (user?.publicMetadata?.role as string) !== "doctor") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const tabs = [
    { key: "queue", label: "Queue", icon: Activity },
    { key: "appointments", label: "Appointments", icon: Calendar },
    { key: "history", label: "History", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#2563EB] rounded-full mix-blend-multiply filter blur-[100px] opacity-10" />
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] -right-[10%] w-[40%] h-[60%] bg-[#7C3AED] rounded-full mix-blend-multiply filter blur-[120px] opacity-10" />
      </div>

      <header className="bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Back</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Doctor Portal</h1>
            <div className="flex items-center space-x-4">
              <div className="relative group cursor-pointer p-2 hover:bg-slate-50 rounded-full transition-colors">
                <Bell className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                {queue.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                  </span>
                )}
              </div>
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                {user?.firstName?.charAt(0) || "D"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Welcome back, Dr. {doctorInfo?.name?.replace(/^Dr\.?\s*/i, "") || user?.firstName || "Doctor"}
          </h2>
          <p className="text-slate-500 text-lg">{doctorInfo?.specialization || "Medical Professional"} • Active Session</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Patients Served Today", value: stats.patientsServed, icon: Users, color: "emerald", bg: "white" },
            { label: "Waiting in Queue", value: stats.waitingPatients, icon: Activity, color: "white", bg: "blue", gradient: true },
            { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: "purple", bg: "white" },
            { label: "Avg Treatment Time", value: `${stats.avgWaitTime}m`, icon: Clock, color: "orange", bg: "white" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
              <Card className={`border-0 shadow-lg rounded-2xl transition-all hover:-translate-y-1 ${s.gradient ? "bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-blue-500/10" : "bg-white/90 backdrop-blur-sm"}`}>
                <CardContent className="p-6">
                  <div className={`p-3 rounded-xl mb-4 w-fit ${s.gradient ? "bg-white/20" : `bg-${s.color}-50`}`}>
                    <s.icon className={`h-6 w-6 ${s.gradient ? "text-white" : `text-${s.color}-600`}`} />
                  </div>
                  <div className={`text-4xl font-bold tracking-tight mb-1 ${s.gradient ? "" : "text-slate-900"}`}>{s.value}</div>
                  <p className={`text-sm font-medium ${s.gradient ? "text-blue-100" : "text-slate-500"}`}>{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* QUEUE TAB */}
          {activeTab === "queue" && (
            <motion.div key="queue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" /> Patient Queue
                      </CardTitle>
                      <CardDescription className="text-slate-500 mt-1">Manage and prioritize your queue — emergency patients are auto-prioritized</CardDescription>
                    </div>
                    <Button onClick={callNextPatient} disabled={queue.length === 0}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 font-medium rounded-xl transition-all">
                      Call Next Patient
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="flex h-48 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                  ) : queue.length === 0 ? (
                    <div className="flex flex-col h-48 items-center justify-center text-slate-500">
                      <Activity className="h-12 w-12 mb-3 text-slate-200" />
                      <p className="font-medium">No patients in queue — you're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {queue.map((patient, index) => (
                          <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }} key={patient.id}
                            className={`group flex items-center justify-between p-5 transition-colors hover:bg-slate-50 ${
                              patient.is_emergency ? "bg-red-50/30 hover:bg-red-50/50" : index === 0 ? "bg-blue-50/30 hover:bg-blue-50/50" : "bg-white"
                            }`}>
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border ${
                                patient.is_emergency ? "bg-red-100 text-red-700 border-red-200"
                                : index === 0 ? "bg-blue-600 text-white shadow-blue-500/30 border-blue-500"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}>{patient.position}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-slate-900 text-lg tracking-tight">{patient.patient_name}</p>
                                  {patient.is_emergency && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full uppercase border border-red-200">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> Emergency
                                    </span>
                                  )}
                                  {index === 0 && !patient.is_emergency && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase border border-blue-200">Next</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                  <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">TKN: {patient.token_number}</span>
                                  <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />~{patient.estimated_wait_time}m</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1 ml-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="outline" onClick={() => movePatient(patient.id, patient.position, "up")}
                                disabled={patient.position <= 1 || patient.is_emergency} className="h-8 w-8 p-0 rounded-lg border-slate-200">
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => movePatient(patient.id, patient.position, "down")}
                                disabled={patient.position >= queue.length} className="h-8 w-8 p-0 rounded-lg border-slate-200">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === "appointments" && (
            <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" /> Appointment Schedule
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">Your upcoming and confirmed appointments</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {appointments.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                      <p className="font-medium">No upcoming appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((appt, i) => {
                        const isToday = appt.date === new Date().toISOString().split("T")[0];
                        const isPast = new Date(`${appt.date} ${appt.time_slot}`) < new Date();
                        return (
                          <motion.div key={appt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className={`p-5 rounded-xl border transition-all ${
                              isToday && !isPast ? "bg-white border-blue-200 shadow-md shadow-blue-500/5"
                              : isPast ? "bg-slate-50 border-slate-200 opacity-60"
                              : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isToday && !isPast ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                  <UserIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{appt.patient_name}</p>
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(appt.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-800 flex items-center gap-1 justify-end">
                                  <Clock className="h-4 w-4 text-slate-400" />{appt.time_slot}
                                </p>
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-md mt-1 border ${
                                  appt.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : appt.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>{appt.status}</span>
                              </div>
                            </div>
                            {isToday && !isPast && (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-blue-600">
                                <span className="relative flex h-2 w-2 mr-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Time slot locked for today
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" /> Patient History
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">Recently completed visits — total {patientHistory.length} patients served</CardDescription>
                </CardHeader>
                <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                  {patientHistory.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                      <p className="font-medium">No patient history yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {patientHistory.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm">
                              {p.patient_name?.charAt(0) || "P"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{p.patient_name}</p>
                              <p className="text-xs text-slate-500">Token #{p.token_number}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</p>
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" /> Patient Served Analytics
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">Filter by date range to view performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Filter Buttons */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {([
                      { key: "yesterday", label: "Yesterday" },
                      { key: "day_before", label: "Day Before Yesterday" },
                      { key: "last_7_days", label: "Last 7 Days" },
                      { key: "custom", label: "Custom Range" },
                    ] as const).map(f => (
                      <button key={f.key} onClick={() => setAnalyticsFilter(f.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          analyticsFilter === f.key
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {analyticsFilter === "custom" && (
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">From</label>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">To</label>
                        <input type="date" value={customRange.to} onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                      <p className="text-sm font-semibold text-slate-600 mb-2">Patients Served</p>
                      <p className="text-5xl font-black text-blue-700">{analyticsData.patientsServed}</p>
                      <p className="text-xs text-blue-500 mt-2">Completed queue visits</p>
                    </div>
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-sm font-semibold text-slate-600 mb-2">Completed Appointments</p>
                      <p className="text-5xl font-black text-emerald-700">{analyticsData.completedAppointments}</p>
                      <p className="text-xs text-emerald-500 mt-2">Fulfilled bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-purple-600" /> Calendar View
                      </CardTitle>
                      <CardDescription className="text-slate-500 mt-1">
                        {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                      <button onClick={() => setCalendarDate(new Date())}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">Today</button>
                      <button onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                      <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayAppts = calendarAppointments.filter(a => a.date === dateStr);
                      const isToday = dateStr === new Date().toISOString().split("T")[0];
                      return (
                        <div key={day} className={`min-h-[72px] p-1.5 rounded-xl border transition-all ${
                          isToday ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                        }`}>
                          <span className={`text-xs font-bold block mb-1 ${isToday ? "text-blue-700" : "text-slate-700"}`}>{day}</span>
                          {dayAppts.slice(0, 2).map(a => (
                            <div key={a.id} className="text-[10px] font-semibold bg-purple-100 text-purple-700 rounded px-1 py-0.5 mb-0.5 truncate"
                              title={`${a.patient_name} — ${a.time_slot}`}>
                              {a.time_slot} {a.patient_name.split(" ")[0]}
                            </div>
                          ))}
                          {dayAppts.length > 2 && <div className="text-[10px] text-slate-400 font-medium">+{dayAppts.length - 2} more</div>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
