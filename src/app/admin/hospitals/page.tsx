"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Hospital, ArrowLeft, Plus, Upload, X, Eye, CheckCircle,
  AlertCircle, Loader2, FileText, Pencil, Trash2, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const HOSPITAL_TYPES = ["private", "government", "clinic", "multi-specialty", "trust"] as const;

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  hospital_type: string;
  bed_count: number;
  accreditation: string;
  website: string;
  license_number: string;
  license_expiry: string;
  license_document_url: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  hospital_type: "private",
  bed_count: "",
  accreditation: "",
  website: "",
  license_number: "",
  license_expiry: "",
};

export default function AdminHospitalsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/sign-in"); return; }
    if ((user?.publicMetadata?.role as string) !== "admin") router.push("/");
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn && (user?.publicMetadata?.role as string) === "admin") fetchHospitals();
  }, [isLoaded, isSignedIn, user]);

  const fetchHospitals = async () => {
    setLoading(true);
    const { data } = await supabase.from("hospitals").select("*").order("created_at", { ascending: false });
    setHospitals(data || []);
    setLoading(false);
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLicenseFile(file);
  };

  const uploadLicenseDocument = async (): Promise<string | null> => {
    if (!licenseFile) return null;
    setUploading(true);
    const ext = licenseFile.name.split(".").pop();
    const path = `licenses/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("hospital-documents").upload(path, licenseFile);
    setUploading(false);
    if (error) { showToast("error", "License upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("hospital-documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city || !form.state || !form.pincode || !form.phone || !form.email) {
      showToast("error", "Please fill all required fields.");
      return;
    }
    setSaving(true);

    let licenseDocUrl: string | null = null;
    if (licenseFile) {
      licenseDocUrl = await uploadLicenseDocument();
      if (!licenseDocUrl) { setSaving(false); return; }
    }

    const payload: any = {
      ...form,
      bed_count: form.bed_count ? parseInt(form.bed_count) : 0,
      license_expiry: form.license_expiry || null,
    };
    if (licenseDocUrl) payload.license_document_url = licenseDocUrl;

    const { error } = editingId
      ? await supabase.from("hospitals").update(payload).eq("id", editingId)
      : await supabase.from("hospitals").insert(payload);

    setSaving(false);
    if (error) { showToast("error", error.message); return; }

    showToast("success", editingId ? "Hospital updated successfully." : "Hospital added successfully.");
    resetForm();
    fetchHospitals();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setLicenseFile(null);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (h: Hospital) => {
    setForm({
      name: h.name,
      address: h.address,
      city: h.city,
      state: h.state,
      pincode: h.pincode,
      phone: h.phone,
      email: h.email,
      hospital_type: h.hospital_type || "private",
      bed_count: h.bed_count?.toString() || "",
      accreditation: h.accreditation || "",
      website: h.website || "",
      license_number: h.license_number || "",
      license_expiry: h.license_expiry || "",
    });
    setEditingId(h.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("hospitals").delete().eq("id", id);
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Hospital deleted.");
    setDeleteConfirm(null);
    fetchHospitals();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("hospitals").update({ is_active: !current }).eq("id", id);
    fetchHospitals();
  };

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF]">
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
      <header className="bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/admin" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Admin Panel</span>
            </Link>
            <div className="flex items-center gap-3">
              <Hospital className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Management</h1>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(v => !v); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Hospital
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Add / Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="mb-10 bg-white rounded-2xl shadow-xl ring-1 ring-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{editingId ? "Edit Hospital" : "Add New Hospital"}</h2>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Basic Information</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hospital Name <span className="text-red-500">*</span></label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                        placeholder="e.g. Apollo Hospital" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type <span className="text-red-500">*</span></label>
                      <select value={form.hospital_type} onChange={e => setForm(f => ({ ...f, hospital_type: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white capitalize">
                        {HOSPITAL_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address <span className="text-red-500">*</span></label>
                      <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required
                        placeholder="Street address" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">City <span className="text-red-500">*</span></label>
                      <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required
                        placeholder="City" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">State <span className="text-red-500">*</span></label>
                      <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} required
                        placeholder="State" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pincode <span className="text-red-500">*</span></label>
                      <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} required
                        placeholder="6-digit pincode" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone <span className="text-red-500">*</span></label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required
                        placeholder="+91 XXXXXXXXXX" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                        placeholder="contact@hospital.com" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bed Count</label>
                      <input type="number" min="0" value={form.bed_count} onChange={e => setForm(f => ({ ...f, bed_count: e.target.value }))}
                        placeholder="0" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Accreditation</label>
                      <input value={form.accreditation} onChange={e => setForm(f => ({ ...f, accreditation: e.target.value }))}
                        placeholder="e.g. NABH, JCI" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Website</label>
                      <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                        placeholder="https://hospital.com" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* License Information */}
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">License &amp; Compliance</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Number</label>
                      <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                        placeholder="e.g. MH/HOS/2024/1234" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Expiry Date</label>
                      <input type="date" value={form.license_expiry} onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Document</label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                      >
                        <Upload className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                        <span className="text-sm text-slate-500 group-hover:text-blue-600 truncate">
                          {licenseFile ? licenseFile.name : "Upload PDF / Image"}
                        </span>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saving || uploading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all">
                    {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? "Save Changes" : "Add Hospital"}
                  </button>
                  <button type="button" onClick={resetForm} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hospitals Table */}
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Registered Hospitals</h2>
              <p className="text-sm text-slate-500 mt-0.5">{hospitals.length} hospital{hospitals.length !== 1 ? "s" : ""} on the platform</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : hospitals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Hospital className="h-14 w-14 mb-4 text-slate-200" />
              <p className="font-semibold text-slate-500">No hospitals yet</p>
              <p className="text-sm mt-1">Click &quot;Add Hospital&quot; to register your first facility.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">License</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Beds</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {hospitals.map((h, i) => {
                    const isExpiringSoon = h.license_expiry
                      ? new Date(h.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      : false;
                    return (
                      <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Hospital className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{h.name}</p>
                              <p className="text-xs text-slate-500">{h.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-700 font-medium">{h.city}, {h.state}</p>
                          <p className="text-xs text-slate-400">{h.pincode}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                            {h.hospital_type || "private"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {h.license_number ? (
                            <div>
                              <p className="font-medium text-slate-700 font-mono text-xs">{h.license_number}</p>
                              {h.license_expiry && (
                                <p className={`text-xs mt-0.5 font-medium ${isExpiringSoon ? "text-amber-600" : "text-slate-400"}`}>
                                  {isExpiringSoon && "⚠ "}Exp: {new Date(h.license_expiry).toLocaleDateString("en-IN")}
                                </p>
                              )}
                              {h.license_document_url && (
                                <a href={h.license_document_url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium">
                                  <FileText className="h-3 w-3" /> View Doc
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not provided</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-800">{h.bed_count || 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          <button onClick={() => toggleActive(h.id, h.is_active ?? true)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors ${
                              (h.is_active ?? true)
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${(h.is_active ?? true) ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {(h.is_active ?? true) ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {h.website && (
                              <a href={h.website} target="_blank" rel="noreferrer"
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button onClick={() => handleEdit(h)}
                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(h.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Hospital?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">This will also remove all associated departments and doctors. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
