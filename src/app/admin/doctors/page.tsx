"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, CheckCircle, AlertCircle, Loader2,
  Stethoscope, Hospital, ChevronDown, Pencil, Trash2, Search,
  UserCheck, UserX, LogOut
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { SunMoonThemeToggle } from "@/components/ui/sun-moon-theme-toggle";

interface HospitalOption {
  id: string;
  name: string;
  city: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  hospital_id: string;
  department_id: string;
  specialization: string;
  qualification: string;
  experience: number;
  rating: number;
  is_on_leave: boolean;
  average_treatment_time: number;
  created_at: string;
  hospitals?: { name: string; city: string };
  departments?: { name: string };
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  hospital_id: "",
  department_id: "",
  specialization: "",
  qualification: "",
  experience: "",
  average_treatment_time: "15",
};

const QUALIFICATIONS = ["MBBS", "MD", "MS", "DM", "MCh", "BDS", "MDS", "BHMS", "BAMS", "DNB", "PhD"];
const SPECIALIZATIONS = [
  "General Medicine", "General Surgery", "Cardiology", "Neurology", "Orthopedics",
  "Gynecology & Obstetrics", "Pediatrics", "Dermatology", "Ophthalmology", "ENT",
  "Psychiatry", "Oncology", "Urology", "Nephrology", "Pulmonology",
  "Gastroenterology", "Endocrinology", "Rheumatology", "Anesthesiology", "Radiology",
  "Pathology", "Emergency Medicine", "Dentistry", "Physiotherapy"
];

