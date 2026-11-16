"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AuthRedirectPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    const role = user.publicMetadata?.role as string | undefined;

    // Ensure user record in database
    const email = user.primaryEmailAddress?.emailAddress;
    const name = user.fullName || user.firstName || "User";
    if (email) {
      fetch("/api/ensure-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name,
          email,
          mobile: user.primaryPhoneNumber?.phoneNumber || null,
        }),
      }).catch((err) => console.error("Error ensuring user:", err));
    }

    // Role-based navigation
    if (role === "admin") {
      router.replace("/admin");
    } else if (role === "doctor") {
      router.replace("/doctor");
    } else {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-transparent border-t-[#2563EB] animate-spin" />
        <p className="text-sm font-medium text-zinc-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
