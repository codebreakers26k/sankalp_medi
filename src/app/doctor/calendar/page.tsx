"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  LogOut,
  Sparkles,
  Stethoscope,
  Users,
  CheckCircle2,
  Plus,
  FileText,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { GlassCalendar } from "@/components/ui/glass-calendar";
import { DoctorNav } from "@/components/doctor/DoctorNav";

interface CalendarAppointment {
  id: string;
  patient_name: string;
  time_slot: string;
  status: string;
}

export default function DoctorCalendarPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [notes, setNotes] = useState<string[]>([
    "Review cardiovascular telemetry reports before morning OPD.",
    "Ward rounds scheduled in ICU Block B at 1:45 PM.",
  ]);
  const [newNoteInput, setNewNoteInput] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("10:00 AM");

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
      fetchAppointmentsForDate(selectedDate);
    }
  }, [selectedDate, isLoaded, isSignedIn, user]);

  const fetchAppointmentsForDate = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await fetch("/backend-api/doctor/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const { data } = await response.json();
      setAppointments((data.allAppointments || []).filter((appointment: any) =>
        appointment.date?.split("T")[0] === dateStr
      ));
    } catch (err) {
      console.error("Error fetching appointments for date:", err);
    }
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    setNotes((prev) => [...prev, newNoteInput.trim()]);
    setNewNoteInput("");
    setShowNoteModal(false);
  };

  const handleCreateEvent = () => {
    if (!newEventTitle.trim()) return;
    setAppointments((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        patient_name: newEventTitle.trim(),
        time_slot: newEventTime,
        status: "confirmed",
      },
    ]);
    setNewEventTitle("");
    setShowEventModal(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#090D16] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* ── Header ────────────────────────────────────────────────────── */}
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
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                  Clinical Duty Calendar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#314E43] text-white">
                  Glass Calendar
                </span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                OPD shifts, consultation slots &amp; ward schedules
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mr-12 sm:mr-16">
            <button
              onClick={async () => {
                await signOut({ redirectUrl: "/" });
              }}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DoctorNav currentTab="calendar" />
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Glass Calendar Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Interactive Date Selector
              </span>
              <span className="text-xs text-zinc-400">
                Scroll to browse days
              </span>
            </div>

            {/* Glass Calendar Component */}
            <GlassCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onAddNote={() => setShowNoteModal(true)}
              onNewEvent={() => setShowEventModal(true)}
              className="w-full max-w-full shadow-2xl transition-all duration-300 hover:shadow-cyan-900/20"
            />

            {/* Micro instructions under calendar */}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-4 text-center">
              Selected: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{format(selectedDate, "EEEE, MMMM dd, yyyy")}</span>
            </p>
          </div>

          {/* Right Column: Daily Schedule & OPD Session Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Day Header Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">
                    Daily Schedule
                  </span>
                  <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book Slot</span>
                  </button>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </div>
              </div>

              {/* Shift Details */}
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Morning OPD</span>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">09:00 AM – 01:30 PM (Room 204)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Evening OPD</span>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">02:30 PM – 05:30 PM (Room 204)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booked Consultations on this day */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Booked Consultations ({appointments.length})
                </h3>
                <span className="text-xs text-zinc-400">
                  {appointments.length > 0 ? "Confirmed patients" : "Slots available"}
                </span>
              </div>

              {appointments.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
                  <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                    No booked appointments for this date
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click "Book Slot" or add a new event to block a consultation window.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 -mx-6 px-6 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                          <Stethoscope className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-zinc-900 dark:text-white">
                            {appt.patient_name}
                          </p>
                          <span className="text-[11px] text-zinc-400">
                            Time: {appt.time_slot}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor's Clinical Notes */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#314E43] dark:text-emerald-400" />
                  Clinical Notes &amp; Reminders ({notes.length})
                </h3>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Add Note
                </button>
              </div>

              <div className="space-y-2.5">
                {notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-start gap-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal: Add Note ───────────────────────────────────────────── */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white mb-2">
              Add Clinical Note
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Add a reminder or memo for {format(selectedDate, "MMMM d, yyyy")}.
            </p>
            <textarea
              value={newNoteInput}
              onChange={(e) => setNewNoteInput(e.target.value)}
              placeholder="e.g. Follow up on pathology lab culture for bed 14..."
              className="w-full p-3 rounded-2xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: New Event ──────────────────────────────────────────── */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white mb-2">
              Book / Schedule OPD Event
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Schedule a patient appointment slot for {format(selectedDate, "MMMM d, yyyy")}.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Patient or Event Name
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Clara Oswald (Cardio Consultation)"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Time Slot
                </label>
                <input
                  type="text"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Schedule Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
