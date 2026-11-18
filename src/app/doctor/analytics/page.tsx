"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Users, Clock, CheckCircle2, RefreshCw, LogOut } from "lucide-react";
import { DoctorNav } from "@/components/doctor/DoctorNav";

type AnalyticsFilter = "yesterday" | "day_before" | "last_7_days" | "custom";

export default function DoctorAnalyticsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [filter, setFilter] = useState<AnalyticsFilter>("last_7_days");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    patientsServed: 0,
    completedAppointments: 0,
  });

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
      fetchAnalytics();
    }
  }, [filter, customRange, isLoaded, isSignedIn, user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let fromDate = "";
      let toDate = today.toISOString().split("T")[0];

      if (filter === "yesterday") {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        fromDate = toDate = y.toISOString().split("T")[0];
      } else if (filter === "day_before") {
        const d = new Date(today);
        d.setDate(d.getDate() - 2);
        fromDate = toDate = d.toISOString().split("T")[0];
      } else if (filter === "last_7_days") {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        fromDate = d.toISOString().split("T")[0];
      } else if (filter === "custom") {
        fromDate = customRange.from;
        toDate = customRange.to;
      }

      if (!fromDate) {
        setLoading(false);
        return;
      }

      const response = await fetch("/backend-api/doctor/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const { data: workspace } = await response.json();
      const inRange = (value?: string) => {
        const day = value?.split("T")[0] || "";
        return day >= fromDate && day <= toDate;
      };

      setData({
        patientsServed: (workspace.history || []).filter((item: any) => inRange(item.updated_at || item.created_at)).length,
        completedAppointments: (workspace.allAppointments || []).filter(
          (item: any) => item.status === "completed" && inRange(item.date)
        ).length,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
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
                Clinical Analytics &amp; Reports
              </h1>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Track patient throughput, treatment metrics, and efficiency
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
        <DoctorNav currentTab="analytics" />
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#ECE5DB] dark:border-zinc-800 p-6 shadow-xs">
          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {[
              { key: "yesterday", label: "Yesterday" },
              { key: "day_before", label: "Day Before" },
              { key: "last_7_days", label: "Last 7 Days" },
              { key: "custom", label: "Custom Range" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as AnalyticsFilter)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filter === f.key
                    ? "bg-[#314E43] dark:bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}

            {filter === "custom" && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange((p) => ({ ...p, from: e.target.value }))}
                  className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
                <span className="text-xs text-zinc-400">to</span>
                <input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange((p) => ({ ...p, to: e.target.value }))}
                  className="px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF8F5] dark:bg-zinc-800/50 border border-[#ECE5DB] dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Total Patients Consulted
                </span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">
                {data.patientsServed}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Discharged &amp; completed queue tokens</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F5] dark:bg-zinc-800/50 border border-[#ECE5DB] dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Completed Appointments
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">
                {data.completedAppointments}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Confirmed appointments attended</p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF8F5] dark:bg-zinc-800/50 border border-[#ECE5DB] dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Avg Consultation Time
                </span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">
                14.2 min
              </p>
              <p className="text-xs text-zinc-400 mt-1">Clinical benchmark: 15 min</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
