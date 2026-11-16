"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    signOut({ redirectUrl: "/" }).catch(() => {
      router.push("/");
    });
  }, [signOut, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#2563EB] animate-spin" />
        <p className="text-sm font-medium text-zinc-600">Signing out and redirecting to landing page...</p>
      </div>
    </div>
  );
}
