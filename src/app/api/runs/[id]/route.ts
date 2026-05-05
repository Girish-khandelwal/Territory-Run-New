import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Run from "@/models/Run";

export async function GET(
req: NextRequest,
context: { params: { id: string } }
) {
const { params } = context;

try {
const session = await getServerSession(authOptions);


if (!session?.user) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

await connectDB();

const run = await Run.findById(params.id).lean();

if (!run) {
  return NextResponse.json(
    { error: "Run not found" },
    { status: 404 }
  );
}

const userId = (session.user as { id: string }).id;

if (!run.userId || run.userId.toString() !== userId) {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  );
}

return NextResponse.json(run);


} catch (err) {
console.error("[RUN GET]", err);


return NextResponse.json(
  { error: "Server error" },
  { status: 500 }
);


}
}
