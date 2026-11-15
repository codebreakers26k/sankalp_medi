"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital, Users, ArrowLeft, User as UserIcon, Calendar, Mail, Activity } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { queueService } from "@/lib/services/queueService";
import { QRCodePopup } from "@/components/QRCodePopup";
import { EmergencyButton } from "@/components/EmergencyButton";
import { QueueStatusWidget } from "@/components/QueueStatusWidget";
import { notificationService } from "@/lib/services/notificationService";

export default function JoinQueuePage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    dob: "",
    email: "",
  });
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
    if (user) {
      setFormData({
        name: user.fullName || "",
        age: "",
        dob: "",
        email: user.primaryEmailAddress?.emailAddress || "",
      });
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchHospitals();
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (selectedHospital) {
      fetchDepartments(selectedHospital);
    } else {
      setDepartments([]);
      setSelectedDepartment('');
    }
    setDoctors([]);
    setSelectedDoctor('');
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedHospital && selectedDepartment) {
      fetchDoctors(selectedHospital, selectedDepartment);
    } else {
      setDoctors([]);
      setSelectedDoctor('');
    }
  }, [selectedHospital, selectedDepartment]);

  const fetchHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setHospitals(data || []);
    } catch (error: any) {
      console.error('Error fetching hospitals:', error?.message || error);
    }
  };

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error?.message || error);
    }
  };

  const fetchDoctors = async (hospitalId: string, departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('department_id', departmentId)
        .eq('is_on_leave', false)
        .order('rating', { ascending: false });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error: any) {
      console.error('Error fetching doctors:', error?.message || error);
    }
  };

  const calculateWaitTime = async (departmentId: string): Promise<number> => {
    try {
      // Get current queue position and average treatment time
      const { data: queueData } = await supabase
        .from('queue')
        .select('position, created_at')
        .eq('department_id', departmentId)
        .eq('status', 'waiting')
        .order('position', { ascending: true });

      // Get average treatment time from doctors in this department
      const { data: doctors } = await supabase
        .from('doctors')
        .select('average_treatment_time')
        .eq('department_id', departmentId);

      const avgTreatmentTime = doctors?.reduce((sum, doc) => sum + (doc.average_treatment_time || 15), 0) || 0 / (doctors?.length || 1);
      
      // Calculate wait time based on queue position
      const queueLength = queueData?.length || 0;
      const estimatedWaitTime = queueLength * (avgTreatmentTime || 15);
      
      return estimatedWaitTime;
    } catch (error) {
      console.error('Error calculating wait time:', error);
      return 30; // Default 30 minutes
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setLoading(true);
    try {
      // First, ensure user exists in the database using server-side API
      const patientId = `PAT${Date.now().toString().slice(-6)}`;
      const userResponse = await fetch('/api/ensure-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          email: formData.email,
          patientId: patientId
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error('User upsert error:', errorData);
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const doctorId = selectedDoctor || null;
      
      // Calculate wait time
      const estimatedWaitTime = await calculateWaitTime(selectedDepartment);
      
      // Get hospital and department names
      const { data: hospitalData } = await supabase
        .from('hospitals')
        .select('name')
        .eq('id', selectedHospital)
        .single();
      
      const { data: departmentData } = await supabase
        .from('departments')
        .select('name')
        .eq('id', selectedDepartment)
        .single();
      
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('name')
        .eq('id', doctorId)
        .single();
      
      // Add to queue using the queue service
      const queueEntry = await queueService.addToQueue({
        patientId: user.id,
        patientName: formData.name,
        hospitalId: selectedHospital,
        departmentId: selectedDepartment,
        doctorId: doctorId || '',
        date: new Date(),
        time: new Date(),
        treatmentType: 'General Consultation',
        isEmergency: false,
        status: 'waiting',
      });
      
      // Send notification to admin
      await notificationService.notifyPatientAdded(
        formData.name,
        hospitalData?.name || 'Unknown Hospital',
        departmentData?.name || 'Unknown Department',
        queueEntry.tokenNumber
      );

      // Show QR popup
      setQrData({
        qrCode: queueEntry.qrCode,
        tokenNumber: queueEntry.tokenNumber,
        patientName: formData.name,
        hospitalName: hospitalData?.name || 'Unknown Hospital',
        departmentName: departmentData?.name || 'Unknown Department',
        doctorName: doctorData?.name || 'Available Doctor',
        estimatedWaitTime,
        position: queueEntry.position || 1,
        isEmergency: false
      });
      setShowQRPopup(true);
    } catch (error: any) {
      console.error('Error joining queue:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      alert(`Failed to join queue. Error: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#2563EB] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] -right-[10%] w-[40%] h-[60%] bg-[#7C3AED] rounded-full mix-blend-multiply filter blur-[120px] opacity-10"
        />
      </div>

      <header className="bg-white/70 backdrop-blur-xl border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Back</span>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Hospital className="h-6 w-6 text-[#2563EB]" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                MediQueue
              </h1>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-8"
        >
          {selectedDepartment && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
              <QueueStatusWidget 
                departmentId={selectedDepartment}
                hospitalId={selectedHospital}
              />
            </motion.div>
          )}
          
          <Card className="border-0 shadow-xl shadow-blue-900/5 ring-1 ring-gray-100 rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-b from-gray-50/50 to-white px-8 py-6 border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <div className="p-2.5 bg-blue-100/50 rounded-xl text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              Join Hospital Queue
            </CardTitle>
            <CardDescription className="text-slate-500 text-base mt-2">
              Fill in your details to join the queue at your selected hospital and department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="p-2 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Select Hospital
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Hospital className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={selectedHospital}
                      onChange={(e) => {
                        setSelectedHospital(e.target.value);
                        setSelectedDepartment('');
                        setSelectedDoctor('');
                        setDoctors([]);
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 appearance-none"
                    >
                      <option value="">Choose a hospital...</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Select Department
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Activity className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setSelectedDoctor('');
                      }}
                      required
                      disabled={!selectedHospital}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    >
                      <option value="">Choose a department...</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Select Doctor
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    required
                    disabled={!selectedDepartment}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Enter your full name"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Age
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                      min="1"
                      max="120"
                      placeholder="Your age"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Date of Birth
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    </div>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex gap-3"
              >
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  <strong className="font-semibold text-emerald-900">Digital Token Generation:</strong> Your QR code and token number will be automatically generated upon joining. Live wait times are calculated using AI.
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full py-6 text-base font-medium rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 py-6 text-base font-medium rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? 'Joining Queue...' : 'Confirm & Join Queue'}
                </Button>
              </div>
            </form>

            {/* Emergency Button */}
            <div className="border-t border-slate-100 pt-8 mt-8 pb-4">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 mb-4 tracking-wide uppercase">
                  Require Immediate Attention?
                </p>
                <motion.div whileHover={{ scale: 1.02 }}>
                  <EmergencyButton 
                    hospitalId={selectedHospital}
                    departmentId={selectedDepartment}
                    onEmergencyCreated={(data) => {
                      console.log('Emergency created:', data);
                    }}
                  />
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </main>

    {/* QR Code Popup */}
    <QRCodePopup
      isOpen={showQRPopup}
      onClose={() => setShowQRPopup(false)}
      qrCode={qrData?.qrCode || ''}
      tokenNumber={qrData?.tokenNumber || 0}
      patientName={qrData?.patientName || ''}
      hospitalName={qrData?.hospitalName || ''}
      departmentName={qrData?.departmentName || ''}
      doctorName={qrData?.doctorName || ''}
      estimatedWaitTime={qrData?.estimatedWaitTime || 0}
      position={qrData?.position || 1}
      isEmergency={qrData?.isEmergency || false}
    />
    </div>
  );
}
