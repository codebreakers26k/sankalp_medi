import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePatientId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `PAT-${timestamp}-${random}`.toUpperCase();
}

export function generateTokenNumber(hospitalId: string, date: Date): number {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000);
  return parseInt(`${dateStr.slice(-4)}${random}`);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function calculateEstimatedWaitTime(
  position: number,
  averageTreatmentTime: number,
  emergencyCount: number = 0
): number {
  const emergencyDelay = emergencyCount * 15;
  return (position * averageTreatmentTime) + emergencyDelay;
}
