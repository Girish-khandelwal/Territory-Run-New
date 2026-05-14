import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        name: session.user?.name,
        email: session.user?.email,
        image: session.user?.image,
        color: "#14b8a6",
      },
    });
  } catch (error) {
    console.error("PROFILE API ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}