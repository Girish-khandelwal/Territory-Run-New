import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";

import User from "@/models/User";

import { generateToken } from "@/lib/jwt";

export async function POST(
  req: NextRequest
) {
  try {
    await connectDB();

    const body = await req.json();

    const { email, password } = body;

    // VALIDATION

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Missing credentials",
        },
        {
          status: 400,
        }
      );
    }

    // FIND USER + INCLUDE PASSWORD

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    // USER NOT FOUND

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }

    // VALIDATE PASSWORD

    const isValid =
      await user.comparePassword(
        password
      );

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Invalid password",
        },
        {
          status: 401,
        }
      );
    }

    // GENERATE JWT

    const token = generateToken(
      user._id.toString()
    );

    // RESPONSE

    return NextResponse.json({
      success: true,

      token,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        image: user.image,

        color: user.color,

        provider: user.provider,

        stats: user.stats,

        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}