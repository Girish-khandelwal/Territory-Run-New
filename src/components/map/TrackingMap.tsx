'use client';

import { useEffect, useRef } from 'react';
import type { ICoordinate } from '@/models/Run';

interface TrackingMapProps {
  coordinates: ICoordinate[];
  userColor: string;
  isTracking: boolean;
}

export function TrackingMap({
  coordinates,
  userColor,
  isTracking,
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // ─────────────────────────────────────────
  // INIT MAP (runs only once)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: any;

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;

      // ✅ Token check
      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        console.error('❌ Missing Mapbox token');
        return;
      }

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        zoom: 14,
        center: [77.1025, 28.7041],
      });

      map.on('load', () => {
        // Route source
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        // Glow layer
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': userColor,
            'line-width': 10,
            'line-opacity': 0.15,
            'line-blur': 4,
          },
        });

        // Main route line
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': userColor,
            'line-width': 4,
          },
        });
      });

      mapRef.current = map;
    };

    init();

    // 🧹 Cleanup
    return () => {
      if (markerRef.current) markerRef.current.remove();
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // ─────────────────────────────────────────
  // UPDATE ROUTE + MARKER
  // ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || coordinates.length === 0) return;

    const source = map.getSource('route');
    if (!source) return;

    const lngLats = coordinates.map((c) => [c.lng, c.lat]);

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: lngLats,
      },
    });

    const last = coordinates[coordinates.length - 1];
    const lngLat: [number, number] = [last.lng, last.lat];

    const mapboxgl = (window as any).mapboxgl || require('mapbox-gl');

    // Marker
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${userColor};
        border: 3px solid white;
        box-shadow: 0 0 15px ${userColor}80;
      `;

      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    // Auto-follow
    if (isTracking) {
      map.easeTo({
        center: lngLat,
        duration: 500,
      });
    }
  }, [coordinates, isTracking, userColor]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden"
    />
  );
}