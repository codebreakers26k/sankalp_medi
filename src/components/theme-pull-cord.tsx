"use client";

import { useTheme } from "./theme-provider";
import PullCord from "./kokonutui/pull-cord";
import { useEffect, useState } from "react";

interface ThemePullCordProps {
  className?: string;
  fixed?: boolean;
}

export default function ThemePullCord({ className, fixed = true }: ThemePullCordProps) {
  const { isDark, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={
        fixed
          ? `fixed top-0 right-2 sm:right-6 md:right-10 z-50 pointer-events-none flex flex-col items-center select-none ${className || ""}`
          : `relative flex flex-col items-center pointer-events-none select-none ${className || ""}`
      }
    >
      {/* Ceiling fixture */}
      <div
        onClick={toggleTheme}
        title="Ceiling fixture - click to toggle theme"
        className="w-12 h-2.5 bg-zinc-800 dark:bg-zinc-700 rounded-b-lg shadow-sm pointer-events-auto cursor-pointer"
      />

      {/* KokonutUI PullCord component */}
      <div className="pointer-events-auto -mt-1 scale-90 sm:scale-100 origin-top">
        <PullCord
          variant="hanging"
          checked={!isDark}
          onCheckedChange={(lightOn) => setTheme(lightOn ? "light" : "dark")}
          label="Clinic Ambience"
          hideLabel={true}
        />
      </div>

      {/* Interactive theme switch badge directly beneath the cord */}
      <button
        onClick={toggleTheme}
        title="Pull cord or click here to switch light/dark mode"
        className="pointer-events-auto -mt-24 sm:-mt-28 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg border transition-all cursor-pointer bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 border-zinc-200/90 dark:border-zinc-700 hover:scale-105 active:scale-95 flex items-center gap-1.5 ring-2 ring-black/5 dark:ring-white/10"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-blue-400 animate-pulse" />
        <span>{isDark ? "🌙 Night Shift" : "☀️ Day Light"}</span>
      </button>
    </div>
  );
}
