"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Hospital,
  Calendar,
  Users,
  Shield,
  ArrowRight,
  QrCode,
  Activity,
  Clock,
  Zap,
  CheckCircle,
  Star,
  HeartPulse,
  Stethoscope,
  LayoutDashboard,
  ChevronRight,
  Brain,
  Scan,
  Bell,
  FileText,
  Award,
  ShieldCheck,
  PhoneCall,
  Sparkles,
  MapPin,
  Check,
  RotateCw,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";

// ── KokonutUI Components ──────────────────────────────────────────────────────
import SplitFlapText from "@/components/kokonutui/split-flap-text";
import CradleText from "@/components/kokonutui/cradle-text";
import { MarkerText, Mark } from "@/components/kokonutui/marker-text";
import CardFlip, { QR_SIZE, buildQrPath } from "@/components/kokonutui/card-flip";
import ProfileDropdown, { Account, ProfileMenuItem } from "@/components/kokonutui/profile-dropdown";
import SlotPicker from "@/components/kokonutui/slot-picker";
import FileUpload from "@/components/kokonutui/file-upload";
import AIMessageQueue from "@/components/kokonutui/ai-message-queue";
import AIAttachment from "@/components/kokonutui/ai-attachment";
import { useTheme } from "@/components/theme-provider";
import { SunMoonThemeToggle } from "@/components/ui/sun-moon-theme-toggle";

// ── Animation Helpers ─────────────────────────────────────────────────────────
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: EXPO },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: EXPO },
  },
};

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const totalSteps = duration / step;
    const increment = target / totalSteps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Number(start.toFixed(target % 1 === 0 ? 0 : 1)));
      }
    }, step);

    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// ── Demo Medical Pass Front & Back for CardFlip ──────────────────────────────
const DEMO_QR = buildQrPath(QR_SIZE, 54321);

