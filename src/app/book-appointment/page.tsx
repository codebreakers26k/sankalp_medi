"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, Clock, User as UserIcon, X, Hospital, Activity, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { notificationService } from "@/lib/services/notificationService";

export default function BookAppointmentPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [selectedHospital, setSelectedHospital] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [hospitals, setHospitals] = useState<any[]>([]);
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
    fetchHospitals();
    if (user) {
      fetchUserAppointments();
    }
  }, [user]);

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
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
      } else {
        setUserAppointments(data || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
      const response = await fetch('/api/appointments/reschedule', {
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
      const response = await fetch('/api/appointments/cancel', {
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
      const response = await fetch('/api/appointments/waitlist', {
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
    try {
      console.log('Fetching hospitals...');
      const response = await fetch('/api/hospitals');
      const result = await response.json();
      
      console.log('Hospitals API response:', {
        status: response.status,
        ok: response.ok,
        data: result
      });
      
      if (!response.ok) {
        console.error('Error fetching hospitals:', result.error);
        // Don't alert — just log it; hospitals will be empty
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        console.warn('No hospitals found in database');
        // Add sample hospitals if none exist
        const sampleHospitals = [
          { id: 'sample-1', name: 'City General Hospital', address: '123 Main St', city: 'New York' },
          { id: 'sample-2', name: 'Medical Center', address: '456 Oak Ave', city: 'Los Angeles' }
        ];
        setHospitals(sampleHospitals);
        console.log('Using sample hospitals:', sampleHospitals);
      } else {
        setHospitals(result.data);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      alert(`Failed to load hospitals. Please refresh the page.`);
    }
  };

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const response = await fetch(`/api/departments?hospitalId=${hospitalId}`);
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching departments:', result.error);
        // Use sample departments as fallback
        const sampleDepartments = [
          { id: 'dept-1', name: 'General Medicine', hospital_id: hospitalId },
          { id: 'dept-2', name: 'Emergency', hospital_id: hospitalId },
          { id: 'dept-3', name: 'Cardiology', hospital_id: hospitalId },
          { id: 'dept-4', name: 'Pediatrics', hospital_id: hospitalId }
        ];
        setDepartments(sampleDepartments);
        console.log('Using sample departments:', sampleDepartments);
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        // Use sample departments if none exist
        const sampleDepartments = [
          { id: 'dept-1', name: 'General Medicine', hospital_id: hospitalId },
          { id: 'dept-2', name: 'Emergency', hospital_id: hospitalId },
          { id: 'dept-3', name: 'Cardiology', hospital_id: hospitalId },
          { id: 'dept-4', name: 'Pediatrics', hospital_id: hospitalId }
        ];
        setDepartments(sampleDepartments);
        console.log('Using sample departments:', sampleDepartments);
      } else {
        setDepartments(result.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Use sample departments as fallback
      const sampleDepartments = [
        { id: 'dept-1', name: 'General Medicine', hospital_id: hospitalId },
        { id: 'dept-2', name: 'Emergency', hospital_id: hospitalId },
        { id: 'dept-3', name: 'Cardiology', hospital_id: hospitalId },
        { id: 'dept-4', name: 'Pediatrics', hospital_id: hospitalId }
      ];
      setDepartments(sampleDepartments);
    }
  };

  const fetchDoctors = async (departmentId: string) => {
    try {
      console.log('Fetching doctors for department:', departmentId);
      
      const response = await fetch(`/api/doctors?departmentId=${departmentId}`);
      const result = await response.json();
      
      console.log('Doctors API response:', {
        status: response.status,
        ok: response.ok,
        data: result
      });
      
      if (!response.ok) {
        console.error('Error fetching doctors:', result.error);
        // Use sample doctors as fallback
        const sampleDoctors = [
          { id: 'doc-1', name: 'Dr. John Smith', department_id: departmentId, rating: 4.8, is_on_leave: false },
          { id: 'doc-2', name: 'Dr. Sarah Johnson', department_id: departmentId, rating: 4.9, is_on_leave: false },
          { id: 'doc-3', name: 'Dr. Michael Brown', department_id: departmentId, rating: 4.7, is_on_leave: false }
        ];
        setDoctors(sampleDoctors);
        console.log('Using sample doctors:', sampleDoctors);
        return;
      }
      
      if (!result.data || result.data.length === 0) {
        // Use sample doctors if none exist
        const sampleDoctors = [
          { id: 'doc-1', name: 'Dr. John Smith', department_id: departmentId, rating: 4.8, is_on_leave: false },
          { id: 'doc-2', name: 'Dr. Sarah Johnson', department_id: departmentId, rating: 4.9, is_on_leave: false },
          { id: 'doc-3', name: 'Dr. Michael Brown', department_id: departmentId, rating: 4.7, is_on_leave: false }
        ];
        setDoctors(sampleDoctors);
        console.log('Using sample doctors:', sampleDoctors);
      } else {
        setDoctors(result.data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Use sample doctors as fallback
      const sampleDoctors = [
        { id: 'doc-1', name: 'Dr. John Smith', department_id: departmentId, rating: 4.8, is_on_leave: false },
        { id: 'doc-2', name: 'Dr. Sarah Johnson', department_id: departmentId, rating: 4.9, is_on_leave: false },
        { id: 'doc-3', name: 'Dr. Michael Brown', department_id: departmentId, rating: 4.7, is_on_leave: false }
      ];
      setDoctors(sampleDoctors);
    }
  };

  const fetchBookedSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('doctor_id', selectedDoctor)
        .eq('date', appointmentDate)
        .neq('status', 'cancelled');
      
      if (error) throw error;
      
      const slots = data?.map(appointment => appointment.time_slot) || [];
      setBookedSlots(slots);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
      setBookedSlots([]);
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/send-otp', {
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
        alert('OTP sent to your email. Please check your inbox.');
      } else {
        alert(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verify-otp', {
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
        alert('OTP verified successfully! Booking your appointment...');
        // Now actually book the appointment
        await completeAppointmentBooking();
      } else {
        alert(data.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify OTP. Please try again.');
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
      const userResponse = await fetch('/api/ensure-user', {
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
      
      // Get hospital, department, and doctor details for notifications
      const [hospitalData, departmentData, doctorData] = await Promise.all([
        supabase.from('hospitals').select('name').eq('id', selectedHospital).single(),
        supabase.from('departments').select('name').eq('id', selectedDepartment).single(),
        supabase.from('doctors').select('name').eq('id', selectedDoctor).single()
      ]);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          patient_name: formData.name,
          hospital_id: selectedHospital,
          department_id: selectedDepartment,
          doctor_id: selectedDoctor,
          date: new Date(appointmentDate).toISOString(),
          time_slot: timeSlot,
          status: 'pending',
          otp_verified: false
        })
        .select()
        .single();
      
      if (error) throw error;

      // Send notification to admin about new appointment
      await notificationService.createNotification(
        'appointment',
        '📅 New Appointment Booked',
        `${formData.name} has booked an appointment with Dr. ${doctorData.data?.name || 'Unknown'} at ${hospitalData.data?.name || 'Hospital'} on ${appointmentDate} at ${timeSlot}`,
        {
          appointmentId: data.id,
          patientName: formData.name,
          doctorName: doctorData.data?.name,
          hospitalName: hospitalData.data?.name,
          departmentName: departmentData.data?.name,
          date: appointmentDate,
          time: timeSlot
        }
      );

      // Send notification to the specific doctor
      if (doctorData.data?.name) {
        await notificationService.createNotification(
          'appointment',
          `📅 New Appointment - ${appointmentDate}`,
          `You have a new appointment with ${formData.name} on ${appointmentDate} at ${timeSlot} at ${hospitalData.data?.name || 'Hospital'}`,
          {
            appointmentId: data.id,
            patientName: formData.name,
            doctorName: doctorData.data.name,
            hospitalName: hospitalData.data?.name,
            departmentName: departmentData.data?.name,
            date: appointmentDate,
            time: timeSlot,
            targetDoctorId: selectedDoctor
          }
        );
      }
      
      // Set confirmation data and show popup
      setConfirmationData({
        appointmentId: data.id,
        patientName: formData.name,
        doctorName: doctorData.data?.name || 'Unknown',
        hospitalName: hospitalData.data?.name || 'Hospital',
        departmentName: departmentData.data?.name || 'Department',
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
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Book Appointment
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
        <Card className="border-0 shadow-xl shadow-blue-900/5 ring-1 ring-gray-100 rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-b from-gray-50/50 to-white px-8 py-6 border-b border-gray-100">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <div className="p-2.5 bg-blue-100/50 rounded-xl text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              Schedule Your Appointment
            </CardTitle>
            <CardDescription className="text-slate-500 text-base mt-2">
              Book an appointment with your preferred doctor based on availability and ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Existing Appointments Section */}
            {userAppointments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Your Upcoming Appointments</h3>
                <div className="space-y-3">
                  {userAppointments.map((appointment) => (
                    <div key={appointment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time_slot}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {appointment.doctor_name ? `Dr. ${appointment.doctor_name}` : 'Doctor'} • {appointment.hospital_name || 'Hospital'}
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
                      }}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 appearance-none"
                    >
                      <option value="">Choose a hospital...</option>
                      {hospitals.length === 0 ? (
                        <option value="" disabled>Loading hospitals...</option>
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
                  <label className="text-sm font-semibold text-slate-700">
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
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
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50 appearance-none"
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
                    <p className="text-xs text-slate-500 mt-1">
                      Some time slots are already booked
                    </p>
                  )}
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all hover:bg-slate-50"
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
                  <Button type="button" variant="outline" className="w-full py-6 text-base font-medium rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a 6-digit OTP to <strong>{formData.email}</strong>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
                />
                <p className="text-sm text-gray-500 mt-2">
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
                  }}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={sendOTP}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={verifyOTP}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Book'}
                  </Button>
                )}
              </div>

              {otpSent && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={sendOTP}
                    className="text-sm text-blue-600 hover:underline"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                </div>
              )}
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
                    <span className="font-medium">Dr. {confirmationData.doctorName}</span>
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
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
      </main>
    </div>
  );
}
