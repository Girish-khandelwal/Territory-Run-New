// src/app/api/users/me/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import Territory from "@/models/Territory";
import Run from "@/models/Run";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    await connectDB();

    const [user, territoriesOwned, recentRuns] = await Promise.all([
      User.findById(userId)
        .select("-password")
        .lean(),

      Territory.countDocuments({ ownerId: userId }),

      Run.find({ userId, flagged: false })
        .sort({ startTime: -1 })
        .limit(5)
        .select("-coordinates")
        .lean(),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 🗺 Total territory area
    const areaAgg = await Territory.aggregate([
      { $match: { ownerId: user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: "$area" },
        },
      },
    ]);

    const totalTerritoryArea =
      areaAgg.length > 0 ? areaAgg[0].total : 0;

    return NextResponse.json({
      user: {
        ...user,
        territoriesOwned,
        totalTerritoryArea,
      },
      recentRuns,
    });
  } catch (err) {
    console.error("[USER ME]", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}