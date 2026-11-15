"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Bell, Settings, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { notificationService } from "@/lib/services/notificationService";

interface QueueEntry {
  id: string;
  tokenNumber: number;
  patientName: string;
  hospitalName: string;
  departmentName: string;
  doctorName: string;
  position: number;
  status: string;
  isEmergency: boolean;
  estimatedWaitTime: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export function AdminQueueManager() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        const { data, error } = await supabase
          .from('queue')
          .select(`
            *,
            hospitals!queue_hospital_id_fkey(name),
            departments!queue_department_id_fkey(name),
            doctors!queue_doctor_id_fkey(name)
          `)
          .in('status', ['waiting', 'in-treatment'])
          .order('position', { ascending: true });

        if (error) throw error;

        const formattedData = (data || []).map(item => ({
          id: item.id,
          tokenNumber: item.token_number,
          patientName: item.patient_name,
          hospitalName: item.hospitals?.name || 'Unknown Hospital',
          departmentName: item.departments?.name || 'Unknown Department',
          doctorName: item.doctors?.name || 'Available Doctor',
          position: item.position || 0,
          status: item.status,
          isEmergency: item.is_emergency || false,
          estimatedWaitTime: item.estimated_wait_time || 0
        }));

        setQueueEntries(formattedData);
      } catch (error) {
        console.error('Error fetching queue data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchNotifications = async () => {
      const notifs = await notificationService.getNotifications(20);
      setNotifications(notifs);
    };

    fetchQueueData();
    fetchNotifications();

    // Set up real-time subscriptions
    const queueSubscription = supabase
      .channel('admin-queue')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'queue'
        }, 
        () => {
          fetchQueueData();
        }
      )
      .subscribe();

    const notificationSubscription = notificationService.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
    });

    return () => {
      queueSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
    };
  }, []);

  const callNextPatient = async () => {
    const waitingPatients = queueEntries.filter(q => q.status === 'waiting');
    
    if (waitingPatients.length === 0) {
      alert('No patients waiting in queue');
      return;
    }

    setCallingNext(true);

    try {
      // Priority: Emergency patients first, then by position
      const nextPatient = waitingPatients.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return a.position - b.position;
      })[0];

      // Update patient status to in-treatment
      const { error } = await supabase
        .from('queue')
        .update({ 
          status: 'in-treatment',
          called_at: new Date().toISOString()
        })
        .eq('id', nextPatient.id);

      if (error) throw error;

      // Update remaining patients' positions
      const patientsToUpdate = waitingPatients.filter(q => q.id !== nextPatient.id);
      for (let i = 0; i < patientsToUpdate.length; i++) {
        await supabase
          .from('queue')
          .update({ position: i + 1 })
          .eq('id', patientsToUpdate[i].id);
      }

      // Send notification
      await notificationService.notifyPatientCalled(
        nextPatient.patientName,
        nextPatient.doctorName,
        nextPatient.tokenNumber
      );

      // Show success message
      alert(`Calling next patient: ${nextPatient.patientName} (Token #${nextPatient.tokenNumber})`);
    } catch (error) {
      console.error('Error calling next patient:', error);
      alert('Failed to call next patient. Please try again.');
    } finally {
      setCallingNext(false);
    }
  };

  const rearrangeQueue = async (patientId: string, newPosition: number) => {
    try {
      const filteredQueue = queueEntries.filter(q => q.status === 'waiting');
      const patient = filteredQueue.find(q => q.id === patientId);
      
      if (!patient) return;

      // Update positions for all affected patients
      const oldPosition = patient.position;
      
      if (newPosition < oldPosition) {
        // Moving patient forward
        for (const p of filteredQueue) {
          if (p.position >= newPosition && p.position < oldPosition && p.id !== patientId) {
            await supabase.from('queue').update({ position: p.position + 1 }).eq('id', p.id);
          }
        }
      } else {
        // Moving patient backward
        for (const p of filteredQueue) {
          if (p.position > oldPosition && p.position <= newPosition && p.id !== patientId) {
            await supabase.from('queue').update({ position: p.position - 1 }).eq('id', p.id);
          }
        }
      }

      // Update the patient's position
      await supabase.from('queue').update({ position: newPosition }).eq('id', patientId);
    } catch (error) {
      console.error('Error rearranging queue:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredQueue = selectedDepartment === "all" 
    ? queueEntries 
    : queueEntries.filter(q => q.departmentName === selectedDepartment);

  const departments = Array.from(new Set(queueEntries.map(q => q.departmentName)));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-red-600" />
                <span>Recent Notifications</span>
                <Badge variant="destructive">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
                Mark All Read
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded text-sm ${
                    notification.read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-gray-600">{notification.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {notification.createdAt.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Queue Management</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <Button
                onClick={callNextPatient}
                disabled={callingNext || filteredQueue.filter(q => q.status === 'waiting').length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {callingNext ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Next Patient
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredQueue
              .filter(q => q.status === 'waiting')
              .map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border ${
                    entry.isEmergency
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        entry.isEmergency
                          ? 'bg-red-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {entry.position}
                      </div>
                      <div>
                        <div className="font-semibold">
                          #{entry.tokenNumber} - {entry.patientName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {entry.doctorName} • {entry.departmentName}
                        </div>
                        {entry.isEmergency && (
                          <Badge variant="destructive" className="mt-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Emergency
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        value={entry.position}
                        onChange={(e) => rearrangeQueue(entry.id, parseInt(e.target.value))}
                      >
                        {Array.from({ length: filteredQueue.filter(q => q.status === 'waiting').length }, (_, i) => i + 1).map(pos => (
                          <option key={pos} value={pos}>Pos {pos}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => rearrangeQueue(entry.id, 1)}
                        disabled={entry.position === 1}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

            {filteredQueue.filter(q => q.status === 'waiting').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No patients waiting in queue</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
