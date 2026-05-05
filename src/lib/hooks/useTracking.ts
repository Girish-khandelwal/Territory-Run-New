'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ICoordinate } from '@/models/Run';
import {
  haversineDistance,
  calculatePace,
  isClosedLoop,
  MAX_SPEEDS,
} from '@/lib/utils/gps';

export type ActivityType = 'running' | 'walking' | 'cycling' | 'trekking';

export interface TrackingState {
  isTracking: boolean;
  isPaused: boolean;
  coordinates: ICoordinate[];
  distance: number;
  duration: number;
  pace: number;
  currentSpeed: number;
  isClosedLoop: boolean;
  error: string | null;
}

export function useTracking(activityType: ActivityType) {
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    isPaused: false,
    coordinates: [],
    distance: 0,
    duration: 0,
    pace: 0,
    currentSpeed: 0,
    isClosedLoop: false,
    error: null,
  });

  // refs (no re-render)
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastPointRef = useRef<ICoordinate | null>(null);
  const coordsRef = useRef<ICoordinate[]>([]);
  const distanceRef = useRef(0);
  const durationRef = useRef(0);
  const isPausedRef = useRef(false);

  // ── TIMER ─────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setState((prev) => ({ ...prev, duration: durationRef.current }));
    }, 1000);
  }, []);

  // ── GPS HANDLER ───────────────────
  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      if (isPausedRef.current) return;

      const { latitude: lat, longitude: lng, altitude, accuracy } = position.coords;
      const timestamp = position.timestamp;

      const newPoint: ICoordinate = {
        lat,
        lng,
        altitude: altitude ?? undefined,
        accuracy: accuracy ?? undefined,
        timestamp,
      };

      // Anti-cheat (teleport detection)
      if (lastPointRef.current) {
        const d = haversineDistance(lastPointRef.current, newPoint);
        const dt = (timestamp - lastPointRef.current.timestamp) / 1000;

        if (dt > 0) {
          const speed = (d / 1000) / (dt / 3600);
          const maxSpeed = MAX_SPEEDS[activityType] ?? 50;

          if (speed > maxSpeed * 2) return;
        }
      }

      coordsRef.current.push(newPoint);
      lastPointRef.current = newPoint;

      // Distance
      if (coordsRef.current.length > 1) {
        const prev = coordsRef.current[coordsRef.current.length - 2];
        distanceRef.current += haversineDistance(prev, newPoint);
      }

      // Speed
      let currentSpeed = 0;
      if (coordsRef.current.length >= 2) {
        const prev = coordsRef.current[coordsRef.current.length - 2];
        const d = haversineDistance(prev, newPoint);
        const dt = (timestamp - prev.timestamp) / 1000;

        if (dt > 0) currentSpeed = (d / 1000) / (dt / 3600);
      }

      const pace = calculatePace(distanceRef.current, durationRef.current);
      const loopClosed = isClosedLoop(coordsRef.current);

      setState((prev) => ({
        ...prev,
        coordinates: coordsRef.current,
        distance: distanceRef.current,
        pace,
        currentSpeed,
        isClosedLoop: loopClosed,
        error: null,
      }));
    },
    [activityType]
  );

  // ── ERROR HANDLER ─────────────────
  const handleError = useCallback((err: GeolocationPositionError) => {
    const messages: Record<number, string> = {
      1: 'Permission denied',
      2: 'Location unavailable',
      3: 'Timeout',
    };

    setState((prev) => ({
      ...prev,
      error: messages[err.code] || 'GPS error',
    }));
  }, []);

  // ── START ─────────────────────────
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return; // prevent double start

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    coordsRef.current = [];
    distanceRef.current = 0;
    durationRef.current = 0;
    lastPointRef.current = null;
    startTimeRef.current = new Date();

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    startTimer();

    setState((prev) => ({
      ...prev,
      isTracking: true,
      isPaused: false,
      coordinates: [],
      error: null,
    }));
  }, [handlePosition, handleError, startTimer]);

  // ── PAUSE ─────────────────────────
  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;

    if (isPausedRef.current) {
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      startTimer();
    }

    setState((prev) => ({
      ...prev,
      isPaused: isPausedRef.current,
    }));
  }, [startTimer]);

  // ── STOP ─────────────────────────
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = startTimeRef.current
      ? {
          coordinates: coordsRef.current,
          startTime: startTimeRef.current,
          endTime: new Date(),
        }
      : null;

    setState((prev) => ({
      ...prev,
      isTracking: false,
      isPaused: false,
    }));

    return result;
  }, []);

  // ── CLEANUP (VERY IMPORTANT) ──────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    state,
    startTracking,
    stopTracking,
    togglePause,
  };
}