export default function AdminDoctorsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterHospital, setFilterHospital] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    if ((user?.publicMetadata?.role as string) !== "admin") router.push("/");
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && (user?.publicMetadata?.role as string) === "admin") {
      fetchHospitals();
      fetchDoctors();
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    let list = doctors;
    if (filterHospital !== "all") list = list.filter(d => d.hospital_id === filterHospital);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q)
      );
    }
    setFilteredDoctors(list);
  }, [doctors, filterHospital, searchQuery]);

  useEffect(() => {
    if (form.hospital_id) fetchDepartments(form.hospital_id);
    else setDepartments([]);
  }, [form.hospital_id]);

  const fetchHospitals = async () => {
    const { data } = await supabase.from("hospitals").select("id, name, city").order("name");
    setHospitals(data || []);
  };

  const fetchDepartments = async (hospitalId: string) => {
    const { data } = await supabase.from("departments").select("id, name").eq("hospital_id", hospitalId).order("name");
    setDepartments(data || []);
  };

  const fetchDoctors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("doctors")
      .select("*, hospitals(name, city), departments(name)")
      .order("created_at", { ascending: false });
    setDoctors(data || []);
    setLoading(false);
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || !form.hospital_id) return;
    setAddingDept(true);
    const { data, error } = await supabase
      .from("departments")
      .insert({ name: newDeptName.trim(), hospital_id: form.hospital_id })
      .select()
      .single();
    setAddingDept(false);
    if (error) { showToast("error", "Failed to create department: " + error.message); return; }
    setDepartments(prev => [...prev, data]);
    setForm(f => ({ ...f, department_id: data.id }));
    setNewDeptName("");
    showToast("success", `Department "${data.name}" created.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ["name", "email", "phone", "hospital_id", "department_id", "specialization", "qualification", "experience"];
    for (const field of required) {
      if (!form[field as keyof typeof form]) {
        showToast("error", `Please fill in all required fields.`);
        return;
      }
    }
    setSaving(true);

    const payload = {
      ...form,
      experience: parseInt(form.experience),
      average_treatment_time: parseInt(form.average_treatment_time) || 15,
    };

    const { error } = editingId
      ? await supabase.from("doctors").update(payload).eq("id", editingId)
      : await supabase.from("doctors").insert(payload);

    setSaving(false);
    if (error) { showToast("error", error.message); return; }

    // Assign doctor role in Clerk for new registrations
    if (!editingId) {
      try {
        await fetch("/api/set-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, role: "doctor" }),
        });
      } catch {
        // Non-blocking — doctor record is saved; role will be assigned when they sign in
      }
    }

    showToast("success", editingId ? "Doctor updated successfully." : "Doctor added successfully.");
    resetForm();
    fetchDoctors();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setDepartments([]);
    setNewDeptName("");
  };

  const handleEdit = (d: Doctor) => {
    setForm({
      name: d.name,
      email: d.email,
      phone: d.phone,
      hospital_id: d.hospital_id,
      department_id: d.department_id,
      specialization: d.specialization,
      qualification: d.qualification,
      experience: d.experience?.toString() || "",
      average_treatment_time: d.average_treatment_time?.toString() || "15",
    });
    setEditingId(d.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Doctor removed.");
    setDeleteConfirm(null);
    fetchDoctors();
  };

  const toggleLeave = async (id: string, current: boolean) => {
    await supabase.from("doctors").update({ is_on_leave: !current }).eq("id", id);
    fetchDoctors();
  };

  // Group doctors by hospital for the table view
  const doctorsByHospital = hospitals.map(h => ({
    hospital: h,
    doctors: filteredDoctors.filter(d => d.hospital_id === h.id),
  })).filter(g => g.doctors.length > 0);

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-zinc-800/60">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#FAF8F5] dark:bg-zinc-800/60/90 dark:bg-[#090D16]/90 backdrop-blur-md border-b border-[#ECE5DB] dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/admin" className="flex items-center space-x-2 group">
              <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-[#ECE5DB] dark:border-zinc-700 dark:border-zinc-800 shadow-xs group-hover:bg-[#E8EFEA] transition-colors">
                <ArrowLeft className="h-4 w-4 text-[#1E293B] dark:text-white" />
              </div>
              <span className="text-sm font-semibold text-[#1E293B] dark:text-white group-hover:text-[#2D5A46] transition-colors">Admin Overview</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Stethoscope className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-serif font-bold text-[#13221C] dark:text-white tracking-tight">Doctor Roster</h1>
            </div>
            <div className="flex items-center gap-2.5">
              <SunMoonThemeToggle size={38} />
              <button
                onClick={() => { resetForm(); setShowForm(v => !v); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F2D3D] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs hover:opacity-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Doctor
              </button>
              <button
                onClick={() => signOut({ redirectUrl: "/" })}
                title="Sign out of admin portal"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-[#ECE5DB] dark:border-zinc-800 shadow-xs hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Add / Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="mb-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? "Edit Doctor" : "Add New Doctor"}</h2>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Personal Details */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-4">Personal Details</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                        placeholder="Dr. Full Name" className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Phone <span className="text-red-500">*</span></label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required
                        placeholder="+91 XXXXXXXXXX" className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                        placeholder="doctor@hospital.com" className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Experience (years) <span className="text-red-500">*</span></label>
                      <input type="number" min="0" max="60" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} required
                        placeholder="0" className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-4">Professional Details</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Qualification <span className="text-red-500">*</span></label>
                      <select value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} required
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                        <option value="">Select qualification</option>
                        {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Specialization <span className="text-red-500">*</span></label>
                      <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} required
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                        <option value="">Select specialization</option>
                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Avg. Treatment Time (min)</label>
                      <input type="number" min="5" max="120" value={form.average_treatment_time} onChange={e => setForm(f => ({ ...f, average_treatment_time: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Hospital & Department */}
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-4">Assignment</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Hospital <span className="text-red-500">*</span></label>
                      {hospitals.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-700">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          No hospitals found. <Link href="/admin/hospitals" className="underline font-semibold">Add one first.</Link>
                        </div>
                      ) : (
                        <select value={form.hospital_id} onChange={e => setForm(f => ({ ...f, hospital_id: e.target.value, department_id: "" }))} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                          <option value="">Select hospital</option>
                          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Department <span className="text-red-500">*</span></label>
                      {!form.hospital_id ? (
                        <div className="px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm text-slate-400 italic">
                          Select a hospital first
                        </div>
                      ) : (
                        <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} required
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                          <option value="">Select department</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Inline add department */}
                    {form.hospital_id && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5">Or create a new department</label>
                        <div className="flex gap-2">
                          <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                            placeholder="e.g. Neurology"
                            className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                          <button type="button" onClick={handleAddDepartment} disabled={!newDeptName.trim() || addingDept}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors">
                            {addingDept ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? "Save Changes" : "Add Doctor"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialization, or email…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
          </div>
          <div className="relative">
            <select value={filterHospital} onChange={e => setFilterHospital(e.target.value)}
              className="pl-3 pr-8 py-2.5 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white appearance-none min-w-[200px]">
              <option value="all">All Hospitals</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Doctors grouped by hospital */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 flex flex-col items-center justify-center py-20 text-slate-400">
            <Stethoscope className="h-14 w-14 mb-4 text-slate-200" />
            <p className="font-semibold text-slate-500 dark:text-zinc-400">No doctors registered yet</p>
            <p className="text-sm mt-1">Click &quot;Add Doctor&quot; to register the first doctor.</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="h-12 w-12 mb-4 text-slate-200" />
            <p className="font-semibold text-slate-500 dark:text-zinc-400">No matching doctors found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {doctorsByHospital.map(({ hospital, doctors: docs }) => (
              <motion.div key={hospital.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-slate-100 dark:ring-zinc-800 border border-transparent dark:border-zinc-800 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center gap-3">
                  <div className="w-9 h-9 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center">
                    <Hospital className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{hospital.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{hospital.city} · {docs.length} doctor{docs.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Doctor</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Department</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Specialization</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Qualification</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Exp.</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {docs.map((d, i) => (
                        <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {d.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400">{d.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 dark:text-zinc-300">
                              {d.departments?.name || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-slate-700 dark:text-zinc-300 font-medium">{d.specialization}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {d.qualification}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-slate-700 dark:text-zinc-300 font-semibold">{d.experience}y</span>
                          </td>
                          <td className="px-4 py-4">
                            <button onClick={() => toggleLeave(d.id, d.is_on_leave)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                                d.is_on_leave
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}>
                              {d.is_on_leave
                                ? <><UserX className="h-3 w-3" /> On Leave</>
                                : <><UserCheck className="h-3 w-3" /> Available</>
                              }
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEdit(d)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(d.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">Remove Doctor?</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 text-center mb-6">This doctor&apos;s account and all associated data will be removed. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Remove</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
