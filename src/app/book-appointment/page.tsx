"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, Clock, User as UserIcon, X, Hospital, Activity, Mail, Phone, CheckCircle2, UserCheck, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SunMoonThemeToggle } from "@/components/ui/sun-moon-theme-toggle";

const formatDoctorName = (name?: string | null) => {
  const trimmedName = name?.trim();
  if (!trimmedName) return "Doctor";
  return /^dr\.?\s/i.test(trimmedName) ? trimmedName : `Dr. ${trimmedName}`;
};

export default function BookAppointmentPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
  });
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [userAppointments, setUserAppointments] = useState<any[]>([]);
  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [cancelData, setCancelData] = useState<any>(null);
  const [waitlistData, setWaitlistData] = useState<any>(null);

  // Gemini AI Triage State
  const [showAITriageModal, setShowAITriageModal] = useState(false);
  const [aiSymptoms, setAiSymptoms] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
    if (user) {
      setFormData({
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        mobile: "",
      });
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchHospitals();
      if (user) fetchUserAppointments();
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (selectedHospital) {
      fetchDepartments(selectedHospital);
    } else {
      setDepartments([]);
      setDoctors([]);
    }
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDoctors(selectedDepartment);
    } else {
      setDoctors([]);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      fetchBookedSlots();
    } else {
      setBookedSlots([]);
    }
  }, [selectedDoctor, appointmentDate]);

  // Fetch user appointments
  const fetchUserAppointments = async () => {
    if (!user) return;
    try {
      const response = await fetch('/backend-api/appointments/mine');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load appointments');
      setUserAppointments((result.data || []).filter((appointment: any) =>
        appointment.status === 'pending' || appointment.status === 'confirmed'));
    } catch (error) {
      console.warn('Appointments are temporarily unavailable:', error);
    }
  };

  // Reschedule appointment
  const handleReschedule = async (appointment: any) => {
    setRescheduleData(appointment);
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!rescheduleData || !user) return;

    try {
      const response = await fetch('/backend-api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: rescheduleData.id,
          newDate: rescheduleData.newDate,
          newTimeSlot: rescheduleData.newTimeSlot,
          reason: rescheduleData.reason,
          userId: user.id
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Appointment rescheduled successfully!');
        setShowRescheduleModal(false);
        fetchUserAppointments();
      } else {
        alert(result.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      alert('Failed to reschedule appointment');
    }
  };

  // Cancel appointment
  const handleCancel = async (appointment: any) => {
    setCancelData(appointment);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelData || !user) return;

    try {
      const response = await fetch('/backend-api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: cancelData.id,
          reason: cancelData.cancellationReason,
          userId: user.id,
          notifyDoctor: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Appointment cancelled successfully!');
        setShowCancelModal(false);
        fetchUserAppointments();
      } else {
        alert(result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert('Failed to cancel appointment');
    }
  };

  const handleAITriage = async () => {
    if (!aiSymptoms.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/backend-api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: aiSymptoms }),
      });
      const data = await res.json();
      if (data.success && data.triage) {
        setAiResult(data.triage);
        // Match recommended department name with available departments
        const match = departments.find((d) =>
          d.name.toLowerCase().includes(data.triage.department.toLowerCase()) ||
          data.triage.department.toLowerCase().includes(d.name.toLowerCase())
        );
        if (match) {
          setSelectedDepartment(match.id);
          setSelectedDoctor("");
        }
      }
    } catch (e) {
      console.error("AI Triage error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Add to waitlist
  const handleWaitlist = async (doctorId: string, date: string, timeSlot: string) => {
    if (!user) return;

    setWaitlistData({
      doctorId,
      date,
      timeSlot,
      userName: user.fullName,
      userEmail: user.primaryEmailAddress?.emailAddress
    });
    setShowWaitlistModal(true);
  };

  const confirmWaitlist = async () => {
    if (!waitlistData || !user) return;

    try {
      const response = await fetch('/backend-api/appointments/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...waitlistData,
          userId: user.id,
          reason: waitlistData.reason
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`You are position ${result.data.position} on the waitlist!`);
        setShowWaitlistModal(false);
      } else {
        alert(result.error || 'Failed to add to waitlist');
      }
    } catch (error) {
      console.error('Waitlist error:', error);
      alert('Failed to add to waitlist');
    }
  };

  const fetchHospitals = async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch('/backend-api/hospitals');
      const result = await response.json();

      if (!response.ok) {
        setHospitals([]);
        setCatalogError(result.error || 'Hospitals are temporarily unavailable.');
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        console.warn('No hospitals found in database');
        setHospitals([]);
      } else {
        setHospitals(result.data);
      }
    } catch (error) {
      console.warn('Hospitals are temporarily unavailable:', error);
      setHospitals([]);
      setCatalogError('Could not connect to the hospital service.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const response = await fetch(`/backend-api/departments?hospitalId=${hospitalId}`);
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching departments:', result.error);
        setDepartments([]);
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        setDepartments([]);
      } else {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const fetchDoctors = async (departmentId: string) => {
    try {
      console.log('Fetching doctors for department:', departmentId);
      
      const response = await fetch(`/backend-api/doctors?departmentId=${departmentId}`);
      const result = await response.json();
      
      console.log('Doctors API response:', {
        status: response.status,
        ok: response.ok,
        data: result
      });
      
      if (!response.ok) {
        console.error('Error fetching doctors:', result.error);
        setDoctors([]);
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        setDoctors([]);
      } else {
        setDoctors(result.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    }
  };

  const fetchBookedSlots = async () => {
    try {
      const response = await fetch(`/backend-api/appointments/booked-slots?doctorId=${encodeURIComponent(selectedDoctor)}&date=${encodeURIComponent(appointmentDate)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load booked slots');
      setBookedSlots(result.data || []);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      setBookedSlots([]);
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      const response = await fetch('/backend-api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          purpose: 'appointment'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
        setOtpNotice('OTP sent to your email. Please check your inbox or Spam folder.');
      } else {
        setOtpError(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setOtpError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setOtpError(null);
    try {
      const response = await fetch('/backend-api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: otp,
          purpose: 'appointment'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpVerified(true);
        setShowOTPModal(false);
        // Now actually book the appointment
        await completeAppointmentBooking();
      } else {
        setOtpError(data.error || 'Invalid OTP. Please check and try again.');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validate that the selected time slot is not already booked
    if (bookedSlots.includes(timeSlot)) {
      // Offer waitlist option
      if (confirm('This time slot is already booked. Would you like to join the waitlist?')) {
        handleWaitlist(selectedDoctor, appointmentDate, timeSlot);
      }
      return;
    }

    // Store appointment data for later use after OTP verification
    setPendingAppointmentData({
      selectedHospital,
      selectedDepartment,
      selectedDoctor,
      appointmentDate,
      timeSlot,
      formData
    });

    // Show OTP modal
    setShowOTPModal(true);
    
    // Automatically send OTP
    await sendOTP();
  };

  const completeAppointmentBooking = async () => {
    if (!user || !pendingAppointmentData) return;
    
    setLoading(true);
    try {
      // First, ensure user exists in the database using server-side API
      const userResponse = await fetch('/backend-api/ensure-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const bookingResponse = await fetch('/backend-api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: formData.name,
          hospitalId: selectedHospital,
          departmentId: selectedDepartment,
          doctorId: selectedDoctor,
          date: appointmentDate,
          timeSlot,
        }),
      });
      const bookingResult = await bookingResponse.json();
      if (!bookingResponse.ok) throw new Error(bookingResult.error || 'Failed to book appointment');
      const data = bookingResult.data;
      const doctorName = data.doctor_name || doctors.find(d => d.id === selectedDoctor)?.name || 'Doctor';
      const hospitalName = data.hospital_name || hospitals.find(h => h.id === selectedHospital)?.name || 'Hospital';
      const departmentName = data.department_name || departments.find(d => d.id === selectedDepartment)?.name || 'Department';

      // Send confirmation email via email service
      try {
        await fetch('/backend-api/appointments/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            appointmentDetails: {
              appointmentId: data.id,
              patientName: formData.name,
              doctorName,
              hospitalName,
              departmentName,
              date: appointmentDate,
              timeSlot
            }
          })
        });
      } catch (mailErr) {
        console.warn('Confirmation email dispatch warning:', mailErr);
      }

      // Set confirmation data and show popup
      setConfirmationData({
        appointmentId: data.id,
        patientName: formData.name,
        doctorName,
        hospitalName,
        departmentName,
        date: appointmentDate,
        time: timeSlot,
        status: 'confirmed'
      });
      setShowConfirmation(true);
      
      // Reset form
      setSelectedHospital("");
      setSelectedDepartment("");
      setSelectedDoctor("");
      setAppointmentDate("");
      setTimeSlot("");
      setBookedSlots([]);
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      alert(`Failed to book appointment. Error: ${error?.message || 'Unknown error'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] dark:from-[#090D16] dark:via-[#0F172A] dark:to-[#0B1120] text-zinc-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-300">
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

      <header className="bg-white/70 dark:bg-[#090D16]/80 backdrop-blur-xl border-b border-[#E5E7EB] dark:border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gray-50 dark:bg-zinc-800 rounded-full group-hover:bg-blue-50 transition-colors">
                <ArrowLeft className="h-5 w-5 text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-slate-600 dark:text-zinc-400 dark:text-zinc-300 font-medium group-hover:text-slate-900 dark:text-white dark:group-hover:text-white transition-colors">Back</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Book Appointment
            </h1>
            <div className="w-24 flex justify-end">
              <SunMoonThemeToggle size={38} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
        <Card className="border-0 shadow-xl shadow-blue-900/5 ring-1 ring-gray-100 dark:ring-zinc-800 rounded-2xl overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-transparent dark:border-zinc-800">
          <CardHeader className="bg-gradient-to-b from-gray-50/50 to-white dark:from-zinc-800/50 dark:to-zinc-900 px-6 sm:px-8 py-6 border-b border-gray-100 dark:border-zinc-800">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
              <div className="p-2.5 bg-blue-100/50 rounded-xl text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              Schedule Your Appointment
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-zinc-400 text-base mt-2">
              Book an appointment with your preferred doctor based on availability and ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {catalogError && (
              <div className="mx-2 mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Appointment service unavailable</p>
                  <p className="mt-1 text-sm">{catalogError}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={fetchHospitals}>
                  Retry
                </Button>
              </div>
            )}

            {/* Existing Appointments Section */}
            {userAppointments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Your Upcoming Appointments</h3>
                <div className="space-y-3">
                  {userAppointments.map((appointment) => (
                    <div key={appointment.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time_slot}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDoctorName(appointment.doctor_name)} • {appointment.hospital_name || 'Hospital'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Status: <span className={`font-medium ${
                              appointment.status === 'confirmed' ? 'text-green-600' : 
                              appointment.status === 'rescheduled' ? 'text-blue-600' : 'text-gray-600'
                            }`}>{appointment.status}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => handleReschedule(appointment)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50/50 hover:border-blue-300 rounded-xl transition-all"
                          >
                            Reschedule
                          </Button>
                          <Button
                            onClick={() => handleCancel(appointment)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50/50 hover:border-red-300 rounded-xl transition-all"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-2 space-y-8 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
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
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 appearance-none"
                    >
                      <option value="">Choose a hospital...</option>
                      {hospitals.length === 0 ? (
                        <option value="" disabled>
                          {catalogLoading ? 'Loading hospitals...' : 'No hospitals available'}
                        </option>
                      ) : (
                        hospitals.map((hospital) => (
                          <option key={hospital.id} value={hospital.id}>
                            {hospital.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                      Select Department
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAITriageModal(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:from-purple-500/20 hover:to-blue-500/20 transition-all cursor-pointer shadow-xs"
                      title="Describe symptoms for AI-recommended department"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>AI Triage Assistant</span>
                    </button>
                  </div>
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                    >
                      <option value="">Choose a department...</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AI Triage Recommendation Notice */}
                  {aiResult && (
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>AI Suggestion: {aiResult.department}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                          aiResult.urgency === 'emergency'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : aiResult.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {aiResult.urgency}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        {aiResult.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} - ⭐ {doctor.rating} ({doctor.total_ratings} reviews)
                        </option>
                      ))
                    ) : selectedDepartment ? (
                      <option value="" disabled>No doctors available in this department</option>
                    ) : (
                      <option value="" disabled>Please select a department first</option>
                    )}
                  </select>
                </div>
                {selectedDepartment && doctors.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No doctors are currently available in this department. Please try another department.
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    Appointment Date
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    </div>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    Time Slot
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 appearance-none"
                    >
                      <option value="">Select time...</option>
                      {[
                        { value: "09:00 AM", label: "09:00 AM" },
                        { value: "10:00 AM", label: "10:00 AM" },
                        { value: "11:00 AM", label: "11:00 AM" },
                        { value: "02:00 PM", label: "02:00 PM" },
                        { value: "03:00 PM", label: "03:00 PM" },
                        { value: "04:00 PM", label: "04:00 PM" }
                      ].map(slot => (
                        <option 
                          key={slot.value} 
                          value={slot.value}
                          disabled={bookedSlots.includes(slot.value)}
                        >
                          {slot.label} {bookedSlots.includes(slot.value) ? "(Booked)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {bookedSlots.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Some time slots are already booked
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                  Mobile Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    placeholder="+91 1234567890"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                  />
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
                  <strong className="font-semibold text-emerald-900">Database Connected:</strong> You will receive an OTP on your email for appointment confirmation.
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full py-6 text-base font-medium rounded-xl border-slate-200 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 hover:text-slate-900 dark:text-white transition-all">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 py-6 text-base font-medium rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300"
                  disabled={loading}
                >
                  <Calendar className="mr-2 h-[18px] w-[18px]" />
                  {loading ? 'Booking...' : 'Book Appointment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </motion.div>

        {/* OTP Verification Modal */}
        {showOTPModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl transition-all">
              <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Verify Your Appointment</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4">
                Booking consultation for <strong className="text-slate-900 dark:text-white">{formData.name}</strong> ({formData.email})
              </p>

              {/* Clerk Instant Verification Box */}
              {user && (
                <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 dark:border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          Verified via Clerk Auth
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Pre-Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Your Clerk session for <strong className="text-zinc-900 dark:text-white">{user.primaryEmailAddress?.emailAddress}</strong> is active and verified.
                      </p>

                      <button
                        type="button"
                        onClick={async () => {
                          setOtpVerified(true);
                          setShowOTPModal(false);
                          await completeAppointmentBooking();
                        }}
                        disabled={loading}
                        className="mt-3 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{loading ? "Confirming..." : "Instant Confirm with Clerk (No Code Needed)"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                </div>
                <span className="relative bg-white dark:bg-zinc-900 px-3 text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  Or Confirm With 6-Digit Code
                </span>
              </div>

              {/* Spam folder tip */}
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Note:</strong> We sent the OTP to <strong>{formData.email}</strong>. If not in primary inbox, check your <strong>Spam / Junk</strong> folder.
              </div>

              {/* Dev / Quick Access Auto-Fill Banner */}
              {devOtp && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                      Quick Access Code
                    </span>
                    <span className="font-mono text-base font-bold text-blue-700 dark:text-blue-300 tracking-wider">
                      {devOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOtp(devOtp); setOtpError(null); }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Auto-Fill OTP
                  </button>
                </div>
              )}

              {otpError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
                  {otpError}
                </div>
              )}

              {otpNotice && !otpError && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {otpNotice}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-2">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(null); }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-3xl font-mono font-bold border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
                />
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 text-center">
                  OTP is valid for 10 minutes
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowOTPModal(false);
                    setOtp('');
                    setOtpSent(false);
                    setOtpError(null);
                    setOtpNotice(null);
                  }}
                  className="flex-1 rounded-xl"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={verifyOTP}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Book'}
                </Button>
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={sendOTP}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  disabled={loading}
                >
                  Didn't receive email? Click to Resend OTP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Confirmation Popup */}
        {showConfirmation && confirmationData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-green-600">Appointment Confirmed!</h2>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    router.push('/dashboard');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Appointment Details</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your appointment has been successfully booked and confirmed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Appointment ID:</span>
                    <span className="font-medium">{confirmationData.appointmentId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Patient:</span>
                    <span className="font-medium">{confirmationData.patientName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium">{formatDoctorName(confirmationData.doctorName)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Hospital:</span>
                    <span className="font-medium">{confirmationData.hospitalName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{confirmationData.departmentName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(confirmationData.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{confirmationData.time}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>✓ Confirmation Sent:</strong> You will receive an email confirmation with your appointment details.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setShowConfirmation(false);
                    router.push('/dashboard');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  View My Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && rescheduleData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-blue-600">Reschedule Appointment</h2>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Current Appointment:</strong><br />
                    {new Date(rescheduleData.date).toLocaleDateString()} at {rescheduleData.time_slot}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleData.newDate || ''}
                    onChange={(e) => setRescheduleData({...rescheduleData, newDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Time
                  </label>
                  <select
                    value={rescheduleData.newTimeSlot || ''}
                    onChange={(e) => setRescheduleData({...rescheduleData, newTimeSlot: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select time</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rescheduling
                  </label>
                  <textarea
                    value={rescheduleData.reason || ''}
                    onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional: Reason for rescheduling..."
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={confirmReschedule}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Reschedule
                  </Button>
                  <Button
                    onClick={() => setShowRescheduleModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && cancelData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-red-600">Cancel Appointment</h2>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    <strong>Appointment to Cancel:</strong><br />
                    {new Date(cancelData.date).toLocaleDateString()} at {cancelData.time_slot}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Cancellation
                  </label>
                  <textarea
                    value={cancelData.cancellationReason || ''}
                    onChange={(e) => setCancelData({...cancelData, cancellationReason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Please provide reason for cancellation..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Appointments cannot be cancelled less than 2 hours before the scheduled time.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={confirmCancel}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Confirm Cancellation
                  </Button>
                  <Button
                    onClick={() => setShowCancelModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Keep Appointment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Waitlist Modal */}
        {showWaitlistModal && waitlistData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-orange-600">Join Waitlist</h2>
                <button
                  onClick={() => setShowWaitlistModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-700">
                    <strong>Requested Time Slot:</strong><br />
                    {new Date(waitlistData.date).toLocaleDateString()} at {waitlistData.timeSlot}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Waitlist
                  </label>
                  <textarea
                    value={waitlistData.reason || ''}
                    onChange={(e) => setWaitlistData({...waitlistData, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional: Reason for joining waitlist..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong><br />
                    • You'll be notified if a slot becomes available<br />
                    • You'll have 2 hours to confirm the appointment<br />
                    • Waitlist entries expire after 24 hours
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={confirmWaitlist}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Join Waitlist
                  </Button>
                  <Button
                    onClick={() => setShowWaitlistModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gemini AI Symptom Triage Modal */}
        {showAITriageModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                      AI Clinical Triage
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Powered by Google Gemini 2.5 Flash
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAITriageModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1.5">
                    Describe your symptoms or reason for visit
                  </label>
                  <textarea
                    value={aiSymptoms}
                    onChange={(e) => setAiSymptoms(e.target.value)}
                    placeholder="e.g. Sharp pain in the lower right abdomen since morning with mild nausea..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {aiResult && (
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                        Recommended: {aiResult.department}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        aiResult.urgency === 'emergency'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : aiResult.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {aiResult.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      {aiResult.reasoning}
                    </p>
                    {aiResult.selfCareAdvice?.length > 0 && (
                      <div className="pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Preliminary Guidance
                        </span>
                        <ul className="text-xs text-zinc-600 dark:text-zinc-400 list-disc list-inside space-y-0.5">
                          {aiResult.selfCareAdvice.map((a: string, i: number) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAITriageModal(false)}
                    className="flex-1 rounded-xl"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAITriage}
                    disabled={aiLoading || !aiSymptoms.trim()}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    {aiLoading ? "Analyzing Symptoms..." : "Analyze with Gemini"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
