import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Territory from "@/models/Territory";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const query = userId
      ? { ownerId: new mongoose.Types.ObjectId(userId) }
      : {};

    const territories = await Territory.find(query)
      .select("-captureHistory")
      .lean();

    return NextResponse.json({ territories });
  } catch (err) {
    console.error("[TERRITORIES GET]", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}