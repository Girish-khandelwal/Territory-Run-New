'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Layers, Users, Target, RefreshCw } from 'lucide-react';
import { formatArea } from '@/lib/utils/gps';

interface Territory {
  _id: string;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  polygon: { type: 'Polygon'; coordinates: number[][][] };
  area: number;
  pace: number;
}

export default function MapPage() {
  const { data: session } = useSession();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selected, setSelected] = useState<Territory | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = (session?.user as { id?: string })?.id;

  // ─────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────
  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/territories');
      const data = await res.json();
      setTerritories(data.territories ?? []);
    } catch (err) {
      console.error('Failed to fetch territories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  // ─────────────────────────────────────────
  // INIT MAP (ONCE)
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let map: any;

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;

      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        console.error('❌ Missing Mapbox token');
        return;
      }

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        zoom: 12,
        center: [77.1025, 28.7041],
      });

      map.on('load', () => {
        mapRef.current = map;
        renderTerritories(map, territories);
      });
    };

    init();

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // ─────────────────────────────────────────
  // UPDATE TERRITORIES
  // ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    renderTerritories(map, territories);
  }, [territories, userId]);

  // ─────────────────────────────────────────
  // RENDER TERRITORIES
  // ─────────────────────────────────────────
  function renderTerritories(map: any, list: Territory[]) {
    if (!map) return;

    // Remove old layers
    ['territory-fill', 'territory-outline'].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });

    if (map.getSource('territories')) {
      map.removeSource('territories');
    }

    if (list.length === 0) return;

    const featureCollection = {
      type: 'FeatureCollection',
      features: list.map((t) => ({
        type: 'Feature',
        id: t._id,
        properties: {
          id: t._id,
          ownerId: t.ownerId,
          ownerName: t.ownerName,
          color: t.ownerColor,
          area: t.area,
          isMine: t.ownerId === userId,
        },
        geometry: t.polygon,
      })),
    };

    map.addSource('territories', {
      type: 'geojson',
      data: featureCollection,
    });

    map.addLayer({
      id: 'territory-fill',
      type: 'fill',
      source: 'territories',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': [
          'case',
          ['==', ['get', 'isMine'], true],
          0.35,
          0.2,
        ],
      },
    });

    map.addLayer({
      id: 'territory-outline',
      type: 'line',
      source: 'territories',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    // REMOVE OLD LISTENERS FIRST (IMPORTANT)
    map.off('click', 'territory-fill', () => {});

    map.on('click', 'territory-fill', (e: any) => {
      const props = e.features?.[0]?.properties;
      if (!props) return;

      const found = list.find((x) => x._id === props.id);
      if (found) setSelected(found);
    });

    map.on('mouseenter', 'territory-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'territory-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  // ─────────────────────────────────────────
  // OWNER STATS
  // ─────────────────────────────────────────
  const ownerStats = territories.reduce<Record<string, any>>((acc, t) => {
    if (!acc[t.ownerId]) {
      acc[t.ownerId] = {
        name: t.ownerName,
        color: t.ownerColor,
        count: 0,
        area: 0,
      };
    }
    acc[t.ownerId].count++;
    acc[t.ownerId].area += t.area;
    return acc;
  }, {});

  const sortedOwners = Object.entries(ownerStats).sort(
    (a, b) => b[1].area - a[1].area
  );

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-dark-950">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-brand-400" />
          <h1 className="text-lg font-display text-slate-100">
            TERRITORY MAP
          </h1>
        </div>

        <button
          onClick={fetchTerritories}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* MAP */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* SELECTED POPUP */}
        {selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass p-4 rounded-xl w-72">
            <p className="text-sm text-slate-300">
              {selected.ownerId === userId
                ? 'Your Territory'
                : selected.ownerName}
            </p>

            <p
              className="text-xl font-bold"
              style={{ color: selected.ownerColor }}
            >
              {formatArea(selected.area)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}