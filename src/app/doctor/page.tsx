"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  Activity,
  Clock,
  LogOut,
  Stethoscope,
  QrCode,
  Quote,
  Sparkles,
  ShieldCheck,
  RotateCw,
  ArrowRight,
  CalendarDays,
  BarChart3,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── KokonutUI Components ──────────────────────────────────────────────────────
import CardFlip, { QR_SIZE, buildQrPath } from "@/components/kokonutui/card-flip";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import { useTheme } from "@/components/theme-provider";
import ThemePullCord from "@/components/theme-pull-cord";

// ── Medical Quotes ────────────────────────────────────────────────────────────
const MEDICAL_QUOTES = [
  {
    quote: "Wherever the art of Medicine is loved, there is also a love of Humanity.",
    author: "Hippocrates",
    role: "Father of Modern Medicine",
  },
  {
    quote: "The good physician treats the disease; the great physician treats the patient who has the disease.",
    author: "Sir William Osler",
    role: "Founding Physician, Johns Hopkins",
  },
  {
    quote: "To cure sometimes, to relieve often, to comfort always.",
    author: "Edward Livingston Trudeau",
    role: "Pioneer in Public Health",
  },
  {
    quote: "In nothing do men more nearly approach the gods than in giving health to men.",
    author: "Cicero",
    role: "Philosopher & Statesman",
  },
];