function MedicalPassFront() {
  const { isDark } = useTheme();
  return (
    <div className={`flex h-full flex-col justify-between p-5 select-none ${isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-[#314E43] flex items-center justify-center text-white text-xs font-bold">
            ✚
          </div>
          <span className={`font-semibold text-[10px] uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
            MediQueue Pass
          </span>
        </div>
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 font-bold text-[9px] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          ● Ready to Scan
        </span>
      </div>

      <div className="my-auto text-center py-2">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
          Your Queue Token
        </span>
        <div className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
          #A-42
        </div>
        <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          OPD Counter 3 · Dr. Sarah Jenkins
        </p>
      </div>

      <div className={`grid grid-cols-3 gap-1 text-center py-2 rounded-xl border ${isDark ? "bg-zinc-800/80 border-zinc-700" : "bg-zinc-50 border-zinc-100"}`}>
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Est. Wait</span>
          <span className="font-bold text-xs text-emerald-600">~12 min</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Ahead</span>
          <span className={`font-bold text-xs ${isDark ? "text-white" : "text-zinc-800"}`}>3 patients</span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">Room</span>
          <span className={`font-bold text-xs ${isDark ? "text-white" : "text-zinc-800"}`}>OPD 204</span>
        </div>
      </div>

      <div className="-mx-5 my-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 relative">
        <div className={`absolute -left-2 -top-2 w-4 h-4 rounded-full border-r ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`} />
        <div className={`absolute -right-2 -top-2 w-4 h-4 rounded-full border-l ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
        <span className="flex items-center gap-1 font-semibold text-blue-600">
          <QrCode className="w-3.5 h-3.5" />
          Flip for Kiosk QR →
        </span>
        <span className="font-mono text-zinc-400 text-[10px]">Tap to flip</span>
      </div>
    </div>
  );
}

function MedicalPassBack() {
  return (
    <div className="flex h-full flex-col justify-between p-5 bg-zinc-950 text-white select-none">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[10px] text-zinc-400 uppercase tracking-[0.14em]">
          Check-in QR Code
        </span>
        <span className="font-mono text-xs text-blue-400 font-semibold">
          #A-42
        </span>
      </div>

      <div className="mx-auto my-auto flex flex-col items-center">
        <div className="rounded-2xl bg-white p-3 shadow-2xl ring-2 ring-white/10">
          <svg
            aria-label="Patient Check-in QR Code"
            className="block h-28 w-28 sm:h-32 sm:w-32"
            role="img"
            shapeRendering="crispEdges"
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
          >
            <path d={DEMO_QR} fill="#09090b" />
          </svg>
        </div>
        <p className="mt-2 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
          Hold against kiosk scanner
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-1 text-center py-2 border-t border-zinc-800 text-[10px]">
        <div>
          <dt className="text-zinc-500 uppercase">Token</dt>
          <dd className="font-bold text-zinc-200">A-42</dd>
        </div>
        <div>
          <dt className="text-zinc-500 uppercase">Gate</dt>
          <dd className="font-bold text-zinc-200">OPD 3</dd>
        </div>
        <div>
          <dt className="text-zinc-500 uppercase">SMS Alert</dt>
          <dd className="font-bold text-emerald-400">Active</dd>
        </div>
      </dl>

      <p className="text-[10px] text-zinc-400 text-center leading-snug">
        Scan at clinic turnstile or waiting kiosk to activate your live buzzer.
      </p>
    </div>
  );
}

// ── Doctor Accounts & Menu Items for KokonutUI ProfileDropdown ───────────────
const DOCTOR_ACCOUNTS: Account[] = [
  {
    id: "doc-1",
    name: "Dr. Sarah Jenkins",
    email: "s.jenkins@mediqueue.org",
    initials: "SJ",
    plan: "Chief Cardiologist",
  },
  {
    id: "doc-2",
    name: "Dr. Marcus Vance",
    email: "m.vance@mediqueue.org",
    initials: "MV",
    plan: "Senior Neurologist",
  },
];

const DOCTOR_MENU_ITEMS: ProfileMenuItem[] = [
  {
    label: "View Qualifications",
    icon: <Award className="w-4 h-4" />,
    onSelect: () => alert("Dr. Sarah Jenkins, MD, FACC (Harvard Medical School, 15+ years)"),
  },
  {
    label: "Clinic Consultation Hours",
    icon: <Clock className="w-4 h-4" />,
    value: "9am - 5pm",
    onSelect: () => alert("Mon - Fri: 09:00 AM - 05:00 PM (OPD Room 204)"),
  },
  {
    label: "Medical Credentials",
    icon: <ShieldCheck className="w-4 h-4" />,
    value: "Verified",
    onSelect: () => alert("Verified by American Board of Medical Specialties #84920"),
  },
];

const DOCTORS = [
  {
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiology",
    exp: "15+ yrs",
    rating: "4.9",
    slots: "Next: Today 4:30 PM",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Dr. Marcus Vance",
    specialty: "Neurology",
    exp: "12+ yrs",
    rating: "4.9",
    slots: "Next: Tomorrow 10:00 AM",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Dr. Elena Rostova",
    specialty: "Pediatrics",
    exp: "10+ yrs",
    rating: "5.0",
    slots: "Next: Today 6:00 PM",
    image: "https://images.unsplash.com/photo-1594824813637-2354c41461ff?auto=format&fit=crop&q=80&w=400",
  },
];

// ── Main Page Component ───────────────────────────────────────────────────────
export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { isDark } = useTheme();
  const role = user?.publicMetadata?.role as string | undefined;
  const [scrolled, setScrolled] = useState(false);
  const [activeDept, setActiveDept] = useState("Primary Care");
  const [isPassFlipped, setIsPassFlipped] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Redirect admin and doctor away from landing page
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const userRole = user?.publicMetadata?.role as string | undefined;
    if (userRole === "admin") {
      router.replace("/admin");
    } else if (userRole === "doctor") {
      router.replace("/doctor");
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || (isSignedIn && (role === "admin" || role === "doctor"))) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#090D16]" : "bg-[#FAF8F5]"}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#2563EB" }}
        />
      </div>
    );
  }

  const DEPARTMENTS = [
    { name: "Primary Care", icon: HeartPulse },
    { name: "Women's Health", icon: Users },
    { name: "Pediatrics", icon: Activity },
    { name: "Cardiology", icon: Stethoscope },
    { name: "Dermatology", icon: Brain },
  ];

  const getDashboardLink = () => {
    if (role === "admin") return "/admin";
    if (role === "doctor") return "/doctor";
    return "/dashboard";
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? "bg-[#090D16] text-zinc-100" : "bg-[#FAF8F5] text-zinc-900"
      } overflow-x-hidden font-sans transition-colors duration-300 relative`}
    >
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? isDark
              ? "bg-[#090D16]/95 border-b border-zinc-800 backdrop-blur-md"
              : "bg-[#FAF8F5]/95 border-b border-[#EBE5DC] backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo matching inspiration: Medical cross icon + "medical logo" */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#314E43] flex items-center justify-center text-white shadow-xs">
              <span className="font-bold text-base leading-none">✚</span>
            </div>
            <span
              className={`font-semibold text-lg tracking-tight ${
                isDark ? "text-white" : "text-[#1E293B]"
              }`}
            >
              Medical Logo
            </span>
          </Link>

          {/* Nav links matching inspiration */}
          <nav className="hidden md:flex items-center gap-7">
            {["Doctors", "Services", "About", "Reviews"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={`text-sm font-medium transition-colors ${
                  isDark
                    ? "text-zinc-400 hover:text-white"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {item}
              </a>
            ))}
            <a
              href="#contact"
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isDark
                  ? "text-zinc-400 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />
              Contact
            </a>
          </nav>

          {/* Action buttons + SunMoonThemeToggle + KokonutUI ProfileDropdown + Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SunMoonThemeToggle size={36} />
            {isSignedIn ? (
              <>
                <Link
                  href={getDashboardLink()}
                  className={`hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors mr-1 ${
                    isDark
                      ? "text-zinc-300 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-zinc-500" />
                  Dashboard
                </Link>
                {/* KokonutUI ProfileDropdown for authenticated user */}
                <ProfileDropdown
                  accounts={[
                    {
                      id: "current-user",
                      name: user?.fullName || "Patient Account",
                      email: user?.primaryEmailAddress?.emailAddress || "patient@mediqueue.org",
                      plan: role === "admin" ? "Admin" : role === "doctor" ? "Doctor" : "Patient Pass",
                    },
                  ]}
                  onSignOut={async () => {
                    try {
                      await signOut({ redirectUrl: "/" });
                    } catch {
                      router.push("/");
                    }
                  }}
                />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className={`hidden sm:inline-block text-sm font-medium transition-colors px-3 py-2 ${
                    isDark
                      ? "text-zinc-300 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-950"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/book-appointment"
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 hover:scale-[1.02] whitespace-nowrap"
                  style={{ background: "#1F2D3D" }}
                >
                  Book Appointment
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200/60 text-zinc-700"
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-b px-4 py-4 space-y-3 transition-colors ${
                isDark
                  ? "bg-[#090D16]/95 border-zinc-800 text-zinc-200"
                  : "bg-[#FAF8F5]/98 border-[#EBE5DC] text-zinc-800"
              } backdrop-blur-xl shadow-xl`}
            >
              <nav className="flex flex-col gap-1">
                {["Doctors", "Services", "About", "Reviews"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? "hover:bg-zinc-800/80 hover:text-white"
                        : "hover:bg-[#EBE5DC]/60 hover:text-zinc-950"
                    }`}
                  >
                    {item}
                  </a>
                ))}
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isDark
                      ? "hover:bg-zinc-800/80 hover:text-white"
                      : "hover:bg-[#EBE5DC]/60 hover:text-zinc-950"
                  }`}
                >
                  <PhoneCall className="w-4 h-4 text-emerald-500" />
                  Contact
                </a>
                {!isSignedIn && (
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 px-4 py-2.5 rounded-xl text-center text-sm font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Sign In
                  </Link>
                )}
                {isSignedIn && (
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 px-4 py-2.5 rounded-xl text-center text-sm font-medium bg-[#314E43] text-white"
                  >
                    Go to Dashboard
                  </Link>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero Section (Faithfully matching the inspiration layout) ─────── */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left column: Typography, Tagline, CTAs, Ratings */}
            <div className="lg:col-span-7 pt-4">
              {/* KokonutUI SplitFlapText – Animated departure board tagline */}
              <div className="mb-4">
                <SplitFlapText
                  words={[
                    "ZERO WAIT TIME",
                    "BOOK IN SECONDS",
                    "INSTANT QR PASS",
                    "AI POWERED CARE",
                  ]}
                  interval={3600}
                  tileClassName={isDark ? "bg-zinc-800 text-white" : "bg-[#1E293B] text-white"}
                />
              </div>

              {/* KokonutUI MarkerText – Hand-drawn animated marks on headline */}
              <MarkerText className={isDark ? "text-white" : "text-[#13221C]"}>
                <h1
                  className={`text-5xl sm:text-6xl font-serif font-normal tracking-tight leading-[1.08] mb-5 ${
                    isDark ? "text-white" : "text-[#13221C]"
                  }`}
                >
                  Expert Care,<br />
                  <Mark color={isDark ? "#1E3B2F" : "#D8E8DD"} type="highlight">Designed Around</Mark><br />
                  You
                </h1>
              </MarkerText>

              {/* Subtext matching inspiration */}
              <p
                className={`text-base sm:text-lg leading-relaxed mb-7 max-w-lg ${
                  isDark ? "text-zinc-300" : "text-[#556960]"
                }`}
              >
                Reassuring and ask your healthcare, professional commuter well care healthier cancel you.
                Modern digital queueing so you spend less time waiting and more time healing.
              </p>

              {/* CTA buttons matching inspiration */}
              <div className="flex flex-wrap items-center gap-3.5 mb-10">
                <Link
                  href="/book-appointment"
                  className="px-6 py-3 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:scale-105"
                  style={{ background: isDark ? "#2563EB" : "#1F2D3D" }}
                >
                  Book an Appointment
                </Link>
                <a
                  href="#doctors"
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors py-2 px-1 ${
                    isDark ? "text-blue-400 hover:text-blue-300" : "text-[#1F2D3D] hover:text-[#314E43]"
                  }`}
                >
                  Meet Our Doctors →
                </a>
              </div>

              {/* Social proof stats matching inspiration */}
              <div
                className={`flex flex-wrap items-center gap-8 pt-4 border-t ${
                  isDark ? "border-zinc-800" : "border-[#EAE3D9]"
                }`}
              >
                <div>
                  <div
                    className={`flex items-center gap-1 text-xl font-bold ${
                      isDark ? "text-white" : "text-[#1F2D3D]"
                    }`}
                  >
                    <AnimatedCounter target={4.9} suffix="" />
                    <span>/5</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 ml-0.5" />
                  </div>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                    patient rating
                  </p>
                </div>
                <div className={`w-px h-8 ${isDark ? "bg-zinc-800" : "bg-[#EAE3D9]"}`} />
                <div>
                  <p className={`text-xl font-bold ${isDark ? "text-white" : "text-[#1F2D3D]"}`}>
                    <AnimatedCounter target={15} suffix="+" />
                  </p>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                    experience
                  </p>
                </div>
                <div className={`w-px h-8 ${isDark ? "bg-zinc-800" : "bg-[#EAE3D9]"}`} />
                <div>
                  <p className={`text-xl font-bold ${isDark ? "text-white" : "text-[#1F2D3D]"}`}>
                    <AnimatedCounter target={10000} suffix="+" />
                  </p>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                    patients cared for
                  </p>
                </div>
              </div>
            </div>

            {/* Right column: Doctor portrait with floating availability badge */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="lg:col-span-5 relative flex justify-center"
            >
              <div className="relative w-full max-w-[380px]">
                {/* Doctor Portrait Image container */}
                <div
                  className={`relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 ${
                    isDark ? "border-zinc-800 bg-zinc-800" : "border-white bg-[#EAE4DC]"
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800"
                    alt="Doctor"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating availability badge matching inspiration */}
                <div
                  className={`absolute -bottom-3 left-4 sm:-left-4 rounded-2xl p-3 pr-4 shadow-xl border flex items-center gap-3 ${
                    isDark
                      ? "bg-zinc-900 border-zinc-800 text-white"
                      : "bg-white border-zinc-100 text-zinc-900"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8EFEA] dark:bg-emerald-950 flex items-center justify-center text-[#2D5A46] dark:text-emerald-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Next available
                    </span>
                    <span className="text-xs sm:text-sm font-bold">
                      Today, 4:30 PM
                    </span>
                  </div>
                </div>

                {/* Live Queue mini indicator */}
                <div className="absolute -top-3 right-4 bg-emerald-600 text-white rounded-full px-3 py-1 shadow-md text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Live OPD Active
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Department Filter Bar (Matching Inspiration Pill Tabs) ────────── */}
      <section className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              const isSelected = activeDept === dept.name;
              return (
                <button
                  key={dept.name}
                  onClick={() => setActiveDept(dept.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "bg-[#D6E5DC] text-[#1E3B2F] shadow-xs font-semibold"
                      : isDark
                      ? "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      : "bg-transparent text-[#5B6D63] hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {dept.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Services Section (Matching Inspiration) ───────────────────────── */}
      <section id="services" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h2
              className={`text-3xl font-serif font-normal ${
                isDark ? "text-white" : "text-[#13221C]"
              }`}
            >
              Services
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Primary Care",
                desc: "Comprehensive outpatient examinations, preventive diagnostics, and individualized wellness protocols.",
                dept: "Primary Care",
              },
              {
                title: "Women's Health",
                desc: "Expert gynecological care, maternal screening, oncology prevention, and reproductive health.",
                dept: "Women's Health",
              },
              {
                title: "Cardiology",
                desc: "Advanced cardiac telemetry, ECG monitoring, hypertension management, and interventional cardiology.",
                dept: "Cardiology",
              },
            ].map((srv, i) => (
              <motion.div
                key={srv.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={i}
                viewport={{ once: true }}
                className={`rounded-2xl p-7 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isDark
                    ? "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700"
                    : "bg-white/80 border-[#ECE5DB] hover:border-zinc-300"
                }`}
              >
                <div>
                  <h3
                    className={`text-xl font-serif mb-3 ${
                      isDark ? "text-white" : "text-[#13221C]"
                    }`}
                  >
                    {srv.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed mb-8 ${
                      isDark ? "text-zinc-400" : "text-[#66776F]"
                    }`}
                  >
                    {srv.desc}
                  </p>
                </div>
                <Link
                  href="/book-appointment"
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    isDark ? "text-blue-400 hover:text-blue-300" : "text-[#1F2D3D] hover:text-[#2D5A46]"
                  }`}
                >
                  Learn more →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Section (Faithfully matching inspiration with Profile Dropdown!) ── */}
      <section id="reviews" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <h2
              className={`text-3xl font-serif font-normal ${
                isDark ? "text-white" : "text-[#13221C]"
              }`}
            >
              Trust
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Card 1: Doctor Profile Card */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className={`rounded-2xl p-6 border shadow-xs flex flex-col sm:flex-row gap-5 items-start relative ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#ECE5DB]"
              }`}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-zinc-200 border border-zinc-100 shadow-xs">
                <img
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300"
                  alt="Doctor Name"
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className={`font-serif text-lg font-bold truncate ${
                    isDark ? "text-white" : "text-[#13221C]"
                  }`}
                >
                  Doctor Name, MnD
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                  Medical Credentials, MED
                </p>
                <p className={`text-xs ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                  Specialty, Physician
                </p>
                <p className={`text-xs mb-4 ${isDark ? "text-zinc-400" : "text-[#6F7F77]"}`}>
                  Years of experience
                </p>

                {/* KokonutUI ProfileDropdown for "View Profile"! */}
                <ProfileDropdown
                  triggerLabel="View Profile"
                  triggerClassName={
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs"
                      : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs text-xs font-semibold px-3 py-1.5 rounded-lg"
                  }
                  accounts={DOCTOR_ACCOUNTS}
                  items={DOCTOR_MENU_ITEMS}
                  defaultStatus="online"
                />
              </div>
            </motion.div>

            {/* Card 2: Patient Review 1 */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              custom={1}
              viewport={{ once: true }}
              className={`rounded-2xl p-6 border shadow-xs flex flex-col justify-between ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#ECE5DB]"
              }`}
            >
              <div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? "text-zinc-300" : "text-[#5B6D63]"
                  }`}
                >
                  "Zero wait time experienced for the first time in an OPD hospital. The digital buzzer alerted me on WhatsApp 10 minutes prior."
                </p>
              </div>

              <div className="flex items-center gap-2.5 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-200">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                    alt="Jani"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#1E293B]"}`}>
                  Jani K.
                </span>
              </div>
            </motion.div>

            {/* Card 3: Patient Review 2 */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              custom={2}
              viewport={{ once: true }}
              className={`rounded-2xl p-6 border shadow-xs flex flex-col justify-between ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#ECE5DB]"
              }`}
            >
              <div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? "text-zinc-300" : "text-[#5B6D63]"
                  }`}
                >
                  "The contactless kiosk check-in with the flip QR pass eliminated the standard paperwork bottleneck entirely."
                </p>
              </div>

              <div className="flex items-center gap-2.5 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-200">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
                    alt="Rani"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#1E293B]"}`}>
                  Rani M.
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Digital Queue Token & Flip Card for QR Section ────────────────── */}
      <section
        className={`py-16 px-4 sm:px-6 lg:px-8 border-y ${
          isDark
            ? "bg-zinc-950/70 border-zinc-800"
            : "bg-[#F4F0E8]/60 border-[#ECE5DB]"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left: Explanation & Instructions */}
            <div className="lg:col-span-7">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
                Digital Check-In
              </span>
              <MarkerText className={isDark ? "text-white" : "text-[#13221C]"}>
                <h2
                  className={`text-3xl sm:text-4xl font-serif mb-4 leading-tight ${
                    isDark ? "text-white" : "text-[#13221C]"
                  }`}
                >
                  Skip Reception:{" "}
                  <Mark color={isDark ? "#1E3B2F" : "#D1E3D7"} type="circle">
                    Flip for QR Check-In
                  </Mark>
                </h2>
              </MarkerText>
              <p
                className={`text-sm sm:text-base leading-relaxed mb-6 max-w-lg ${
                  isDark ? "text-zinc-400" : "text-[#5B6D63]"
                }`}
              >
                Whenever you book an appointment or join the queue, you receive this digital pass.
                Drag or click to flip the card and reveal your check-in QR code. Scan it directly
                at the waiting room kiosk for automated queue call alerts.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { title: "No Paper Tokens", desc: "Eco-friendly, digital token stored right on your phone" },
                  { title: "Kiosk QR Check-in", desc: "Instant self-check-in at tablet kiosks without standing in line" },
                  { title: "Real-time SMS & Buzzer", desc: "Live countdown so you can grab a coffee until your turn" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className={`text-xs sm:text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsPassFlipped(!isPassFlipped)}
                  className={`px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all ${
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                      : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                  Flip Card ({isPassFlipped ? "Showing Back QR" : "Showing Front"})
                </button>
                <Link
                  href="/join-queue"
                  className="px-5 py-2.5 rounded-xl bg-[#1F2D3D] dark:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-xs hover:opacity-95"
                >
                  Join Live Queue
                </Link>
              </div>
            </div>

            {/* Right: KokonutUI CardFlip with QR Code */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative">
                <CardFlip
                  flipped={isPassFlipped}
                  onFlippedChange={setIsPassFlipped}
                  front={<MedicalPassFront />}
                  back={<MedicalPassBack />}
                  label="Digital Queue Pass with QR Check-In"
                  className="w-[280px] sm:w-[320px] aspect-[7/10]"
                  faceClassName="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-xl overflow-hidden"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-4 text-center">
                Interactive: Click or drag to flip the card and view the QR code
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Slot Picker Booking Section ───────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
                Live Scheduling
              </span>
              <h2
                className={`text-3xl font-serif mb-4 ${
                  isDark ? "text-white" : "text-[#13221C]"
                }`}
              >
                Interactive Slot Picker
              </h2>
              <p
                className={`text-sm leading-relaxed mb-6 ${
                  isDark ? "text-zinc-400" : "text-[#5B6D63]"
                }`}
              >
                Drag through available consultation hours to pick the exact appointment time that works best for your schedule.
              </p>
              <div
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  isDark
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400"
                    : "bg-white border-[#ECE5DB] text-zinc-600"
                }`}
              >
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Blue slots represent available consultation hours
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  Hatched regions indicate existing bookings
                </p>
              </div>
            </div>

            {/* KokonutUI SlotPicker */}
            <div className="lg:col-span-6">
              <div
                className={`rounded-2xl border shadow-md overflow-hidden ${
                  isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                }`}
              >
                <SlotPicker
                  host={{ name: "Dr. Sarah Jenkins", title: "Chief Cardiologist", city: "Phantom, USA" }}
                  onBook={(slot) => {
                    window.location.href = `/book-appointment?date=${slot.date}&start=${slot.start}&duration=${slot.minutes}`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Doctors Spotlight with CradleText ─────────────────────────────── */}
      <section
        id="doctors"
        className={`py-16 px-4 sm:px-6 lg:px-8 border-t ${
          isDark ? "bg-[#090D16] border-zinc-800" : "bg-white border-[#ECE5DB]"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            {/* KokonutUI CradleText – Interactive Newton's Cradle headline */}
            <CradleText text="Meet Our Doctors" className="justify-center" />
            <p className={`mt-3 text-sm ${isDark ? "text-zinc-400" : "text-[#66776F]"}`}>
              Board-certified practitioners with decades of combined clinical experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {DOCTORS.map((doc, i) => (
              <motion.div
                key={doc.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                custom={i}
                viewport={{ once: true }}
                className={`rounded-2xl p-6 border flex flex-col justify-between ${
                  isDark
                    ? "bg-zinc-900/90 border-zinc-800"
                    : "bg-[#FAF8F5] border-[#ECE5DB]"
                }`}
              >
                <div>
                  <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 bg-zinc-200">
                    <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                  </div>
                  <h3
                    className={`font-serif text-lg font-bold ${
                      isDark ? "text-white" : "text-[#13221C]"
                    }`}
                  >
                    {doc.name}
                  </h3>
                  <p className="text-xs text-blue-600 font-medium mb-3">{doc.specialty}</p>
                  <p className="text-xs text-zinc-500 mb-4">{doc.slots}</p>
                </div>

                <div
                  className={`pt-4 border-t flex items-center justify-between ${
                    isDark ? "border-zinc-800" : "border-zinc-200/60"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    {doc.rating} ★ ({doc.exp})
                  </span>
                  <Link
                    href="/book-appointment"
                    className={`text-xs font-semibold transition-colors ${
                      isDark ? "text-blue-400 hover:text-blue-300" : "text-[#1F2D3D] hover:text-[#2D5A46]"
                    }`}
                  >
                    Book Slot →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Assistant & Medical Report Analysis ────────────────────────── */}
      <section
        id="about"
        className={`py-16 px-4 sm:px-6 lg:px-8 ${
          isDark ? "bg-[#0B0F19]" : "bg-[#FAF8F5]"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
              AI Healthcare Intelligence
            </span>
            <h2
              className={`text-3xl font-serif ${
                isDark ? "text-white" : "text-[#13221C]"
              }`}
            >
              Smart Queue &amp; Medical Report Assistant
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* KokonutUI AIMessageQueue */}
            <div
              className={`rounded-2xl p-6 border shadow-xs ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#ECE5DB]"
              }`}
            >
              <h3
                className={`font-serif text-lg font-bold mb-2 flex items-center gap-2 ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                <Brain className="w-4 h-4 text-blue-600" />
                AI Waiting Room Questions
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Queue questions for the doctor while in the digital waiting room:
              </p>
              <AIMessageQueue
                title="Pre-Consultation Queries"
                initialPrompt="Explain what my elevated blood pressure readings indicate"
                initialQueue={[
                  "Are there dietary adjustments I should start today?",
                  "Should I track my resting pulse rate each morning?",
                ]}
              />
            </div>

            {/* KokonutUI AIAttachment */}
            <div
              className={`rounded-2xl p-6 border shadow-xs ${
                isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#ECE5DB]"
              }`}
            >
              <h3
                className={`font-serif text-lg font-bold mb-2 flex items-center gap-2 ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                <FileText className="w-4 h-4 text-purple-600" />
                Instant Report Summarization
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Upload your lab tests and get AI page-by-page highlighted summaries:
              </p>
              <AIAttachment
                file={{ name: "Comprehensive-Metabolic-Panel.pdf", size: 3_100_000, pages: 6 }}
                prompt="Summarize my lipid panel and flag abnormal cholesterol values."
                answer={[
                  "Total cholesterol is 185 mg/dL, well within normal target",
                  { page: 2 },
                  ". HDL cholesterol is optimal at 58 mg/dL",
                  { page: 3 },
                  ". Fasting glucose is 92 mg/dL",
                  { page: 4 },
                  ".",
                ]}
                uploadMs={1200}
                pageMs={280}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Secure Document Upload Section ────────────────────────────────── */}
      <section
        className={`py-16 px-4 sm:px-6 lg:px-8 border-t ${
          isDark ? "bg-[#090D16] border-zinc-800" : "bg-white border-[#ECE5DB]"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-2">
                HIPAA Compliant Records
              </span>
              <MarkerText className={isDark ? "text-white" : "text-[#13221C]"}>
                <h2
                  className={`text-3xl font-serif mb-4 ${
                    isDark ? "text-white" : "text-[#13221C]"
                  }`}
                >
                  Upload Prescriptions &amp;{" "}
                  <Mark color={isDark ? "#1E3B2F" : undefined} type="underline">
                    Lab Documents
                  </Mark>
                </h2>
              </MarkerText>
              <p
                className={`text-sm leading-relaxed mb-6 ${
                  isDark ? "text-zinc-400" : "text-[#5B6D63]"
                }`}
              >
                Drag and drop your previous discharge summaries, radiological reports, and insurance cards securely.
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  256-bit Encrypted
                </span>
                <span className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Instant Delivery
                </span>
              </div>
            </div>

            {/* KokonutUI FileUpload */}
            <div className="lg:col-span-6">
              <FileUpload
                acceptedFileTypes={[".pdf", ".jpg", ".png", "image/*"]}
                maxFileSize={10 * 1024 * 1024}
                maxFiles={4}
                simulateFailure={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Call To Action Banner (Matching Inspiration Exactly) ─────────── */}
      <section
        className={`py-14 px-4 sm:px-6 lg:px-8 ${
          isDark ? "bg-emerald-950/80 border-y border-emerald-900" : "bg-[#D8E6DD]/90"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2
              className={`text-3xl sm:text-4xl font-serif leading-tight mb-2 ${
                isDark ? "text-white" : "text-[#13221C]"
              }`}
            >
              Ready to Talk<br className="hidden sm:inline" /> to a Doctor?
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-md ${
                isDark ? "text-emerald-200/80" : "text-[#3E5549]"
              }`}
            >
              Ready to talk to a Doctor? Consectetur medical service, with one-more appointment.
            </p>
          </div>

          <div>
            <Link
              href="/book-appointment"
              className="inline-block px-7 py-3 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:scale-105"
              style={{ background: isDark ? "#2563EB" : "#4B7062" }}
            >
              Appointment CTA
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer (Matching Inspiration Exactly) ─────────────────────────── */}
      <footer
        id="contact"
        className={`py-14 px-4 sm:px-6 lg:px-8 border-t text-xs ${
          isDark
            ? "bg-[#090D16] border-zinc-800 text-zinc-400"
            : "bg-[#FAF8F5] border-[#EAE3D9] text-[#6F7F77]"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Contact */}
            <div>
              <h4
                className={`font-bold mb-2 uppercase tracking-wider text-[11px] ${
                  isDark ? "text-white" : "text-[#1E293B]"
                }`}
              >
                Contact
              </h4>
              <p className="leading-relaxed">+1 (555) 277-4580</p>
              <p className="leading-relaxed">support@mediqueue.org</p>
            </div>

            {/* Clinic Hours */}
            <div>
              <h4
                className={`font-bold mb-2 uppercase tracking-wider text-[11px] ${
                  isDark ? "text-white" : "text-[#1E293B]"
                }`}
              >
                Clinic Hours
              </h4>
              <p className="leading-relaxed">8:30 AM – 8:00 PM</p>
              <p className="leading-relaxed">Sat: 9:00 AM – 2:00 PM</p>
            </div>

            {/* Address */}
            <div>
              <h4
                className={`font-bold mb-2 uppercase tracking-wider text-[11px] ${
                  isDark ? "text-white" : "text-[#1E293B]"
                }`}
              >
                Location
              </h4>
              <p className="leading-relaxed">3832 Westminister Drve,</p>
              <p className="leading-relaxed">Phantom, USA</p>
            </div>

            {/* Navigation & Social */}
            <div>
              <h4
                className={`font-bold mb-2 uppercase tracking-wider text-[11px] ${
                  isDark ? "text-white" : "text-[#1E293B]"
                }`}
              >
                Navigation
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                <a href="#doctors" className={isDark ? "hover:text-white" : "hover:text-zinc-950"}>
                  Doctors
                </a>
                <a href="#services" className={isDark ? "hover:text-white" : "hover:text-zinc-950"}>
                  Services
                </a>
                <a href="#about" className={isDark ? "hover:text-white" : "hover:text-zinc-950"}>
                  About
                </a>
                <a href="#reviews" className={isDark ? "hover:text-white" : "hover:text-zinc-950"}>
                  Reviews
                </a>
              </div>
            </div>
          </div>

          <div
            className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDark ? "border-zinc-800" : "border-[#EAE3D9]"
            }`}
          >
            <p>© 2026 MediQueue Pro. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              HIPAA Compliant &amp; Secure
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
