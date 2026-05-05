// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User  from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // ✅ Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // ✅ Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // ✅ Password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "Account already exists with this email" },
        { status: 409 }
      );
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: "credentials",
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: user._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}