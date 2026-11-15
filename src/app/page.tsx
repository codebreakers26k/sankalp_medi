"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
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
  ChevronRight,
  ChevronDown,
  Star,
  Sparkles,
  HeartPulse,
  Stethoscope,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

// ─── Animation Variants ────────────────────────────────────────────
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: EASE_OUT_EXPO },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: EASE_OUT_EXPO },
  }),
};

// ─── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Section Wrapper with InView ──────────────────────────────────
function InViewSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transition: "opacity 0.1s" }}>
      {children}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#2563EB", borderRightColor: "#7C3AED" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient-bg overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "py-3 shadow-lg shadow-blue-500/10"
            : "py-5"
        }`}
        style={{
          background: scrolled
            ? "rgba(255,255,255,0.85)"
            : "rgba(255,255,255,0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled ? "1px solid rgba(229,231,235,0.8)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-blue-500/30 transition-shadow duration-300"
              style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
            >
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <span
              className="text-xl font-bold"
              style={{
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              MediQueue Pro
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {/* Dashboards Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDashboardMenuOpen(!dashboardMenuOpen)}
                className="nav-link text-sm font-medium flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboards
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${dashboardMenuOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {dashboardMenuOpen && isSignedIn && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                  >
                    {role === 'patient' && (
                      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg mx-1" onClick={() => setDashboardMenuOpen(false)}>
                        <Users className="h-4 w-4" />
                        User Dashboard
                      </Link>
                    )}
                    {role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg mx-1" onClick={() => setDashboardMenuOpen(false)}>
                        <Hospital className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    {role === 'doctor' && (
                      <Link href="/doctor" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-lg mx-1" onClick={() => setDashboardMenuOpen(false)}>
                        <Stethoscope className="h-4 w-4" />
                        Doctor Dashboard
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isSignedIn ? null : (
              <>
                <Link href="/sign-in" className="nav-link text-sm font-medium">
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="ripple inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
                >
                  Get Started
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="w-5 h-0.5 bg-gray-700 mb-1 transition-all" style={{ transform: mobileMenuOpen ? "rotate(45deg) translate(3px, 3px)" : "" }} />
            <div className="w-5 h-0.5 bg-gray-700 mb-1 transition-all" style={{ opacity: mobileMenuOpen ? 0 : 1 }} />
            <div className="w-5 h-0.5 bg-gray-700 transition-all" style={{ transform: mobileMenuOpen ? "rotate(-45deg) translate(3px, -3px)" : "" }} />
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl"
            >
              <div className="px-4 py-4 flex flex-col gap-2">
                {isSignedIn && role && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Dashboards</p>
                    {role === 'patient' && (
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        <Users className="h-4 w-4" /> User Dashboard
                      </Link>
                    )}
                    {role === 'admin' && (
                      <Link href="/admin" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        <Hospital className="h-4 w-4" /> Admin Dashboard
                      </Link>
                    )}
                    {role === 'doctor' && (
                      <Link href="/doctor" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        <Stethoscope className="h-4 w-4" /> Doctor Dashboard
                      </Link>
                    )}
                  </>
                )}
                {!isSignedIn && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <Link href="/sign-in" className="px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Hero Section ───────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="animate-blob absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #2563EB, #3B82F6)" }}
          />
          <div
            className="animate-blob-2 animation-delay-2000 absolute top-20 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #7C3AED, #A855F7)" }}
          />
          <div
            className="animate-blob animation-delay-4000 absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-15 blur-3xl"
            style={{ background: "radial-gradient(circle, #2563EB, #7C3AED)" }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563EB' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="flex justify-center mb-8"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border shadow-sm"
              style={{
                background: "rgba(37,99,235,0.08)",
                borderColor: "rgba(37,99,235,0.2)",
                color: "#2563EB",
              }}
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Healthcare Platform
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </motion.div>

          {/* Headline */}
          <div className="text-center max-w-5xl mx-auto">
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6"
              style={{ color: "#0F172A" }}
            >
              Smart Hospital{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Queue Management
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
              style={{ color: "#64748B" }}
            >
              Experience seamless hospital visits with intelligent queue tracking,
              appointment booking, and digital waiting rooms — all in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              {isSignedIn ? (
                <>
                  <Link
                    href="/join-queue"
                    className="ripple group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
                  >
                    <Users className="h-5 w-5" />
                    Join Queue
                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>

                  <Link
                    href="/book-appointment"
                    className="ripple group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
                  >
                    <Calendar className="h-5 w-5" />
                    Book Appointment
                  </Link>

                  <Link
                    href="/digital-waiting-room"
                    className="ripple group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white shadow-lg hover:shadow-green-500/40 hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                  >
                    <Activity className="h-5 w-5" />
                    Waiting Room
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="ripple group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white shadow-xl hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
                  >
                    <Zap className="h-5 w-5" />
                    Get Started — Free
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold border-2 hover:scale-105 active:scale-95 transition-all duration-300"
                    style={{ borderColor: "#E5E7EB", color: "#0F172A", background: "white" }}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </motion.div>

          </div>

          {/* Floating UI preview card */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            className="mt-20 max-w-3xl mx-auto"
          >
            <div
              className="animate-float rounded-3xl shadow-2xl overflow-hidden border"
              style={{ borderColor: "rgba(229,231,235,0.5)", background: "white" }}
            >
              {/* Fake browser chrome */}
              <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "#F1F5F9", background: "#F8FAFC" }}>
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 py-1 px-3 rounded-lg text-xs text-gray-400 font-mono" style={{ background: "white", border: "1px solid #E5E7EB" }}>
                  mediqueue.pro/dashboard
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6" style={{ background: "#F8FAFC" }}>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "In Queue", val: "42", color: "#2563EB" },
                    { label: "Served Today", val: "187", color: "#10B981" },
                    { label: "Avg Wait", val: "14m", color: "#7C3AED" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border" style={{ borderColor: "#E5E7EB" }}>
                      <div className="text-xs font-medium mb-1" style={{ color: "#64748B" }}>{s.label}</div>
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl p-4 bg-white shadow-sm border" style={{ borderColor: "#E5E7EB" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Live Queue</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#DCFCE7", color: "#16A34A" }}>● Live</span>
                  </div>
                  <div className="space-y-2">
                    {["Dr. Sharma — Cardiology", "Dr. Patel — Neurology", "Dr. Khan — Orthopedics"].map((d, i) => (
                      <div key={d} className="flex items-center gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, #2563EB, #7C3AED)` }}>
                          {i + 1}
                        </div>
                        <span style={{ color: "#0F172A" }}>{d}</span>
                        <span className="ml-auto text-xs" style={{ color: "#64748B" }}>{[5, 12, 8][i]} waiting</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: "#E5E7EB", background: "#0F172A" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)" }}>
                  <HeartPulse className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">MediQueue Pro</span>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#94A3B8" }}>
                The most advanced hospital queue management system. Designed for modern healthcare institutions.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium" style={{ color: "#64748B" }}>All systems operational</span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Platform</h4>
              <ul className="space-y-3">
                {["Join Queue", "Book Appointment", "Doctor Dashboard", "Admin Panel"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm hover:text-white transition-colors duration-200" style={{ color: "#94A3B8" }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-3">
                {["About Us", "Privacy Policy", "Terms of Service", "Contact"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm hover:text-white transition-colors duration-200" style={{ color: "#94A3B8" }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: "#1E293B" }}>
            <p className="text-sm" style={{ color: "#64748B" }}>
              © 2026 MediQueue Pro. All rights reserved. Built with ❤️ for better healthcare.
            </p>
            <div className="flex items-center gap-1 text-sm" style={{ color: "#64748B" }}>
              <Shield className="h-4 w-4" style={{ color: "#10B981" }} />
              HIPAA Compliant &amp; Secure
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
