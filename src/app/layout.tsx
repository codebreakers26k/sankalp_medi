import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediQueue Pro — Smart Hospital Queue Management System",
  description:
    "Experience seamless hospital visits with intelligent queue tracking, appointment booking, and digital waiting rooms. AI-powered healthcare platform.",
  keywords: [
    "hospital queue management",
    "appointment booking",
    "digital waiting room",
    "healthcare SaaS",
    "patient queue system",
  ],
  openGraph: {
    title: "MediQueue Pro — Smart Hospital Queue Management",
    description:
      "AI-powered hospital queue management with real-time updates, appointment booking, and digital waiting rooms.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="antialiased transition-colors duration-300">
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
