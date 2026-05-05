'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Play,
  Pause,
  Square,
  Navigation,
  Zap,
  Clock,
  TrendingUp,
  Target,
  AlertTriangle,
} from 'lucide-react';

import { useTracking, type ActivityType } from '@/lib/hooks/useTracking';
import { formatDistance, formatDuration, formatPace } from '@/lib/utils/gps';

// ⚠️ comment this if not created yet
// import { TrackingMap } from '@/components/map/TrackingMap';

type ActivityConfig = {
  value: ActivityType;
  label: string;
  icon: string;
  color: string;
};

const ACTIVITY_TYPES: ActivityConfig[] = [
  { value: 'running', label: 'Run', icon: '🏃', color: '#f97316' },
  { value: 'walking', label: 'Walk', icon: '🚶', color: '#22c55e' },
  { value: 'cycling', label: 'Cycle', icon: '🚴', color: '#3b82f6' },
  { value: 'trekking', label: 'Trek', icon: '⛰️', color: '#a855f7' },
];

export default function TrackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activityType, setActivityType] = useState<ActivityType>('running');
  const [saving, setSaving] = useState(false);

  const { state, startTracking, stopTracking, togglePause } =
    useTracking(activityType);

  const userColor =
    (session?.user as { color?: string })?.color ?? '#14b8a6';

  // 🔐 Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleStop = async () => {
    const result = stopTracking();

    if (!result || result.coordinates.length < 2) {
      toast.error('Not enough GPS data');
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('Saving activity...');

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawCoordinates: result.coordinates,
          type: activityType,
          startTime: result.startTime.toISOString(),
          endTime: result.endTime.toISOString(),
        }),
      });

      const data = await res.json();
      toast.dismiss(loadingToast);

      if (!res.ok) throw new Error(data.error || 'Save failed');

      toast.success('Activity saved!');
      router.push('/dashboard');
    } catch (err) {
      toast.dismiss(loadingToast);

      console.error(err);
      toast.error('Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const activityConfig =
    ACTIVITY_TYPES.find((a) => a.value === activityType)!;

  return (
    <div className="h-screen flex flex-col bg-dark-950 text-white">
      {/* Header */}
      <div className="flex justify-between p-4 border-b border-white/10">
        <h1 className="font-bold">TRACK</h1>

        {state.isTracking && (
          <span className="text-red-400 animate-pulse">LIVE</span>
        )}
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-80 p-4 flex flex-col gap-4 border-r border-white/10">
          {!state.isTracking && (
            <div>
              <p className="text-sm mb-2">Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setActivityType(a.value)}
                    className={`p-3 rounded ${
                      activityType === a.value
                        ? 'bg-white/10'
                        : 'bg-white/5'
                    }`}
                  >
                    <div>{a.icon}</div>
                    <div>{a.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <Metric
              icon={TrendingUp}
              label="Distance"
              value={formatDistance(state.distance)}
            />
            <Metric
              icon={Clock}
              label="Time"
              value={formatDuration(state.duration)}
            />
            <Metric
              icon={Zap}
              label="Pace"
              value={formatPace(state.pace)}
            />
            <Metric
              icon={Navigation}
              label="Speed"
              value={`${state.currentSpeed.toFixed(1)} km/h`}
            />
          </div>

          {/* Errors */}
          {state.error && (
            <div className="text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {/* Controls */}
          <div className="mt-auto flex flex-col gap-2">
            {!state.isTracking ? (
              <button onClick={startTracking} className="btn-primary">
                <Play /> Start
              </button>
            ) : (
              <>
                <button onClick={togglePause} className="btn-secondary">
                  {state.isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                  onClick={handleStop}
                  disabled={saving}
                  className="bg-red-500 p-2 rounded"
                >
                  <Square />
                  {saving ? 'Saving...' : 'Stop'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Map placeholder */}
        <div className="flex-1 flex items-center justify-center bg-slate-800">
          <p>Map will go here</p>
        </div>
      </div>
    </div>
  );
}

// 🔹 small reusable metric component
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 bg-white/5 rounded">
      <Icon className="w-4 h-4 mb-1" />
      <div className="text-lg">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}