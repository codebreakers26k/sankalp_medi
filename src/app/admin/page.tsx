"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Hospital, Calendar, Activity, Settings, BarChart3, ArrowLeft, Bell, X, Stethoscope, ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

const QUEUE_OVERLOAD_THRESHOLD = 10;

export default function AdminDashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [resources, setResources] = useState({ hospitals: 0, doctors: 0, counters: 0, departments: 0 });
  const [analytics, setAnalytics] = useState({ avgWaitTime: 0, patientsServed: 0, peakTraffic: "2-4 PM", appointmentRate: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);
  const [counterModal, setCounterModal] = useState<{ open: boolean; hospital: any | null }>({ open: false, hospital: null });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    if ((user?.publicMetadata?.role as string) !== "admin") router.push("/");
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && (user?.publicMetadata?.role as string) === "admin") {
      fetchAll();
      const sub = supabase.channel("admin-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => fetchAll())
        .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, () => fetchAll())
        .subscribe();
      return () => { sub.unsubscribe(); };
    }
  }, [isLoaded, isSignedIn]);

  const fetchAll = async () => {
    try {
      const [hospRes, docRes, ctrRes, deptRes, queueRes, apptRes] = await Promise.all([
        supabase.from("hospitals").select("*").order("name"),
        supabase.from("doctors").select("*", { count: "exact", head: true }).eq("is_on_leave", false),
        supabase.from("counters").select("*, departments(name), doctors(id, name, specialization)"),
        supabase.from("departments").select("*", { count: "exact", head: true }),
        supabase.from("queue").select("*").eq("status", "waiting"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).gte("date", new Date().toISOString().split("T")[0]),
      ]);

      setResources({
        hospitals: hospRes.data?.length || 0,
        doctors: docRes.count || 0,
        counters: ctrRes.data?.length || 0,
        departments: deptRes.count || 0,
      });

      const queueData = queueRes.data || [];
      const avgWait = queueData.length > 0
        ? Math.round(queueData.reduce((s, q) => s + (q.estimated_wait_time || 0), 0) / queueData.length)
        : 0;

      setAnalytics({
        avgWaitTime: avgWait,
        patientsServed: apptRes.count || 0,
        peakTraffic: "2-4 PM",
        appointmentRate: apptRes.count || 0,
      });

      // AI: check queue overload per hospital
      const alerts: string[] = [];
      (hospRes.data || []).forEach(h => {
        const hQueue = queueData.filter(q => q.hospital_id === h.id).length;
        if (hQueue >= QUEUE_OVERLOAD_THRESHOLD) {
          alerts.push(`Queue overload at ${h.name} (${hQueue} waiting). Consider opening an additional counter.`);
        }
      });
      setAiAlerts(alerts);

      // Build hospitals with counters and queue data
      const hospitalsWithData = await Promise.all(
        (hospRes.data || []).map(async (hospital) => {
          const counters = (ctrRes.data || []).filter(c => c.hospital_id === hospital.id);
          const queueCount = queueData.filter(q => q.hospital_id === hospital.id).length;
          const depts = await supabase.from("departments").select("*").eq("hospital_id", hospital.id);
          const docs = await supabase.from("doctors").select("*", { count: "exact", head: true }).eq("hospital_id", hospital.id);
          return { ...hospital, counters, queueCount, departmentList: depts.data || [], doctorCount: docs.count || 0 };
        })
      );
      setHospitals(hospitalsWithData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn || (user?.publicMetadata?.role as string) !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#2563EB] rounded-full mix-blend-multiply filter blur-[100px] opacity-10" />
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Platform</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href="/admin/hospitals">
            <motion.div whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 hover:shadow-xl transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Manage Hospitals</p>
                  <p className="text-sm text-slate-500">Add hospitals, upload licenses &amp; compliance docs</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </motion.div>
          </Link>

          <Link href="/admin/doctors">
            <motion.div whileHover={{ scale: 1.02 }}
              className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100 hover:shadow-xl transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Stethoscope className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Manage Doctors</p>
                  <p className="text-sm text-slate-500">Register doctors, assign hospitals &amp; departments</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </motion.div>
          </Link>
        </div>

        {/* AI Alerts */}
        <AnimatePresence>
          {aiAlerts.map((alert, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800 flex-1">{alert}</p>
              <button onClick={() => setAiAlerts(a => a.filter((_, j) => j !== i))} className="text-amber-500 hover:text-amber-700">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Resource Management */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-800">Resource Management</CardTitle>
              <CardDescription className="text-slate-500">Real-time system capacity &amp; resources</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { label: "Total Hospitals", sub: "Active facilities across regions", icon: Hospital, color: "blue", value: resources.hospitals },
                  { label: "Active Doctors", sub: "Currently available practitioners", icon: Users, color: "emerald", value: resources.doctors },
                  { label: "Total Counters", sub: "Active service points", icon: Activity, color: "purple", value: resources.counters },
                  { label: "Departments", sub: "Available specializations", icon: Settings, color: "orange", value: resources.departments },
                ].map(r => (
                  <motion.div key={r.label} whileHover={{ scale: 1.01 }}
                    className={`flex items-center justify-between p-4 bg-gradient-to-r from-${r.color}-50 to-white border border-${r.color}-100 rounded-xl transition-all`}>
                    <div className="flex items-center space-x-4">
                      <div className={`p-2.5 bg-white rounded-lg shadow-sm border border-${r.color}-100`}>
                        <r.icon className={`h-6 w-6 text-${r.color}-600`} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{r.label}</p>
                        <p className="text-xs text-slate-500">{r.sub}</p>
                      </div>
                    </div>
                    <span className={`text-2xl font-bold text-${r.color}-600`}>{r.value}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operational Analytics */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-800">Operational Analytics</CardTitle>
              <CardDescription className="text-slate-500">Queue performance &amp; patient traffic</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 h-full">
                <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
                      <span className="p-1 px-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Live</span>
                    </div>
                    <p className="font-medium text-slate-600 text-sm">Avg Wait Time</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-blue-700 tracking-tight">{analytics.avgWaitTime} <span className="text-lg">m</span></span>
                    <p className="text-xs text-blue-500/80 mt-1">Across all hubs</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="h-6 w-6 text-emerald-600 mb-2" />
                      <span className="p-1 px-2 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">Today</span>
                    </div>
                    <p className="font-medium text-slate-600 text-sm">Patients Served</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-emerald-700 tracking-tight">{analytics.patientsServed}</span>
                    <p className="text-xs text-emerald-500/80 mt-1">Appointments today</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-purple-50 border border-purple-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-6 w-6 text-purple-600 mb-2" />
                    </div>
                    <p className="font-medium text-slate-600 text-sm">Peak Traffic</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-purple-700 tracking-tight">{analytics.peakTraffic}</span>
                    <p className="text-xs text-purple-500/80 mt-1">Highest load window</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-5 bg-orange-50 border border-orange-100 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="h-6 w-6 text-orange-600 mb-2" />
                    </div>
                    <p className="font-medium text-slate-600 text-sm">Appointment Rate</p>
                  </div>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-orange-700 tracking-tight">{analytics.appointmentRate}</span>
                    <p className="text-xs text-orange-500/80 mt-1">Confirmed today</p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Facility Network */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">Facility Network</h3>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 mx-auto border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-500 font-medium">Syncing facility data...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {hospitals.map((hospital, i) => (
                <motion.div key={hospital.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
                  <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 h-full flex flex-col">
                    <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <Hospital className="h-6 w-6 text-[#2563EB]" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold tracking-tight text-slate-800">{hospital.name}</CardTitle>
                            <CardDescription className="text-sm font-medium mt-0.5">{hospital.address}, {hospital.city}</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg border border-red-100">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-sm font-bold">{hospital.queueCount}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-medium">waiting</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1 flex flex-col">
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-slate-800">{hospital.counters.length}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Counters</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-slate-800">{hospital.doctorCount}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Doctors</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xl font-bold text-slate-800">{hospital.departmentList.length}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Depts</p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-sm text-slate-800">Active Counters</h4>
                          <button
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                            onClick={() => setCounterModal({ open: true, hospital })}
                          >
                            View All
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {hospital.counters.slice(0, 4).map((counter: any) => (
                            <div key={counter.id} className="flex flex-col p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
                                  {counter.counter_number}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${counter.is_active ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} />
                              </div>
                              <p className="font-semibold text-xs text-slate-900 truncate">{counter.departments?.name || "Any Dept"}</p>
                              <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{counter.doctors?.name || "No assigned Dr"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Counter Detail Modal */}
      <AnimatePresence>
        {counterModal.open && counterModal.hospital && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setCounterModal({ open: false, hospital: null })}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{counterModal.hospital.name}</h3>
                  <p className="text-sm text-slate-500">All counters — real-time status</p>
                </div>
                <button onClick={() => setCounterModal({ open: false, hospital: null })} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {counterModal.hospital.counters.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No counters found for this hospital.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {counterModal.hospital.counters.map((counter: any) => {
                      return (
                        <div key={counter.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg text-sm font-black text-blue-700">
                                {counter.counter_number}
                              </span>
                              <span className="font-bold text-slate-800">Counter {counter.counter_number}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${counter.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${counter.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {counter.is_active ? "Active" : "Inactive"}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <Settings className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-slate-600">{counter.departments?.name || "General"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span className={counter.doctors?.name ? "text-slate-800 font-medium" : "text-slate-400 italic"}>
                                {counter.doctors?.name || "No doctor assigned"}
                              </span>
                            </div>
                            {counter.doctors?.specialization && (
                              <p className="text-xs text-slate-500 ml-5">{counter.doctors.specialization}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm mt-2">
                              <Activity className="h-3.5 w-3.5 text-blue-500" />
                              <span className="text-blue-600 font-semibold">{counterModal.hospital.queueCount} in hospital queue</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
