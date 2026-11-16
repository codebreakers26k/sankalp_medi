"use client";

import Link from "next/link";
import { Activity, Calendar, Users, BarChart3, CalendarDays, Home } from "lucide-react";

export type DoctorTab = "queue" | "appointments" | "history" | "analytics" | "calendar";

interface DoctorNavProps {
  currentTab: DoctorTab;
  className?: string;
  rightAction?: React.ReactNode;
}

export function DoctorNav({ currentTab, className = "", rightAction }: DoctorNavProps) {
  const tabs = [
    {
      id: "queue",
      label: "Live Queue",
      href: "/doctor/queue",
      icon: Activity,
    },
    {
      id: "appointments",
      label: "Appointments",
      href: "/doctor/appointments",
      icon: Calendar,
    },
    {
      id: "history",
      label: "Patient History",
      href: "/doctor/history",
      icon: Users,
    },
    {
      id: "analytics",
      label: "Performance",
      href: "/doctor/analytics",
      icon: BarChart3,
    },
    {
      id: "calendar",
      label: "Calendar",
      href: "/doctor/calendar",
      icon: CalendarDays,
    },
  ];

  return (
    <div className={`w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${className}`}>
      {/* Scrollable pill container on mobile, flex on desktop */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 overflow-x-auto no-scrollbar scroll-smooth">
        <Link
          href="/doctor"
          title="Back to Physician Hub"
          className="px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 flex items-center gap-1"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Hub</span>
        </Link>
        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 shrink-0 mx-0.5" />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 select-none ${
                isActive
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/50 dark:border-zinc-700"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-700/40"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {rightAction && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {rightAction}
        </div>
      )}
    </div>
  );
}

export default DoctorNav;
