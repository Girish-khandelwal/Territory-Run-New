'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, TrendingUp, Target, Clock } from 'lucide-react';
import { formatDistance, formatArea, formatDuration, formatPace } from '@/lib/utils/gps';
import { clsx } from 'clsx';

type Period = 'weekly' | 'monthly' | 'alltime';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  color: string;
  totalDistance: number;
  totalRuns: number;
  totalDuration: number;
  bestPace: number;
  totalTerritory: number;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'alltime', label: 'All Time' },
];

const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;

  const [period, setPeriod] = useState<Period>('alltime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leaderboard?period=${period}`);
        const data = await res.json();
        setEntries(data.leaderboard || []);
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period]);

  const myEntry = entries.find((e) => e.userId === userId);

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-brand-400" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Global Rankings
          </span>
        </div>
        <h1 className="text-4xl font-display text-slate-100">LEADERBOARD</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 glass rounded-xl p-1 w-fit">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={clsx(
              'px-5 py-2 rounded-lg text-sm transition-all',
              period === value
                ? 'bg-brand-500/20 text-brand-300'
                : 'text-slate-500 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Your rank */}
      {myEntry && (
        <div className="glass rounded-xl p-4 mb-6 border border-brand-500/20">
          <p className="text-xs text-brand-400 mb-1">Your Ranking</p>
          <div className="flex gap-3">
            <span className="text-3xl text-brand-400">#{myEntry.rank}</span>
            <div>
              <p>{formatDistance(myEntry.totalDistance)}</p>
              <p className="text-sm text-slate-500">
                {myEntry.totalRuns} runs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p>No leaderboard data</p>
      ) : (
        entries.map((entry) => {
          const isMe = entry.userId === userId;
          const medalColor = MEDAL_COLORS[entry.rank - 1];

          return (
            <div
              key={entry.userId}
              className={clsx(
                'glass p-4 mb-3 rounded-xl flex justify-between',
                isMe && 'border border-brand-500'
              )}
            >
              <div className="flex gap-4">
                <span style={{ color: medalColor }}>
                  #{entry.rank}
                </span>
                <span>{entry.name}</span>
              </div>

              <div className="flex gap-4">
                <span>{formatDistance(entry.totalDistance)}</span>
                <span>{formatArea(entry.totalTerritory)}</span>
                <span>{formatDuration(entry.totalDuration)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}