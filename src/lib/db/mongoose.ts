// src/lib/db/mongoose.ts

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

// Cache type
interface MongooseCache {
  connection: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

// Use globalThis (safer for Next.js)
const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose: MongooseCache;
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = {
    connection: null,
    promise: null,
  };
}

const cached = globalWithMongoose.mongoose;

export async function connectDB(): Promise<mongoose.Mongoose> {
  // Return existing connection
  if (cached.connection) return cached.connection;

  // Create new connection if none exists
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.connection = await cached.promise;
  } catch (err) {
    cached.promise = null; // reset so retry works
    throw err;
  }

  return cached.connection;
}