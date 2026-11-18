"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Activity, AlertTriangle } from "lucide-react";

interface QueueStatusWidgetProps {
  departmentId?: string;
  hospitalId?: string;
}

export function QueueStatusWidget({ departmentId, hospitalId }: QueueStatusWidgetProps) {
  const [queueData, setQueueData] = useState({
    totalWaiting: 0,
    averageWaitTime: 0,
    inTreatment: 0,
    emergencyCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const params = new URLSearchParams({ locationId: "default" });
        if (departmentId) params.set("departmentId", departmentId);
        if (hospitalId) params.set("hospitalId", hospitalId);
        const response = await fetch(`/backend-api/queue/status?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const result = await response.json();
        const metrics = result.data?.metrics || {};

        setQueueData({
          totalWaiting: Number(metrics.queueLength || 0),
          averageWaitTime: Math.round(Number(metrics.averageWaitTime || 0)),
          inTreatment: Number(metrics.inTreatment || 0),
          emergencyCount: Number(metrics.emergencyCount || 0)
        });
      } catch (error) {
        console.error('Error fetching queue status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueueStatus();

    const interval = window.setInterval(fetchQueueStatus, 15_000);
    return () => window.clearInterval(interval);
  }, [departmentId, hospitalId]);

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Live Queue Status
        </CardTitle>
        <CardDescription>
          Current queue information and wait times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-900">{queueData.totalWaiting}</p>
              <p className="text-sm text-blue-700">Waiting</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">
                {formatWaitTime(queueData.averageWaitTime)}
              </p>
              <p className="text-sm text-green-700">Avg Wait</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
            <Activity className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">{queueData.inTreatment}</p>
              <p className="text-sm text-yellow-700">In Treatment</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-900">{queueData.emergencyCount}</p>
              <p className="text-sm text-red-700">Emergency</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
