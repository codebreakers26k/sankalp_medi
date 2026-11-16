"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Clock, Activity, ArrowLeft, ArrowRight, Zap, Target, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { PatientNotification } from "@/components/PatientNotification";
import { motion, AnimatePresence } from "framer-motion";
import { SunMoonThemeToggle } from "@/components/ui/sun-moon-theme-toggle";

interface ActivityItem {
  id: string;
  type: "queue_active" | "queue_completed" | "queue_cancelled" | "appointment_booked" | "appointment_rescheduled" | "appointment_cancelled";
  label: string;
  detail: string;
  time: string;
  raw_time: string;
}

interface AppointmentItem {
  id: string;
  patient_name: string;
  date: string;
  time_slot: string;
  status: string;
  hospital_id: string;
  department_id: string;
  doctor_id: string;
  hospitalName?: string;
  departmentName?: string;
  doctorName?: string;
}

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({ activeQueues: 0, upcomingAppointments: 0, completedVisits: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; appointmentId: string; newDate: string; newTime: string }>({
    open: false, appointmentId: "", newDate: "", newTime: ""
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    const userRole = user?.publicMetadata?.role as string | undefined;
    if (userRole === "admin") {
      router.replace("/admin");
      return;
    }
    if (userRole === "doctor") {
      router.replace("/doctor");
      return;
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      fetchAll();
      // Real-time subscriptions
      const queueSub = supabase.channel("dashboard-queue")
        .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => fetchAll())
        .subscribe();
      const apptSub = supabase.channel("dashboard-appt")
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAll())
        .subscribe();
      return () => { queueSub.unsubscribe(); apptSub.unsubscribe(); };
    }
  }, [isLoaded, isSignedIn, user]);

  const fetchAll = async () => {
    if (!user) return;
    setActivityLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [queueRes, apptRes] = await Promise.all([
        supabase.from("queue").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
        supabase.from("appointments").select("*").eq("patient_id", user.id).order("created_at", { ascending: false }),
      ]);

      const queueData = queueRes.data || [];
      const apptData = apptRes.data || [];

      // Stats
      setStats({
        activeQueues: queueData.filter(q => q.status === "waiting" || q.status === "in-treatment").length,
        upcomingAppointments: apptData.filter(a => (a.status === "confirmed" || a.status === "pending") && a.date >= today).length,
        completedVisits: queueData.filter(q => q.status === "completed").length,
      });

      // Recent activity items (combined + sorted)
      const actItems: ActivityItem[] = [];
      queueData.forEach(q => {
        let type: ActivityItem["type"] = "queue_active";
        let label = "Joined Queue";
        if (q.status === "completed") { type = "queue_completed"; label = "Visit Completed"; }
        else if (q.status === "cancelled") { type = "queue_cancelled"; label = "Queue Cancelled"; }
        actItems.push({ id: q.id, type, label, detail: `Token #${q.token_number} — ${q.treatment_type || "Consultation"}`, time: new Date(q.created_at).toLocaleString(), raw_time: q.created_at });
      });
      apptData.forEach(a => {
        let type: ActivityItem["type"] = "appointment_booked";
        let label = "Appointment Booked";
        if (a.status === "cancelled") { type = "appointment_cancelled"; label = "Appointment Cancelled"; }
        else if (a.status === "rescheduled") { type = "appointment_rescheduled"; label = "Appointment Rescheduled"; }
        actItems.push({ id: a.id, type, label, detail: `${a.date} at ${a.time_slot}`, time: new Date(a.created_at).toLocaleString(), raw_time: a.created_at });
      });
      actItems.sort((a, b) => new Date(b.raw_time).getTime() - new Date(a.raw_time).getTime());
      setActivity(actItems.slice(0, 15));

      // Appointments with names
      const enriched = await Promise.all(apptData.filter(a => a.status !== "cancelled").slice(0, 10).map(async (a) => {
        const [hospRes, deptRes, docRes] = await Promise.all([
          supabase.from("hospitals").select("name").eq("id", a.hospital_id).single(),
          supabase.from("departments").select("name").eq("id", a.department_id).single(),
          supabase.from("doctors").select("name").eq("id", a.doctor_id).single(),
        ]);
        return { ...a, hospitalName: hospRes.data?.name, departmentName: deptRes.data?.name, doctorName: docRes.data?.name };
      }));
      setAppointments(enriched);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const res = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      if (res.ok) fetchAll();
      else alert("Failed to cancel appointment.");
    } catch { alert("Failed to cancel appointment."); }
  };

  const rescheduleAppointment = async () => {
    if (!rescheduleModal.newDate || !rescheduleModal.newTime) { alert("Please select a new date and time."); return; }
    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: rescheduleModal.appointmentId, newDate: rescheduleModal.newDate, newTimeSlot: rescheduleModal.newTime }),
      });
      if (res.ok) { setRescheduleModal({ open: false, appointmentId: "", newDate: "", newTime: "" }); fetchAll(); }
      else alert("Failed to reschedule appointment.");
    } catch { alert("Failed to reschedule appointment."); }
  };

  const activityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "queue_active": return <Activity className="h-4 w-4 text-blue-600" />;
      case "queue_completed": return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case "queue_cancelled": return <XCircle className="h-4 w-4 text-red-500" />;
      case "appointment_booked": return <Calendar className="h-4 w-4 text-purple-600" />;
      case "appointment_rescheduled": return <RefreshCw className="h-4 w-4 text-amber-500" />;
      case "appointment_cancelled": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const userRole = user?.publicMetadata?.role as string | undefined;
  if (!isLoaded || !isSignedIn || userRole === "admin" || userRole === "doctor") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] dark:from-[#090D16] dark:via-[#0F172A] dark:to-[#0B1120] text-zinc-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-300">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#2563EB] rounded-full mix-blend-multiply filter blur-[100px] opacity-10" />
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] -right-[10%] w-[40%] h-[60%] bg-[#7C3AED] rounded-full mix-blend-multiply filter blur-[120px] opacity-10" />
      </div>

      <header className="bg-white/70 dark:bg-[#090D16]/80 backdrop-blur-xl border-b border-[#E5E7EB] dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gray-50 dark:bg-zinc-800 rounded-full group-hover:bg-blue-50 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-slate-600 dark:text-zinc-400 dark:text-zinc-300 font-medium group-hover:text-slate-900 dark:text-white dark:group-hover:text-white transition-colors">Back</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Patient Portal</h1>
            <div className="flex items-center gap-3">
              <SunMoonThemeToggle size={38} />
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-zinc-700">
                {user.firstName?.charAt(0) || "P"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Welcome back, {user.firstName || user.fullName}!</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-lg">Here's your queue and appointment overview</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Active Queues", value: stats.activeQueues, icon: Users, color: "blue", gradient: true },
            { label: "Upcoming Appointments", value: stats.upcomingAppointments, icon: Calendar, color: "emerald", gradient: false },
            { label: "Completed Visits", value: stats.completedVisits, icon: Activity, color: "purple", gradient: false },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
              <Card className={`border-0 shadow-lg rounded-2xl transition-all hover:-translate-y-1 ${s.gradient ? `bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-blue-500/10` : "bg-white/90 backdrop-blur-sm"}`}>
                <CardContent className="p-6">
                  <div className={`p-3 rounded-xl mb-4 w-fit ${s.gradient ? "bg-white/20" : `bg-${s.color}-50`}`}>
                    <s.icon className={`h-6 w-6 ${s.gradient ? "text-white" : `text-${s.color}-600`}`} />
                  </div>
                  <div className={`text-4xl font-bold tracking-tight mb-1 ${s.gradient ? "" : "text-slate-900 dark:text-white"}`}>{s.value}</div>
                  <p className={`text-sm font-medium ${s.gradient ? "text-blue-100" : "text-slate-500 dark:text-zinc-400"}`}>{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Quick Actions */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 overflow-hidden flex flex-col">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white dark:from-zinc-800/50 dark:to-zinc-900 px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-zinc-400 mt-1">Manage your hospital visits</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-4">
              <Link href="/join-queue" className="block w-full">
                <motion.div whileHover={{ scale: 1.02 }} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/40 dark:to-zinc-800 dark:border-blue-900 rounded-xl transition-all shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users className="h-5 w-5" /></div>
                    <span className="font-bold text-slate-800 dark:text-white">Join a New Queue</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </motion.div>
              </Link>
              <Link href="/book-appointment" className="block w-full">
                <motion.div whileHover={{ scale: 1.02 }} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/40 dark:to-zinc-800 dark:border-purple-900 rounded-xl transition-all shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Calendar className="h-5 w-5" /></div>
                    <span className="font-bold text-slate-800 dark:text-white">Book Appointment</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </motion.div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white dark:from-zinc-800/50 dark:to-zinc-900 px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-zinc-400 mt-1">Your latest queue and appointment history</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {activityLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-zinc-400">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-base font-medium text-slate-700 dark:text-zinc-300">No recent activity</p>
                  <p className="text-sm mt-1">Your queue entries and appointments will appear here</p>
                </div>
              ) : (
                <AnimatePresence>
                  {activity.map((item, i) => (
                    <motion.div key={item.id + item.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 px-6 py-3.5 border-b border-slate-50 hover:bg-slate-50/60 transition-colors last:border-0">
                      <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">{activityIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white text-sm">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{item.detail}</p>
                      </div>
                      <p className="text-xs text-slate-400 whitespace-nowrap">{item.time}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Appointments Section */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 overflow-hidden">
          <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white dark:from-zinc-800/50 dark:to-zinc-900 px-6 py-5 border-b border-slate-100 dark:border-zinc-800">
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              My Appointments
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-zinc-400 mt-1">Manage your upcoming appointments</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {activityLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-zinc-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-base font-medium text-slate-700 dark:text-zinc-300">No appointments found</p>
                <Link href="/book-appointment">
                  <Button className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl">Book an Appointment</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt, i) => (
                  <motion.div key={appt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 rounded-xl gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">{appt.doctorName || "Doctor"}</p>
                      <p className="text-sm text-slate-600 dark:text-zinc-400">{appt.hospitalName} · {appt.departmentName}</p>
                      <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                        <Calendar className="h-3.5 w-3.5" /> {appt.date} at {appt.time_slot}
                      </p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                        appt.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : appt.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200"
                      }`}>{appt.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 rounded-lg text-xs font-semibold"
                        onClick={() => setRescheduleModal({ open: true, appointmentId: appt.id, newDate: appt.date, newTime: appt.time_slot })}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reschedule
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg text-xs font-semibold"
                        onClick={() => { if (confirm("Cancel this appointment?")) cancelAppointment(appt.id); }}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md border border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-500" /> Reschedule Appointment
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">New Date</label>
                  <input type="date" value={rescheduleModal.newDate} min={new Date().toISOString().split("T")[0]}
                    onChange={e => setRescheduleModal(m => ({ ...m, newDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">New Time</label>
                  <input type="time" value={rescheduleModal.newTime}
                    onChange={e => setRescheduleModal(m => ({ ...m, newTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 rounded-xl border-slate-200"
                  onClick={() => setRescheduleModal({ open: false, appointmentId: "", newDate: "", newTime: "" })}>Cancel</Button>
                <Button className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  onClick={rescheduleAppointment}>Confirm Reschedule</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isSignedIn && user && <PatientNotification patientId={user.id} />}
    </div>
  );
}
