"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Hospital,
  Calendar,
  Activity,
  Settings,
  BarChart3,
  ArrowLeft,
  Bell,
  X,
  Stethoscope,
  ChevronRight,
  Building2,
  LogOut,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  Clock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ProfileDropdown, { Account, ProfileMenuItem } from "@/components/kokonutui/profile-dropdown";
import { SunMoonThemeToggle } from "@/components/ui/sun-moon-theme-toggle";

const QUEUE_OVERLOAD_THRESHOLD = 10;

export default function AdminDashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [resources, setResources] = useState({ hospitals: 0, doctors: 0, counters: 0, departments: 0 });
  const [analytics, setAnalytics] = useState({ avgWaitTime: 0, patientsServed: 0, peakTraffic: "2-4 PM", appointmentRate: 0 });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);
  const [counterModal, setCounterModal] = useState<{ open: boolean; hospital: any | null }>({ open: false, hospital: null });

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      window.location.href = "/";
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if ((user?.publicMetadata?.role as string) !== "admin") {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && (user?.publicMetadata?.role as string) === "admin") {
      fetchAll();
      const refresh = window.setInterval(fetchAll, 15_000);
      return () => window.clearInterval(refresh);
    }
  }, [isLoaded, isSignedIn]);

  const fetchAll = async () => {
    try {
      const response = await fetch('/backend-api/admin/overview');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load admin data');
      const data = result.data;
      setResources(data.resources);
      setAnalytics(data.analytics);
      const queueData = data.queue || [];

      // AI: check queue overload per hospital
      const alerts: string[] = [];
      (data.hospitals || []).forEach((h: any) => {
        const hQueue = queueData.filter((q: any) => q.hospital_id === h.id).length;
        if (hQueue >= QUEUE_OVERLOAD_THRESHOLD) {
          alerts.push(`Queue overload at ${h.name} (${hQueue} waiting). Consider opening an additional counter.`);
        }
      });
      setAiAlerts(alerts);

      setHospitals(data.hospitals || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn || (user?.publicMetadata?.role as string) !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const adminAccount: Account = {
    id: "admin-main",
    name: user?.fullName || "System Administrator",
    email: user?.primaryEmailAddress?.emailAddress || "admin@mediqueue.org",
    initials: user?.firstName?.charAt(0) || "AD",
    plan: "Super Admin",
  };

  const adminMenuItems: ProfileMenuItem[] = [
    { label: "Admin Dashboard", icon: <BarChart3 className="size-4" />, href: "/admin" },
    { label: "Manage Facilities", icon: <Building2 className="size-4" />, href: "/admin/hospitals" },
    { label: "Doctor Roster", icon: <Stethoscope className="size-4" />, href: "/admin/doctors" },
    { label: "Security & HIPAA", icon: <ShieldCheck className="size-4" />, value: "Active" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#090D16] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* ── Top Navigation (Landing Page Inspired) ────────────────────── */}
      <header className="bg-[#FAF8F5]/90 dark:bg-[#090D16]/90 backdrop-blur-md border-b border-[#ECE5DB] dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left: Brand + Navigation Tabs */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#314E43] flex items-center justify-center text-white shadow-xs">
                  <span className="font-bold text-base leading-none">✚</span>
                </div>
                <div>
                  <span className="font-semibold text-base sm:text-lg tracking-tight text-[#1E293B] dark:text-white block leading-none">
                    MediQueue
                  </span>
                  <span className="text-[10px] font-bold text-[#6F7F77] dark:text-zinc-400 uppercase tracking-wider">
                    Admin Platform
                  </span>
                </div>
              </div>

              {/* Navigation Pills (Matching landing page pill aesthetic) */}
              <nav className="hidden md:flex items-center gap-1.5 pl-4 border-l border-[#ECE5DB] dark:border-zinc-800">
                <Link
                  href="/admin"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#D6E5DC] dark:bg-emerald-950/80 text-[#1E3B2F] dark:text-emerald-300 shadow-xs"
                >
                  Overview
                </Link>
                <Link
                  href="/admin/hospitals"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#5B6D63] dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors"
                >
                  Hospitals
                </Link>
                <Link
                  href="/admin/doctors"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#5B6D63] dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors"
                >
                  Doctors
                </Link>
              </nav>
            </div>

            {/* Right: Status Pill + SunMoonThemeToggle + KokonutUI Profile Dropdown + Logout Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle */}
              <SunMoonThemeToggle size={38} />

              {/* System status pill */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8EFEA] dark:bg-emerald-950/60 border border-[#D6E5DC] dark:border-emerald-800 text-xs font-medium text-[#2D5A46] dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Operational</span>
              </div>

              {/* KokonutUI Profile Dropdown for Admin */}
              <div className="hidden sm:block">
                <ProfileDropdown
                  accounts={[adminAccount]}
                  items={adminMenuItems}
                  onSignOut={handleSignOut}
                />
              </div>

              {/* Explicit Logout Button (Landing page inspired) */}
              <button
                onClick={handleSignOut}
                title="Sign out of admin portal"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 shadow-xs hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-400 hover:border-red-200 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Admin Navigation Bar */}
        <div className="md:hidden border-t border-[#ECE5DB] dark:border-zinc-800 bg-[#FAF8F5]/90 dark:bg-[#090D16]/90 px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/admin"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#D6E5DC] dark:bg-emerald-950/80 text-[#1E3B2F] dark:text-emerald-300 shadow-xs shrink-0"
          >
            Overview
          </Link>
          <Link
            href="/admin/hospitals"
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#5B6D63] dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            Hospitals
          </Link>
          <Link
            href="/admin/doctors"
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#5B6D63] dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            Doctors
          </Link>
        </div>
      </header>

      {/* ── Main Dashboard Body ───────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Header */}
        <div className="mb-8">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-1">
            Administration Portal
          </span>
          <h1 className="text-3xl font-serif text-[#13221C] tracking-tight">
            System Overview &amp; Control
          </h1>
          <p className="text-sm text-[#5B6D63] mt-1">
            Real-time hospital network capacity, doctor rosters, and automated queue telemetry.
          </p>
        </div>

        {/* Quick Action Navigation Cards (Styled like landing page services cards) */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href="/admin/hospitals">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center justify-between p-6 bg-white/90 rounded-2xl border border-[#ECE5DB] shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#E8EFEA] rounded-2xl flex items-center justify-center text-[#2D5A46] group-hover:scale-105 transition-transform">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-serif font-bold text-base text-[#13221C]">Manage Hospitals</p>
                  <p className="text-xs text-[#6F7F77] mt-0.5">Add hospitals, upload licenses &amp; compliance docs</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-[#2D5A46] transition-colors" />
            </motion.div>
          </Link>

          <Link href="/admin/doctors">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="flex items-center justify-between p-6 bg-white/90 rounded-2xl border border-[#ECE5DB] shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#EFF6FF] rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-serif font-bold text-base text-[#13221C]">Manage Doctors</p>
                  <p className="text-xs text-[#6F7F77] mt-0.5">Register doctors, assign hospitals &amp; departments</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            </motion.div>
          </Link>
        </div>

        {/* AI Alerts Banner */}
        <AnimatePresence>
          {aiAlerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl shadow-xs"
            >
              <Bell className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-amber-900 flex-1">{alert}</p>
              <button
                onClick={() => setAiAlerts(a => a.filter((_, j) => j !== i))}
                className="text-amber-500 hover:text-amber-700"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Grid: Resource Management & Operational Analytics */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Resource Management */}
          <Card className="border border-[#ECE5DB] shadow-xs rounded-2xl bg-white/95 overflow-hidden">
            <CardHeader className="bg-[#FAF8F5] px-6 py-4 border-b border-[#ECE5DB]">
              <CardTitle className="font-serif text-lg font-bold text-[#13221C]">
                Resource Management
              </CardTitle>
              <CardDescription className="text-xs text-[#6F7F77]">
                Real-time network capacity &amp; registered resources
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3.5">
                {[
                  { label: "Total Hospitals", sub: "Active facilities across network", icon: Hospital, value: resources.hospitals, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Active Doctors", sub: "Available practitioners on duty", icon: Users, value: resources.doctors, color: "text-emerald-700", bg: "bg-[#E8EFEA]" },
                  { label: "Total Counters", sub: "Active outpatient service points", icon: Activity, value: resources.counters, color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Departments", sub: "Clinical specializations registered", icon: Settings, value: resources.departments, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(r => (
                  <motion.div
                    key={r.label}
                    whileHover={{ scale: 1.008 }}
                    className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#ECE5DB] rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 ${r.bg} rounded-xl shadow-xs border border-black/5`}>
                        <r.icon className={`h-5 w-5 ${r.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-[#13221C]">{r.label}</p>
                        <p className="text-[11px] text-[#6F7F77]">{r.sub}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold font-serif text-[#13221C]">{r.value}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operational Analytics */}
          <Card className="border border-[#ECE5DB] shadow-xs rounded-2xl bg-white/95 overflow-hidden">
            <CardHeader className="bg-[#FAF8F5] px-6 py-4 border-b border-[#ECE5DB]">
              <CardTitle className="font-serif text-lg font-bold text-[#13221C]">
                Operational Telemetry
              </CardTitle>
              <CardDescription className="text-xs text-[#6F7F77]">
                Live queue performance &amp; patient volume
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3.5 h-full">
                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="p-4 bg-[#FAF8F5] border border-[#ECE5DB] rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                        Live
                      </span>
                    </div>
                    <p className="font-medium text-[#6F7F77] text-xs">Avg Wait Time</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-serif font-bold text-[#13221C]">
                      {analytics.avgWaitTime} <span className="text-sm font-sans text-zinc-500">min</span>
                    </span>
                    <p className="text-[11px] text-[#6F7F77] mt-0.5">Across all facilities</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="p-4 bg-[#E8EFEA]/70 border border-[#D6E5DC] rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="h-5 w-5 text-[#2D5A46]" />
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Today
                      </span>
                    </div>
                    <p className="font-medium text-[#2D5A46] text-xs">Patients Served</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-serif font-bold text-[#13221C]">
                      {analytics.patientsServed}
                    </span>
                    <p className="text-[11px] text-[#2D5A46]/80 mt-0.5">Appointments today</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="p-4 bg-[#FAF8F5] border border-[#ECE5DB] rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="font-medium text-[#6F7F77] text-xs">Peak Traffic</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-serif font-bold text-[#13221C]">
                      {analytics.peakTraffic}
                    </span>
                    <p className="text-[11px] text-[#6F7F77] mt-0.5">Highest load window</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.015 }}
                  className="p-4 bg-[#FAF8F5] border border-[#ECE5DB] rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <p className="font-medium text-[#6F7F77] text-xs">Appointments</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-serif font-bold text-[#13221C]">
                      {analytics.appointmentRate}
                    </span>
                    <p className="text-[11px] text-[#6F7F77] mt-0.5">Confirmed today</p>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Facility Network Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-serif text-[#13221C]">Facility Network</h3>
              <p className="text-xs text-[#6F7F77] mt-0.5">Connected hospitals, queue counters, and capacity</p>
            </div>
            <Link
              href="/admin/hospitals"
              className="text-xs font-semibold text-[#1F2D3D] hover:text-[#2D5A46] transition-colors"
            >
              Configure Hubs →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 mx-auto border-b-2 border-blue-600"></div>
              <p className="mt-3 text-xs text-zinc-500 font-medium">Syncing facility data...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {hospitals.map((hospital, i) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="border border-[#ECE5DB] shadow-xs rounded-2xl bg-white/95 h-full flex flex-col overflow-hidden">
                    <CardHeader className="bg-[#FAF8F5] pb-4 border-b border-[#ECE5DB]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 bg-white rounded-xl shadow-xs border border-[#ECE5DB] flex items-center justify-center">
                            <Hospital className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="font-serif text-base font-bold text-[#13221C]">
                              {hospital.name}
                            </CardTitle>
                            <CardDescription className="text-xs text-[#6F7F77] mt-0.5">
                              {hospital.address}, {hospital.city}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span>{hospital.queueCount} waiting</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-5 flex-1 flex flex-col">
                      <div className="grid grid-cols-3 gap-2.5 mb-5">
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#ECE5DB] text-center">
                          <p className="text-lg font-bold font-serif text-[#13221C]">{hospital.counters.length}</p>
                          <p className="text-[10px] font-semibold text-[#6F7F77] uppercase tracking-wider mt-0.5">Counters</p>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#ECE5DB] text-center">
                          <p className="text-lg font-bold font-serif text-[#13221C]">{hospital.doctorCount}</p>
                          <p className="text-[10px] font-semibold text-[#6F7F77] uppercase tracking-wider mt-0.5">Doctors</p>
                        </div>
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#ECE5DB] text-center">
                          <p className="text-lg font-bold font-serif text-[#13221C]">{hospital.departmentList.length}</p>
                          <p className="text-[10px] font-semibold text-[#6F7F77] uppercase tracking-wider mt-0.5">Depts</p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="font-bold text-xs text-[#13221C]">Active Counters</h4>
                          <button
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                            onClick={() => setCounterModal({ open: true, hospital })}
                          >
                            View All →
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {hospital.counters.slice(0, 4).map((counter: any) => (
                            <div
                              key={counter.id}
                              className="flex flex-col p-2.5 bg-[#FAF8F5] border border-[#ECE5DB] rounded-xl"
                            >
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-[10px] font-bold text-zinc-700">
                                  #{counter.counter_number}
                                </span>
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    counter.is_active ? "bg-emerald-500 shadow-xs" : "bg-zinc-300"
                                  }`}
                                />
                              </div>
                              <p className="font-semibold text-xs text-[#13221C] truncate">
                                {counter.departments?.name || "General"}
                              </p>
                              <p className="text-[10px] text-[#6F7F77] truncate mt-0.5">
                                {counter.doctors?.name || "No assigned Dr"}
                              </p>
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

      {/* ── Counter Detail Modal (Matching Landing Page Palette) ──────── */}
      <AnimatePresence>
        {counterModal.open && counterModal.hospital && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setCounterModal({ open: false, hospital: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-[#ECE5DB]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECE5DB] bg-[#FAF8F5]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#13221C]">
                    {counterModal.hospital.name}
                  </h3>
                  <p className="text-xs text-[#6F7F77]">Counters telemetry &amp; live queue status</p>
                </div>
                <button
                  onClick={() => setCounterModal({ open: false, hospital: null })}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {counterModal.hospital.counters.length === 0 ? (
                  <p className="text-center text-zinc-400 py-8 text-xs">No counters found for this hospital.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {counterModal.hospital.counters.map((counter: any) => (
                      <div
                        key={counter.id}
                        className="p-4 border border-[#ECE5DB] rounded-xl bg-[#FAF8F5]"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 rounded-lg text-xs font-bold text-blue-700">
                              {counter.counter_number}
                            </span>
                            <span className="font-bold text-xs text-[#13221C]">Counter {counter.counter_number}</span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              counter.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${counter.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                            {counter.is_active ? "Active" : "Inactive"}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-[#6F7F77]">
                            <Settings className="h-3 w-3" />
                            <span>{counter.departments?.name || "General Outpatient"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-[#6F7F77]" />
                            <span className={counter.doctors?.name ? "text-[#13221C] font-medium" : "text-zinc-400 italic"}>
                              {counter.doctors?.name || "No doctor assigned"}
                            </span>
                          </div>
                          {counter.doctors?.specialization && (
                            <p className="text-[10px] text-[#6F7F77] ml-5">{counter.doctors.specialization}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1 text-blue-600 font-semibold text-[11px]">
                            <Activity className="h-3 w-3" />
                            <span>{counterModal.hospital.queueCount} in hospital queue</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
