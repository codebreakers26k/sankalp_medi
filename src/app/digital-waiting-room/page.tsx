"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, Activity, AlertTriangle, Monitor, Volume2, User as UserIcon, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

interface QueueEntry {
  id: string;
  tokenNumber: number;
  patientName: string;
  patientId: string;
  hospitalName: string;
  departmentName: string;
  doctorName: string;
  estimatedWaitTime: number;
  position: number;
  status: string;
  isEmergency: boolean;
  calledAt?: string;
}

export default function DigitalWaitingRoom() {
  const { user, isSignedIn } = useUser();
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [currentCall, setCurrentCall] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueueData();

    const subscription = supabase
      .channel("digital-waiting-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => {
        fetchQueueData();
        setLastUpdated(new Date());
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchQueueData = async () => {
    try {
      const { data, error } = await supabase
        .from("queue")
        .select(`
          *,
          hospitals!queue_hospital_id_fkey(name),
          departments!queue_department_id_fkey(name),
          doctors!queue_doctor_id_fkey(name)
        `)
        .in("status", ["waiting", "in-treatment"])
        .order("is_emergency", { ascending: false })
        .order("position", { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        tokenNumber: item.token_number,
        patientName: item.patient_name,
        patientId: item.patient_id,
        hospitalName: item.hospitals?.name || "Unknown Hospital",
        departmentName: item.departments?.name || "Unknown Department",
        doctorName: item.doctors?.name || "Available Doctor",
        estimatedWaitTime: item.estimated_wait_time || 0,
        position: item.position || 0,
        status: item.status,
        isEmergency: item.is_emergency || false,
        calledAt: item.called_at,
      }));

      setQueueEntries(formattedData);
      const calledPatient = formattedData.find(q => q.status === "in-treatment" && q.calledAt);
      if (calledPatient) setCurrentCall(calledPatient);
      else setCurrentCall(null);
    } catch (error) {
      console.error("Error fetching queue data:", error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled || !currentCall) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  useEffect(() => { if (currentCall) playNotificationSound(); }, [currentCall]);

  const cancelQueue = async (entryId: string) => {
    if (!confirm("Are you sure you want to cancel your queue position?")) return;
    setCancellingId(entryId);
    try {
      // Get the position of the entry being cancelled
      const entry = queueEntries.find(e => e.id === entryId);
      if (!entry) return;

      // Cancel the entry
      await supabase.from("queue").update({ status: "cancelled" }).eq("id", entryId);

      // Reassign token numbers and positions for remaining waiting patients
      const remaining = queueEntries
        .filter(e => e.id !== entryId && e.status === "waiting" && e.position > entry.position)
        .sort((a, b) => a.position - b.position);

      for (const patient of remaining) {
        await supabase
          .from("queue")
          .update({
            position: patient.position - 1,
            estimated_wait_time: Math.max(0, (patient.position - 1) * 15),
          })
          .eq("id", patient.id);
      }

      fetchQueueData();
    } catch (err) {
      console.error("Error cancelling queue:", err);
      alert("Failed to cancel queue. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  // Find current user's queue entry
  const myQueueEntry = isSignedIn && user
    ? queueEntries.find(e => e.patientId === user.id && e.status === "waiting")
    : null;

  const waitingEntries = queueEntries.filter(e => e.status === "waiting");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Digital Waiting Room</h1>
                <p className="text-sm text-gray-500">Live queue status for all patients</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">{lastUpdated.toLocaleTimeString()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center space-x-2">
                <Volume2 className={`h-4 w-4 ${soundEnabled ? "text-green-600" : "text-gray-400"}`} />
                <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* My Queue Status + Cancel Button */}
      <AnimatePresence>
        {myQueueEntry && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-600 text-white overflow-hidden border-b border-blue-500"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Your Token</p>
                    <p className="text-3xl font-black">#{myQueueEntry.tokenNumber}</p>
                  </div>
                  <div className="h-10 w-px bg-blue-400 hidden sm:block" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Patients Ahead</p>
                    <p className="text-3xl font-black">{Math.max(0, myQueueEntry.position - 1)}</p>
                  </div>
                  <div className="h-10 w-px bg-blue-400 hidden sm:block" />
                  <div>
                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Doctor</p>
                    <p className="font-bold">{myQueueEntry.doctorName}</p>
                    <p className="text-xs text-blue-200">{myQueueEntry.departmentName}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-red-500 hover:border-red-400 transition-colors font-semibold rounded-xl"
                  disabled={cancellingId === myQueueEntry.id}
                  onClick={() => cancelQueue(myQueueEntry.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {cancellingId === myQueueEntry.id ? "Cancelling..." : "Cancel Queue"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Call Display */}
      <AnimatePresence>
        {currentCall && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-emerald-500 to-[#10B981] text-white overflow-hidden shadow-lg border-b border-emerald-400"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-6">
                <div>
                  <div className="mb-4 inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-semibold tracking-wide shadow-sm border border-white/10 uppercase">
                    <Activity className="h-4 w-4 mr-2 animate-pulse" />
                    Now Calling
                  </div>
                  <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="text-6xl md:text-7xl font-bold tracking-tight mb-2 drop-shadow-md">
                    #{currentCall.tokenNumber}
                  </motion.div>
                  <div className="text-3xl font-medium tracking-tight mb-1 text-emerald-50">{currentCall.patientName}</div>
                  <div className="text-xl text-emerald-100 font-medium">{currentCall.doctorName} • {currentCall.departmentName}</div>
                  {currentCall.isEmergency && (
                    <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                      className="mt-6 inline-flex items-center px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-full text-sm font-bold shadow-lg border border-red-400">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      EMERGENCY PRIORITY
                    </motion.div>
                  )}
                </div>
                <div className="hidden md:flex items-center justify-center w-48 h-48 bg-white/10 backdrop-blur-md rounded-full border-[8px] border-white/20 shadow-xl relative">
                  <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-4 border-white/30" />
                  <div className="text-center">
                    <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider block mb-1">Counter</span>
                    <span className="text-6xl font-bold leading-none">A</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue Display */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Queue List */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xl font-bold text-slate-800">
                    <div className="p-2.5 bg-blue-100/50 rounded-xl text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <span>Current Queue</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                    {waitingEntries.length} waiting
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
                  <AnimatePresence>
                    {queueEntries.map((entry, index) => {
                      const patientsAhead = waitingEntries.filter(e => e.position < entry.position).length;
                      const isMyEntry = isSignedIn && user && entry.patientId === user.id;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          key={entry.id}
                          className={`p-5 transition-all duration-300 hover:bg-slate-50 cursor-default ${
                            entry.isEmergency ? "bg-red-50/30"
                            : entry.status === "in-treatment" ? "bg-emerald-50/30"
                            : isMyEntry ? "bg-blue-50/40 ring-1 ring-blue-200"
                            : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-5">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-sm ${
                                entry.isEmergency ? "bg-red-100 text-red-600 border border-red-200"
                                : isMyEntry ? "bg-blue-600 text-white border border-blue-500"
                                : "bg-white text-blue-600 border border-slate-200"
                              }`}>
                                {entry.position}
                              </div>

                              <div className="flex items-center space-x-4">
                                <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-slate-100 text-slate-400 rounded-full">
                                  <UserIcon className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="text-blue-600">#{entry.tokenNumber}</span>
                                    <span className="text-slate-300">•</span>
                                    <span>{entry.patientName}</span>
                                    {isMyEntry && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">You</span>}
                                  </div>
                                  <div className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                                    <span>{entry.doctorName}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{entry.departmentName}</span>
                                  </div>
                                  {entry.isEmergency && (
                                    <div className="text-xs text-red-600 font-bold mt-1.5 uppercase tracking-wide flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Emergency Priority
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {entry.status === "waiting" ? (
                                <>
                                  <div className="text-lg font-black text-slate-800 tabular-nums">#{entry.tokenNumber}</div>
                                  <div className="text-sm font-semibold text-blue-600 mt-0.5">{patientsAhead} ahead</div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 mt-1">
                                    Waiting
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="text-lg font-black text-emerald-700 tabular-nums">#{entry.tokenNumber}</div>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mt-1">
                                    In Treatment
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {queueEntries.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-slate-500">
                      <Users className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                      <p className="text-lg font-medium">No patients in queue</p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                <CardTitle className="flex items-center space-x-3 text-lg font-bold text-slate-800">
                  <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span>Queue Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-medium text-slate-500">Total Waiting</span>
                    <span className="font-bold text-xl text-slate-900 tabular-nums bg-slate-100 px-3 py-1 rounded-md">
                      {queueEntries.filter(q => q.status === "waiting").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-medium text-slate-500">In Treatment</span>
                    <span className="font-bold text-xl text-emerald-600 tabular-nums bg-emerald-50 px-3 py-1 rounded-md">
                      {queueEntries.filter(q => q.status === "in-treatment").length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-sm font-medium text-slate-500">Emergency Cases</span>
                    <span className="font-bold text-xl text-red-600 tabular-nums bg-red-50 px-3 py-1 rounded-md">
                      {queueEntries.filter(q => q.isEmergency).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center group pt-4 border-t border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Avg Wait Time</span>
                    <span className="font-bold text-xl text-blue-600 tabular-nums bg-blue-50 px-3 py-1 rounded-md">
                      {waitingEntries.length > 0
                        ? `~${Math.round(waitingEntries.reduce((s, q) => s + q.estimatedWaitTime, 0) / waitingEntries.length)} min`
                        : "0 min"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm overflow-hidden ring-1 ring-slate-100">
              <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
                <CardTitle className="flex items-center space-x-3 text-lg font-bold text-slate-800">
                  <div className="p-2 bg-purple-100/50 rounded-lg text-purple-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span>Department Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from(new Set(queueEntries.map(q => q.departmentName))).map(dept => {
                    const deptQueue = queueEntries.filter(q => q.departmentName === dept && q.status === "waiting");
                    return (
                      <div key={dept} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-semibold text-slate-700">{dept}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 bg-white shadow-sm border border-slate-100 px-3 py-1 rounded-full tabular-nums">
                          {deptQueue.length} waiting
                        </span>
                      </div>
                    );
                  })}
                  {queueEntries.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No active departments</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
