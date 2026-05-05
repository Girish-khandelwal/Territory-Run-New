'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Map, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import {
  formatDistance,
  formatDuration,
  formatArea,
  formatPace,
} from '@/lib/utils/gps';

interface ProfileData {
  name: string;
  email: string;
  color: string;
  image?: string;
  provider: string;
  stats: {
    totalDistance: number;
    totalRuns: number;
    totalDuration: number;
    totalTerritory: number;
  };
  territoriesOwned: number;
  totalTerritoryArea: number;
}

interface Run {
  _id: string;
  type: string;
  distance: number;
  duration: number;
  pace: number;
  startTime: string;
  isClosedLoop: boolean;
}

export default function ProfilePage() {
  const { data: session } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch profile ─────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/users/me');

        if (!res.ok) throw new Error('Failed to fetch profile');

        const data = await res.json();

        setProfile(data.user ?? null);
        setRecentRuns(data.recentRuns ?? []);
      } catch (err) {
        console.error('[PROFILE ERROR]', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const ACTIVITY_COLORS: Record<string, string> = {
    running: '#f97316',
    walking: '#22c55e',
    cycling: '#3b82f6',
    trekking: '#a855f7',
  };

  // ─── Loading UI ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 glass rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error UI ──────────────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="p-6 text-center text-red-400">
        {error || 'Profile not found'}
      </div>
    );
  }

  // ─── Safe defaults ─────────────────────────────────────────
  const stats = profile.stats || {
    totalDistance: 0,
    totalRuns: 0,
    totalDuration: 0,
    totalTerritory: 0,
  };

  // ─── UI ───────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="glass rounded-2xl p-6 mb-6 flex items-center gap-5">
        {profile.image ? (
          <img
            src={profile.image}
            alt={profile.name}
            className="w-16 h-16 rounded-full ring-2"
            style={{ borderColor: profile.color }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2"
            style={{
              backgroundColor: profile.color + '30',
              borderColor: profile.color,
            }}
          >
            <User className="w-7 h-7" style={{ color: profile.color }} />
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-2xl font-display text-slate-100">
            {profile.name}
          </h1>
          <p className="text-sm text-slate-400">{profile.email}</p>

          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: profile.color }}
            />
            <span className="text-xs font-mono text-slate-500 uppercase">
              {profile.provider === 'google'
                ? 'Google Account'
                : 'Email Account'}
            </span>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <p
            className="text-4xl font-display"
            style={{ color: profile.color }}
          >
            {profile.territoriesOwned}
          </p>
          <p className="text-xs text-slate-500">Territories</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            icon: TrendingUp,
            label: 'Distance',
            value: formatDistance(stats.totalDistance),
            color: '#14b8a6',
          },
          {
            icon: Zap,
            label: 'Runs',
            value: stats.totalRuns.toString(),
            color: '#f97316',
          },
          {
            icon: Clock,
            label: 'Time',
            value: formatDuration(stats.totalDuration),
            color: '#3b82f6',
          },
          {
            icon: Target,
            label: 'Territory',
            value: formatArea(profile.totalTerritoryArea),
            color: '#a855f7',
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="metric-card">
            <Icon className="w-5 h-5 mb-2" style={{ color }} />
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent runs */}
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg text-slate-200">
          Activity History
        </h2>

        {recentRuns.length === 0 ? (
          <p className="text-slate-500 text-center py-6">
            No activities yet.
          </p>
        ) : (
          recentRuns.map((run) => (
            <div
              key={run._id}
              className="flex justify-between p-3 mb-2 bg-white/5 rounded-xl"
            >
              <div>
                <p className="capitalize">{run.type}</p>
                <p className="text-xs text-slate-500">
                  {new Date(run.startTime).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <p>{formatDistance(run.distance)}</p>
                <p className="text-xs">
                  {formatPace(run.pace)}/km
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}