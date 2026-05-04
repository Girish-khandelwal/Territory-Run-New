// src/lib/utils/gps.ts

import type { ICoordinate } from "@/models/Run.ts";

// ─── Types ─────────────────

type ActivityType = "running" | "walking" | "cycling" | "trekking";

// ─── Constants ─────────────────

export const MAX_SPEEDS: Record<ActivityType, number> = {
  running: 40,
  walking: 15,
  cycling: 100,
  trekking: 20,
};

const MAX_GPS_ACCURACY = 50;
export const LOOP_CLOSE_THRESHOLD = 50;

// ─── Helpers ─────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── Haversine Distance ─────────────────

export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── GPS Processing (Anti-cheat + smoothing) ─────────────────

export function processGPSPoints(
  raw: ICoordinate[],
  activityType: ActivityType
): { coords: ICoordinate[]; flagged: boolean; flagReason?: string } {
  if (!raw.length) return { coords: [], flagged: false };
  if (raw.length < 2) return { coords: raw, flagged: false };

  const maxSpeed = MAX_SPEEDS[activityType] ?? 50;

  let flagged = false;
  let flagReason: string | undefined;
  let teleportCount = 0;

  const filtered: ICoordinate[] = [raw[0]];

  for (let i = 1; i < raw.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = raw[i];

    if (!prev) continue;

    // Accuracy filter
    if (curr.accuracy !== undefined && curr.accuracy > MAX_GPS_ACCURACY) continue;

    const dist = haversineDistance(prev, curr);
    const dt = (curr.timestamp - prev.timestamp) / 1000;

    if (dt <= 0) continue;

    const speed = (dist / 1000) / (dt / 3600);

    // Teleport detection
    if (speed > maxSpeed * 2) {
      teleportCount++;

      if (teleportCount >= 3) {
        flagged = true;
        flagReason = `Unrealistic speed: ${speed.toFixed(1)} km/h`;
      }

      continue;
    }

    filtered.push(curr);
  }

  // Smoothing
  const smoothed: ICoordinate[] = filtered.map((_, i) => {
    const window = filtered.slice(
      Math.max(0, i - 1),
      Math.min(filtered.length, i + 2)
    );

    const avgLat = window.reduce((s, p) => s + p.lat, 0) / window.length;
    const avgLng = window.reduce((s, p) => s + p.lng, 0) / window.length;

    return { ...filtered[i], lat: avgLat, lng: avgLng };
  });

  return { coords: smoothed, flagged, flagReason };
}

// ─── Metrics ─────────────────

export function calculateTotalDistance(coords: ICoordinate[]): number {
  let total = 0;

  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i - 1], coords[i]);
  }

  return total;
}

export function calculateMaxSpeed(coords: ICoordinate[]): number {
  let max = 0;

  for (let i = 1; i < coords.length; i++) {
    const dist = haversineDistance(coords[i - 1], coords[i]);
    const dt = (coords[i].timestamp - coords[i - 1].timestamp) / 1000;

    if (dt <= 0) continue;

    const speed = (dist / 1000) / (dt / 3600);
    if (speed > max) max = speed;
  }

  return max;
}

export function calculatePace(distanceM: number, durationSec: number): number {
  if (distanceM === 0) return 0;
  return durationSec / (distanceM / 1000);
}

// ─── Formatting ─────────────────

export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm === 0) return "--:--";

  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60).toString().padStart(2, "0");

  return `${min}:${sec}`;
}

export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
  return `${Math.round(metres)} m`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(3)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;

  return `${Math.round(m2)} m²`;
}

// ─── Loop Detection ─────────────────

export function isClosedLoop(coords: ICoordinate[]): boolean {
  if (coords.length < 10) return false;

  const first = coords[0];
  const last = coords[coords.length - 1];

  return haversineDistance(first, last) <= LOOP_CLOSE_THRESHOLD;
}