import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <html lang="en">
        <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
