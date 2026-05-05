// src/app/(app)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Play,
  Map,
  Trophy,
  TrendingUp,
  Clock,
  Zap,
  Target,
} from 'lucide-react';

// 🔥 Simple fallback formatters (safe)
const formatDistance = (m: number) => `${(m / 1000).toFixed(2)} km`;
const formatDuration = (s: number) => `${Math.floor(s / 60)} min`;
const formatArea = (a: number) => `${a.toFixed(0)} m²`;
const formatPace = (p: number) => `${p.toFixed(2)} min/km`;

interface UserStats {
  totalDistance: number;
  totalRuns: number;
  totalDuration: number;
  totalTerritory: number;
}

interface RecentRun {
  _id: string;
  type: string;
  distance: number;
  duration: number;
  pace: number;
  startTime: string;
  isClosedLoop: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentRuns, setRecent] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);

  const userColor =
    (session?.user as { color?: string })?.color ?? '#14b8a6';

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/users/me');

        if (!res.ok) throw new Error('Failed to fetch');

        const data = await res.json();

        const { user, recentRuns } = data;

        // 🔥 FIXED: map backend → frontend
        setStats({
          totalDistance: user.totalDistance ?? 0,
          totalRuns: user.totalRuns ?? 0,
          totalDuration: user.totalDuration ?? 0,
          totalTerritory: user.totalTerritoryArea ?? 0,
        });

        setRecent(recentRuns ?? []);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const METRIC_CARDS = [
    {
      icon: TrendingUp,
      label: 'Total Distance',
      value: stats ? formatDistance(stats.totalDistance) : '—',
      color: '#14b8a6',
    },
    {
      icon: Play,
      label: 'Total Runs',
      value: stats?.totalRuns?.toString() ?? '—',
      color: '#f97316',
    },
    {
      icon: Clock,
      label: 'Time on Feet',
      value: stats ? formatDuration(stats.totalDuration) : '—',
      color: '#3b82f6',
    },
    {
      icon: Target,
      label: 'Territory Owned',
      value: stats ? formatArea(stats.totalTerritory) : '—',
      color: '#a855f7',
    },
  ];

  const ACTIVITY_COLORS: Record<string, string> = {
    running: '#f97316',
    walking: '#22c55e',
    cycling: '#3b82f6',
    trekking: '#a855f7',
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="text-sm font-mono text-slate-500 uppercase tracking-widest">
            Your Dashboard
          </span>
        </div>

        <h1 className="text-4xl lg:text-5xl font-display text-slate-100">
          {loading
            ? 'Loading…'
            : `Welcome back, ${session?.user?.name?.split(' ')[0]}`}
        </h1>

        <p className="text-slate-400 mt-2">
          Track, conquer, and expand your territory across the city.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <Link href="/track" className="btn-primary flex items-center gap-2">
          <Play className="w-4 h-4" /> Start Activity
        </Link>

        <Link href="/map" className="btn-secondary flex items-center gap-2">
          <Map className="w-4 h-4" /> Map
        </Link>

        <Link href="/leaderboard" className="btn-secondary flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Leaderboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {METRIC_CARDS.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="metric-card">
            <Icon className="w-5 h-5 mb-2" style={{ color }} />
            <div className="metric-value" style={{ color }}>
              {value}
            </div>
            <div className="metric-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Runs */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-400" /> Recent Activities
        </h2>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : recentRuns.length === 0 ? (
          <p className="text-slate-500">No activities yet</p>
        ) : (
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <div key={run._id} className="p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between">
                  <span className="capitalize">{run.type}</span>
                  <span>{formatDistance(run.distance)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}