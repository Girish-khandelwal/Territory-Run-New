// src/app/api/runs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";

// ✅ FIXED IMPORTS
import Run from "@/models/Run";
import Territory from "@/models/Territory";
import User from "@/models/User";

import mongoose from "mongoose";

// utils
import {
  processGPSPoints,
  calculateTotalDistance,
  calculateMaxSpeed,
  calculatePace,
  isClosedLoop,
} from "@/lib/utils/gps";

import {
  buildPolygonFromRoute,
  findOverlappingTerritories,
  resolveTerritoryBattles,
  polygonFeatureToGeoJSON,
} from "@/lib/territory";

// ─── GET ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const userId = (session.user as { id: string }).id;

    await connectDB();

    const [runs, total] = await Promise.all([
      Run.find({ userId })
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-coordinates"),
      Run.countDocuments({ userId }),
    ]);

    return NextResponse.json({ runs, total, page, limit });
  } catch (err) {
    console.error("[RUNS GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const body = await req.json();

    const { rawCoordinates, type, startTime, endTime } = body;

    // ✅ VALIDATION
    if (!rawCoordinates || rawCoordinates.length < 2) {
      return NextResponse.json(
        { error: "Insufficient GPS data" },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Invalid time data" },
        { status: 400 }
      );
    }

    await connectDB();

    // ── 1. Clean GPS ──
    const { coords, flagged, flagReason } = processGPSPoints(
      rawCoordinates,
      type ?? "running"
    );

    // ── 2. Metrics ──
    const distance = calculateTotalDistance(coords);

    const duration =
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;

    if (duration <= 0) {
      return NextResponse.json(
        { error: "Invalid duration" },
        { status: 400 }
      );
    }

    const pace = calculatePace(distance, duration);
    const maxSpeed = calculateMaxSpeed(coords);

    const avgSpeed =
      distance > 0 && duration > 0
        ? (distance / 1000) / (duration / 3600)
        : 0;

    // ── 3. Territory ──
    const loopClosed = isClosedLoop(coords);

    let polygonGeoJSON: any;
    let polygonArea: number | undefined;
    let territoriesCaptured = 0;

    if (loopClosed && !flagged && distance > 100) {
      const built = buildPolygonFromRoute(coords);

      if (built) {
        polygonGeoJSON = polygonFeatureToGeoJSON(built.polygon);
        polygonArea = built.area;

        const allTerritories = await Territory.find({});
        const overlapping = findOverlappingTerritories(
          built.polygon,
          allTerritories
        );

        const actions = resolveTerritoryBattles(
          { pace, avgSpeed, userId },
          overlapping
        );

        for (const action of actions) {
          if (action.type !== "capture") continue;

          await Territory.findByIdAndUpdate(action.territory._id, {
            ownerId: userId,
            ownerColor:
              (session.user as any).color ?? "#14b8a6",
            ownerName: session.user.name ?? "Unknown",
            pace,
            avgSpeed,
          });

          territoriesCaptured++;
        }

        const hasOwnOverlap = overlapping.some(
          (o) => o.territory.ownerId.toString() === userId
        );

        if (!hasOwnOverlap) {
          await Territory.create({
            ownerId: userId,
            ownerColor:
              (session.user as any).color ?? "#14b8a6",
            ownerName: session.user.name ?? "Unknown",
            polygon: polygonGeoJSON,
            area: polygonArea,
            sourceRunId: new mongoose.Types.ObjectId(),
            pace,
            avgSpeed,
          });

          territoriesCaptured++;
        }
      }
    }

    // ── 4. Save run ──
    const run = await Run.create({
      userId,
      type: type ?? "running",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      coordinates: coords,
      distance,
      pace,
      avgSpeed,
      maxSpeed,
      isClosedLoop: loopClosed,
      polygonGeoJSON,
      polygonArea,
      flagged,
      flagReason,
    });

    // ── 5. Update stats ──
    const totalTerritoryArea = await Territory.aggregate([
      { $match: { ownerId: run.userId } },
      { $group: { _id: null, total: { $sum: "$area" } } },
    ]);

    await User.findByIdAndUpdate(userId, {
      $inc: {
        "stats.totalDistance": distance,
        "stats.totalRuns": 1,
        "stats.totalDuration": duration,
      },
      $set: {
        "stats.totalTerritory": totalTerritoryArea[0]?.total ?? 0,
      },
    });

    return NextResponse.json(
      {
        run: { ...run.toObject(), coordinates: undefined },
        territoriesCaptured,
        isClosedLoop: loopClosed,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[RUNS POST]", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}