"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, User, Search, RefreshCw, LogOut } from "lucide-react";
import { DoctorNav } from "@/components/doctor/DoctorNav";

interface HistoryRecord {
  id: string;
  token_number: number;
  patient_id: string;
  patient_name: string;
  status: string;
  created_at: string;
}

export default function DoctorHistoryPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      fetchHistory();
    }
  }, [isLoaded, isSignedIn, user]);

  const fetchHistory = async () => {
    try {
      const response = await fetch("/backend-api/doctor/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const { data } = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = history.filter((item) =>
    search ? item.patient_name?.toLowerCase().includes(search.toLowerCase()) : true
  );

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
                Patient Consultation History
              </h1>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Completed consultations and past treatment logs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchHistory}
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
        <DoctorNav currentTab="history" />
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#ECE5DB] dark:border-zinc-800 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 dark:text-white">
                Completed Records ({filtered.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Detailed audit trail of patients consulted and discharged.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 mx-auto border-b-2 border-blue-600" />
              <p className="text-xs text-zinc-500 mt-3">Loading history...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-60" />
              <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                No past consultations recorded
              </h3>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      #{item.token_number}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">
                        {item.patient_name || `Patient #${item.token_number}`}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Completed at: {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                    Discharged
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