// ── Doctor Flip Card: Front (Physician ID) & Back (Turnstile QR) ──────────────
function DoctorCardFront({ doctor, user }: { doctor: any; user: any }) {
  const { isDark } = useTheme();
  const name = doctor?.name || user?.fullName || "Dr. Marcus Vance, MD";
  const specialty = doctor?.specialization || "Cardiovascular Surgery & Medicine";
  const qualification = doctor?.qualification || "MBBS, MD (Harvard), FACS";
  const experience = doctor?.experience ? `${doctor.experience}+ yrs` : "15+ yrs";
  const photo =
    doctor?.photo_url ||
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400";

  return (
    <div
      className={`flex h-full flex-col justify-between p-6 select-none transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#314E43] flex items-center justify-center text-white text-xs font-bold shadow-xs">
            ✚
          </div>
          <div>
            <span
              className={`font-bold text-[11px] uppercase tracking-wider block leading-none ${
                isDark ? "text-zinc-200" : "text-zinc-800"
              }`}
            >
              Staff Pass
            </span>
            <span className="text-[9px] text-zinc-400 font-mono">#DOC-0482</span>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 font-bold text-[9px] border flex items-center gap-1 ${
            isDark
              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Attending On-Duty
        </span>
      </div>

      <div className="flex items-center gap-4 my-3">
        <div
          className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 shadow-sm ${
            isDark
              ? "bg-zinc-800 border-zinc-700"
              : "bg-zinc-100 border-zinc-200"
          }`}
        >
          <img src={photo} alt={name} className="w-full h-full object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
            Senior Consultant
          </span>
          <h3
            className={`font-serif font-bold text-lg truncate ${
              isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {name}
          </h3>
          <p
            className={`text-xs font-medium truncate ${
              isDark ? "text-zinc-300" : "text-zinc-600"
            }`}
          >
            {specialty}
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{qualification}</p>
        </div>
      </div>

      <div
        className={`grid grid-cols-3 gap-2 text-center py-2.5 px-3 rounded-2xl border ${
          isDark
            ? "bg-zinc-800/80 border-zinc-700 text-zinc-200"
            : "bg-zinc-50 border-zinc-100 text-zinc-800"
        }`}
      >
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">OPD Room</span>
          <span className="font-bold text-xs">Room 204</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Department</span>
          <span className="font-bold text-xs">Cardiology</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Experience</span>
          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{experience}</span>
        </div>
      </div>

      <div
        className={`flex items-center justify-between text-[11px] pt-1 border-t border-dashed ${
          isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-500"
        }`}
      >
        <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
          <QrCode className="w-3.5 h-3.5" />
          Tap to Flip for Turnstile QR →
        </span>
        <span className="font-mono text-zinc-400 text-[10px]">Gate 1 · Floor 2</span>
      </div>
    </div>
  );
}

function DoctorCardBack({ doctor, user }: { doctor: any; user: any }) {
  const DOCTOR_QR = buildQrPath(QR_SIZE, 9821);

  return (
    <div className="flex h-full flex-col justify-between p-6 bg-zinc-950 text-white select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-medium text-[10px] text-zinc-400 uppercase tracking-[0.14em]">
            Hospital Entry Pass
          </span>
        </div>
        <span className="font-mono text-xs text-blue-400 font-semibold">
          #DOC-0482
        </span>
      </div>

      <div className="mx-auto my-auto flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3.5 shadow-2xl ring-4 ring-white/10">
          <svg
            aria-label="Doctor Entrance QR Code"
            className="block h-32 w-32 sm:h-36 sm:w-36"
            role="img"
            shapeRendering="crispEdges"
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
          >
            <path d={DOCTOR_QR} fill="#09090b" />
          </svg>
        </div>
        <p className="mt-2.5 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
          Scan at Doctor Entrance &amp; Turnstile
        </p>
      </div>

      <dl className="grid grid-cols-4 gap-1 text-center py-2.5 border-t border-zinc-800 text-[10px]">
        <div>
          <dt className="text-zinc-500 uppercase">Clearance</dt>
          <dd className="font-bold text-emerald-400">Level 4</dd>
        </div>
        <div>
          <dt className="text-zinc-500 uppercase">Gate</dt>
          <dd className="font-bold text-zinc-200">Staff 1</dd>
        </div>
        <div>
          <dt className="text-zinc-500 uppercase">Shift</dt>
          <dd className="font-bold text-zinc-200">Full OPD</dd>
        </div>
        <div>
          <dt className="text-zinc-500 uppercase">Biometric</dt>
          <dd className="font-bold text-blue-400">Synced</dd>
        </div>
      </dl>

      <p className="text-[10px] text-zinc-400 text-center leading-snug">
        Hold QR against the scanner at the turnstile gate for contactless entry and instant OPD clock-in.
      </p>
    </div>
  );
}

// ── Main Doctor Portal Landing Page ───────────────────────────────────────────
export default function DoctorLandingPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { isDark } = useTheme();

  // State
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isPassFlipped, setIsPassFlipped] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [stats, setStats] = useState({
    waitingQueue: 0,
    todayAppointments: 0,
    patientsServed: 0,
  });

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      window.location.href = "/" ;
    }
  };

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
      fetchDoctorSummary();
    }
  }, [isLoaded, isSignedIn, user]);

  const fetchDoctorSummary = async () => {
    try {
      const response = await fetch("/backend-api/doctor/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const { data } = await response.json();
      setDoctorInfo(data.doctor);

      setStats({
        waitingQueue: data.metrics?.waiting || 0,
        todayAppointments: data.appointments?.length || 0,
        patientsServed: data.metrics?.completedToday || 0,
      });
    } catch (err) {
      console.error("Error loading doctor summary:", err);
    }
  };

  const workspaceLinks = [
    {
      title: "Live OPD Queue",
      desc: "Manage real-time queue tokens, emergency priorities, and call the next waiting patient.",
      href: "/doctor/queue",
      badge: `${stats.waitingQueue} Waiting`,
      badgeColor: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      icon: Activity,
      action: "Open Queue",
    },
    {
      title: "Scheduled Appointments",
      desc: "Review daily patient consultations, confirmed time slots, and upcoming visits.",
      href: "/doctor/appointments",
      badge: `${stats.todayAppointments} Today`,
      badgeColor: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      icon: Calendar,
      action: "View Schedule",
    },
    {
      title: "Patient Consultation History",
      desc: "Audit past visits, completed treatments, diagnosis notes, and patient records.",
      href: "/doctor/history",
      badge: `${stats.patientsServed} Completed`,
      badgeColor: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      icon: FileText,
      action: "Browse History",
    },
    {
      title: "Performance & Analytics",
      desc: "Track patient throughput, average consultation duration, and monthly efficiency.",
      href: "/doctor/analytics",
      badge: "Reports",
      badgeColor: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      icon: BarChart3,
      action: "Inspect Metrics",
    },
    {
      title: "Duty Calendar & Shifts",
      desc: "Monthly duty roster, OPD session timings, and department shift allocation.",
      href: "/doctor/calendar",
      badge: "Roster",
      badgeColor: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      icon: CalendarDays,
      action: "Open Calendar",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#090D16] text-zinc-900 dark:text-zinc-100 transition-colors duration-300 relative">
      {/* ── KokonutUI PullCord: Hanging on Doctor Landing Page Only ── */}
      <ThemePullCord fixed={true} />

      {/* ── Navigation Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF8F5]/90 dark:bg-[#090D16]/90 border-b border-[#ECE5DB] dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 pr-12 sm:pr-20">
            {/* Left Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#314E43] flex items-center justify-center text-white shadow-xs">
                <span className="font-bold text-base leading-none">✚</span>
              </div>
              <div>
                <span className="font-semibold text-base sm:text-lg tracking-tight block leading-none text-[#1E293B] dark:text-white">
                  Doctor Portal
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F7F77] dark:text-zinc-400">
                  Physician Suite · OPD Room 204
                </span>
              </div>
            </div>

            {/* Center Quick Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <Link href="/doctor/queue" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                Live Queue
              </Link>
              <Link href="/doctor/appointments" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                Appointments
              </Link>
              <Link href="/doctor/history" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                History
              </Link>
              <Link href="/doctor/analytics" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                Analytics
              </Link>
              <Link href="/doctor/calendar" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                Calendar
              </Link>
            </nav>

            {/* Right: Duty Pill + Profile + Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-[#E8EFEA] dark:bg-emerald-950/40 border-[#D6E5DC] dark:border-emerald-800 text-[#2D5A46] dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Duty Active</span>
              </div>

              <ProfileDropdown
                accounts={[
                  {
                    id: "doctor",
                    name: doctorInfo?.name || user?.fullName || "Dr. Marcus Vance",
                    email: user?.primaryEmailAddress?.emailAddress || "doctor@mediqueue.org",
                    plan: "Attending Physician",
                  },
                ]}
                onSignOut={handleSignOut}
              />

              <button
                onClick={handleSignOut}
                title="Sign out of doctor portal"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700 dark:hover:text-red-400 hover:border-red-200 transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Landing Content ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome Headline */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-2">
            Physician Suite &amp; Clinical Command
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif tracking-tight text-[#13221C] dark:text-white">
            Welcome, {doctorInfo?.name || "Doctor"}
          </h1>
          <p className="text-sm sm:text-base mt-2 text-[#5B6D63] dark:text-zinc-400">
            Intelligent patient flow management, official hospital turnstile QR access pass, and ethical medical care.
          </p>
        </div>

        {/* ── Section 1: Inspirational Medical Quotes ─────────────────── */}
        <div className="mb-14 max-w-4xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-10 border bg-white/90 dark:bg-zinc-900/90 border-[#ECE5DB] dark:border-zinc-800 shadow-xs relative overflow-hidden transition-all">
            <div className="flex items-center justify-between mb-6">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                Medical Ethos &amp; Inspiration
              </span>
              <span className="text-xs px-3 py-1 rounded-full font-semibold border bg-[#E8EFEA] dark:bg-zinc-800 border-[#D6E5DC] dark:border-zinc-700 text-[#2D5A46] dark:text-zinc-300">
                Quote {quoteIndex + 1} of {MEDICAL_QUOTES.length}
              </span>
            </div>

            <Quote className="w-10 h-10 mb-4 opacity-25 text-[#314E43] dark:text-blue-400" />

            <AnimatePresence mode="wait">
              <motion.div
                key={quoteIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <blockquote className="font-serif text-xl sm:text-2xl leading-relaxed italic text-[#13221C] dark:text-zinc-100 mb-5">
                  "{MEDICAL_QUOTES[quoteIndex].quote}"
                </blockquote>
                <div>
                  <p className="font-bold text-base text-zinc-900 dark:text-white">
                    — {MEDICAL_QUOTES[quoteIndex].author}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {MEDICAL_QUOTES[quoteIndex].role}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Quote navigation pills */}
            <div className="flex items-center gap-2 mt-6">
              {MEDICAL_QUOTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setQuoteIndex(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    quoteIndex === i
                      ? "w-8 bg-[#2D5A46] dark:bg-blue-500"
                      : "w-2.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  }`}
                  aria-label={`Go to quote ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Clinical Workspace Navigation Portals ────────── */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
                Workspace Portals
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#13221C] dark:text-white">
                Clinical Modules
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Select a module to manage patients
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaceLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group p-6 rounded-3xl border bg-white dark:bg-zinc-900/90 border-[#ECE5DB] dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-[#314E43] dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>{item.action}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: BOTTOM FLIP CARD (Physician Photo & Hospital Entry QR) ── */}
        <section className="pt-6 pb-12 border-t border-[#ECE5DB] dark:border-zinc-800">
          <div className="max-w-xl mx-auto text-center mb-8">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
              Digital Credential &amp; Gate Access
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#13221C] dark:text-white">
              Official Physician Entry Pass
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Click or tap the card below to flip between your verified Physician ID profile and your contactless Hospital Turnstile QR Code.
            </p>
          </div>

          <div className="flex flex-col items-center">
            {/* Interactive Flip Card Container */}
            <div className="relative">
              <CardFlip
                flipped={isPassFlipped}
                onFlippedChange={setIsPassFlipped}
                front={<DoctorCardFront doctor={doctorInfo} user={user} />}
                back={<DoctorCardBack doctor={doctorInfo} user={user} />}
                label="Doctor Hospital Access Credential"
                className="w-[300px] sm:w-[340px] aspect-[7/10]"
                faceClassName="rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
              />
            </div>

            {/* Flip toggle button below card */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={() => setIsPassFlipped(!isPassFlipped)}
                className="px-5 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-[#ECE5DB] dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-2 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                <span>{isPassFlipped ? "Flip to Physician Profile" : "Flip to Turnstile QR Code"}</span>
              </button>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
                Valid for automatic turnstile gate check-in at AIIMS Central OPD Gate 1
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
