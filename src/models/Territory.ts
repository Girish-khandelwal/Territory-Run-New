// src/models/Territory.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITerritory extends Document {
  _id: mongoose.Types.ObjectId;

  ownerId: mongoose.Types.ObjectId;
  ownerColor: string;
  ownerName: string;

  polygon: {
    type: "Polygon";
    coordinates: number[][][];
  };

  area: number;

  sourceRunId: mongoose.Types.ObjectId;

  pace: number;
  avgSpeed: number;

  captureHistory: {
    previousOwnerId?: mongoose.Types.ObjectId;
    previousOwnerName?: string;
    capturedAt: Date;
    winnerRunId?: mongoose.Types.ObjectId;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

const TerritorySchema = new Schema<ITerritory>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ownerColor: { type: String, required: true },
    ownerName: { type: String, required: true },

    polygon: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },

    area: { type: Number, required: true },

    sourceRunId: {
      type: Schema.Types.ObjectId,
      ref: "Run",
      required: true,
    },

    pace: { type: Number, required: true },
    avgSpeed: { type: Number, required: true },

    captureHistory: [
      {
        previousOwnerId: { type: Schema.Types.ObjectId, ref: "User" },
        previousOwnerName: { type: String },
        capturedAt: { type: Date, default: Date.now },
        winnerRunId: { type: Schema.Types.ObjectId, ref: "Run" },
      },
    ],
  },
  { timestamps: true }
);

// Geo index
TerritorySchema.index({ polygon: "2dsphere" });

// Next.js safe model export
const TerritoryModel: Model<ITerritory> =
  mongoose.models.Territory ||
  mongoose.model<ITerritory>("Territory", TerritorySchema);

export default TerritoryModel;