"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Volume2 } from "lucide-react";

interface PatientNotificationProps {
  patientId: string;
}

export function PatientNotification({ patientId }: PatientNotificationProps) {
  const [notification, setNotification] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const checkPatientCall = async () => {
      const response = await fetch("/backend-api/users/me/dashboard", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      const called = (result.data?.queue || []).find((entry: any) => entry.status === "in-treatment");
      if (called && called.id !== notification?.id) {
        setNotification({ id: called.id, tokenNumber: called.token_number, doctorName: called.doctor_name,
          departmentName: called.department_name, calledAt: called.called_at });
        if (soundEnabled) playNotificationSound();
      }
    };

    if (patientId) {
      checkPatientCall();
      const interval = window.setInterval(checkPatientCall, 10_000);
      return () => window.clearInterval(interval);
    }
  }, [patientId, soundEnabled, notification?.id]);

  const playNotificationSound = () => {
    // Create a notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1000; // 1000 Hz tone
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
  };

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-green-50 border-green-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Bell className="h-6 w-6 text-white animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">You're Being Called!</h3>
              <p className="text-green-800 mt-1">
                Token #{notification.tokenNumber} - Please proceed to the consultation room
              </p>
              <p className="text-sm text-green-600 mt-2">
                Called at: {new Date(notification.calledAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 w-8 p-0"
              >
                <Volume2 className={`h-4 w-4 ${soundEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotification(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
