// src/lib/utils/territory.ts
// All Turf.js polygon operations: building territories, overlap detection, battle resolution

import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import type { ICoordinate } from "@/models/Run.ts";
import type { ITerritory } from "@/models/Territory";

// ─── Build Polygon ────────────────────────────────────────────────────────────

export function buildPolygonFromRoute(
  coords: ICoordinate[]
): { polygon: Feature<Polygon>; area: number } | null {
  if (coords.length < 4) return null;

  try {
    // Convert to GeoJSON [lng, lat]
    const points = coords.map((c) => turf.point([c.lng, c.lat]));
    const fc = turf.featureCollection(points);

    // Create convex hull
    const hull = turf.convex(fc);
    if (!hull || hull.geometry.type !== "Polygon") return null;

    const area = turf.area(hull);

    return {
      polygon: hull as Feature<Polygon>,
      area,
    };
  } catch {
    return null;
  }
}

// ─── Overlap Detection ────────────────────────────────────────────────────────

export function findOverlappingTerritories(
  newPolygon: Feature<Polygon>,
  territories: ITerritory[]
): { territory: ITerritory; overlapPercent: number }[] {
  const results: { territory: ITerritory; overlapPercent: number }[] = [];

  for (const territory of territories) {
    try {
      const existingPoly = turf.polygon(territory.polygon.coordinates);

      // Check intersection
      if (!turf.booleanIntersects(newPolygon, existingPoly)) continue;

      // ✅ FIXED: correct intersect usage
     const intersection = turf.intersect(
  turf.featureCollection([newPolygon, existingPoly])
);
      if (!intersection) continue;

      const intersectionArea = turf.area(intersection);
      const existingArea = turf.area(existingPoly);

      if (existingArea === 0) continue;

      const overlapPercent = intersectionArea / existingArea;

      results.push({ territory, overlapPercent });
    } catch {
      continue;
    }
  }

  return results;
}

// ─── Battle Logic ─────────────────────────────────────────────────────────────

export function challengerWins(
  challenger: { pace: number; avgSpeed: number },
  defender: { pace: number; avgSpeed: number }
): boolean {
  const PACE_TOLERANCE = 0.02;

  const c = challenger.pace;
  const d = defender.pace;

  // Faster pace wins
  if (c < d * (1 - PACE_TOLERANCE)) return true;

  // If close → compare speed
  if (Math.abs(c - d) / d <= PACE_TOLERANCE) {
    return challenger.avgSpeed > defender.avgSpeed;
  }

  return false;
}

// ─── Battle Resolution ────────────────────────────────────────────────────────

export interface TerritoryAction {
  type: "capture" | "skip";
  territory: ITerritory;
  reason: string;
}

export function resolveTerritoryBattles(
  newRunMetrics: {
    pace: number;
    avgSpeed: number;
    userId: string;
  },
  overlapping: {
    territory: ITerritory;
    overlapPercent: number;
  }[]
): TerritoryAction[] {
  return overlapping.map(({ territory, overlapPercent }) => {
    // Ignore tiny overlaps
    if (overlapPercent < 0.1) {
      return {
        type: "skip",
        territory,
        reason: `Overlap too small (${(overlapPercent * 100).toFixed(1)}%)`,
      };
    }

    // Can't capture own territory
    if (territory.ownerId.toString() === newRunMetrics.userId) {
      return {
        type: "skip",
        territory,
        reason: "Already owned by you",
      };
    }

    const wins = challengerWins(newRunMetrics, {
      pace: territory.pace,
      avgSpeed: territory.avgSpeed,
    });

    return {
      type: wins ? "capture" : "skip",
      territory,
      reason: wins
        ? "Better performance"
        : "Defender stronger",
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function polygonFeatureToGeoJSON(
  poly: Feature<Polygon>
): { type: "Polygon"; coordinates: number[][][] } {
  return {
    type: "Polygon",
    coordinates: poly.geometry.coordinates,
  };
}