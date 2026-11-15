"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, Hospital, ArrowLeft, Edit, Shield, Activity, Save, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    mobile: "",
    patientId: "",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
    if (user) {
      setProfileData({
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        mobile: user.phoneNumbers?.[0]?.phoneNumber || "",
        patientId: `PAT${user.id.slice(-8).toUpperCase()}`,
      });
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleSave = () => {
    // TODO: Save profile data to Supabase
    console.log("Saving profile:", profileData);
    setIsEditing(false);
    alert("Profile update will be available once the database is set up!");
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
          className="absolute -top-[20%] right-[10%] w-[50%] h-[50%] bg-[#7C3AED] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-[#2563EB] rounded-full mix-blend-multiply filter blur-[120px] opacity-10"
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
              My Profile
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              Verified
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Patient Settings</h2>
          <p className="text-slate-500 text-lg">Manage your personal information and preferences</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="md:col-span-1 border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 h-fit">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100 rounded-t-2xl text-center pb-2 border-b-0">
              <CardTitle className="text-lg font-bold text-slate-800">Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2 p-6">
              <div className="relative group cursor-pointer mb-6">
                <div className="w-36 h-36 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-5xl font-black shadow-lg ring-4 ring-white group-hover:shadow-blue-500/30 transition-shadow">
                  {user.firstName?.[0] || user.fullName?.[0] || "U"}
                </div>
                <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Edit className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-1">{user.fullName}</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-slate-600">
                <Shield className="w-3.5 h-3.5" />
                <p className="text-xs font-bold tracking-wider">ID: {profileData.patientId}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100 rounded-t-2xl">
              <div className="flex justify-between items-center w-full">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Personal Information</CardTitle>
                  <CardDescription className="text-slate-500 mt-1">Manage your personal details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6">
                <div>
                  <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 bg-blue-50/30 transition-all shadow-inner"
                    />
                  ) : (
                    <p className="text-slate-900 px-4 py-3 bg-slate-50/80 rounded-xl font-medium border border-slate-100">{profileData.name}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <Mail className="h-4 w-4 mr-2 text-indigo-500" />
                    Email Address
                  </label>
                  <div className="relative">
                    <p className="text-slate-600 px-4 py-3 bg-slate-50 rounded-xl font-medium border border-slate-100">{profileData.email}</p>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                       <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-2 ml-1">Managed securely by Clerk</p>
                </div>

                <div>
                  <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <Phone className="h-4 w-4 mr-2 text-emerald-500" />
                    Mobile Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.mobile}
                      onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                      placeholder="+91 1234567890"
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 bg-blue-50/30 transition-all shadow-inner"
                    />
                  ) : (
                    <p className="text-slate-900 px-4 py-3 bg-slate-50/80 rounded-xl font-medium border border-slate-100">
                      {profileData.mobile || <span className="text-slate-400 italic font-normal">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                    Member Since
                  </label>
                  <p className="text-slate-700 px-4 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100 font-semibold tracking-wide">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Hospital className="h-5 w-5 text-indigo-500" />
                Medical History
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">Your hospital visit history</CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-slate-50/30">
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Activity className="h-8 w-8 text-indigo-300" />
                </div>
                <p className="font-semibold text-slate-700 text-lg">No visit history</p>
                <p className="text-sm text-slate-500 mt-1">Completed visits will appear here</p>
                <Button variant="link" className="mt-2 text-indigo-600" asChild>
                  <Link href="/join-queue">Join a queue now</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-b from-slate-50/50 to-white px-6 py-5 border-b border-slate-100">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                Recent Appointments
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">Your appointment history</CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-slate-50/30">
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-emerald-300" />
                </div>
                <p className="font-semibold text-slate-700 text-lg">No appointments</p>
                <p className="text-sm text-slate-500 mt-1">Scheduled appointments will appear here</p>
                <Button variant="link" className="mt-2 text-emerald-600" asChild>
                  <Link href="/book-appointment">Book an appointment</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
