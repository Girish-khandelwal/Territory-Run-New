// src/models/Run.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICoordinate {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  timestamp: number;
}

export interface IRun extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  type: "running" | "walking" | "cycling" | "trekking";
  startTime: Date;
  endTime: Date;
  duration: number;

  coordinates: ICoordinate[];
  distance: number;

  pace: number;
  avgSpeed: number;
  maxSpeed: number;

  isClosedLoop: boolean;
  polygonGeoJSON?: {
    type: "Polygon";
    coordinates: number[][][];
  };
  polygonArea?: number;

  flagged: boolean;
  flagReason?: string;

  createdAt: Date;
  updatedAt: Date; // ✅ added
}

// ─── Coordinate Schema ─────────────────

const CoordinateSchema = new Schema<ICoordinate>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    altitude: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Number, required: true },
  },
  { _id: false }
);

// ─── Run Schema ─────────────────

const RunSchema = new Schema<IRun>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["running", "walking", "cycling", "trekking"],
      default: "running",
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },

    coordinates: { type: [CoordinateSchema], required: true },

    distance: { type: Number, required: true },

    pace: { type: Number, default: 0 },
    avgSpeed: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },

    isClosedLoop: { type: Boolean, default: false },

    polygonGeoJSON: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },

    polygonArea: { type: Number },

    flagged: { type: Boolean, default: false },
    flagReason: { type: String },
  },
  { timestamps: true }
);

// ─── Index ─────────────────

RunSchema.index({ userId: 1, startTime: -1 });

// ─── Model Export (Next.js safe) ─────────────────

const RunModel: Model<IRun> =
  mongoose.models.Run || mongoose.model<IRun>("Run", RunSchema);

export default RunModel;