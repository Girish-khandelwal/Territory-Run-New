// src/app/api/leaderboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Run from "@/models/Run";
import Territory from "@/models/Territory";
import User from "@/models/User";
import { startOfWeek, startOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "alltime";

    // 📅 Date filter
    let dateFilter: any = {};

    if (period === "weekly") {
      dateFilter = {
        startTime: {
          $gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
        },
      };
    } else if (period === "monthly") {
      dateFilter = {
        startTime: {
          $gte: startOfMonth(new Date()),
        },
      };
    }

    // 🏃 Run aggregation
    const runStats = await Run.aggregate([
      {
        $match: {
          flagged: false,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$userId",
          totalDistance: { $sum: "$distance" },
          totalRuns: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
          bestPace: { $min: "$pace" },
        },
      },
      { $sort: { totalDistance: -1 } },
      { $limit: 50 },
    ]);

    // 🗺 Territory aggregation
    const territoryStats = await Territory.aggregate([
      {
        $group: {
          _id: "$ownerId",
          totalTerritory: { $sum: "$area" },
          count: { $sum: 1 },
        },
      },
    ]);

    const territoryMap = new Map(
      territoryStats.map((t) => [t._id.toString(), t])
    );

    // 👤 Fetch users
    const userIds = runStats.map((r) => r._id);

    const users = await User.find({ _id: { $in: userIds } })
      .select("name color image")
      .lean();

    const userMap = new Map(
      users.map((u) => [u._id.toString(), u])
    );

    // 🏆 Build leaderboard
    const leaderboard = runStats.map((entry, index) => {
      const userId = entry._id.toString();
      const user = userMap.get(userId);
      const territory = territoryMap.get(userId);

      return {
        rank: index + 1,
        userId,
        name: user?.name || "Unknown",
        color: user?.color || "#14b8a6",
        image: user?.image || null,
        totalDistance: entry.totalDistance,
        totalRuns: entry.totalRuns,
        totalDuration: entry.totalDuration,
        bestPace: entry.bestPace,
        totalTerritory: territory?.totalTerritory || 0,
        territoriesOwned: territory?.count || 0,
      };
    });

    return NextResponse.json({
      leaderboard,
      period,
    });
  } catch (err) {
    console.error("[LEADERBOARD GET]", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}