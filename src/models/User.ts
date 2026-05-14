// src/models/User.ts

import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;

  name: string;

  email: string;

  password?: string;

  image?: string;

  color: string;

  provider: "credentials" | "google";

  stats: {
    totalDistance: number;
    totalRuns: number;
    totalDuration: number;
    totalTerritory: number;
  };

  createdAt: Date;
  updatedAt: Date;

  comparePassword(
    candidate: string
  ): Promise<boolean>;
}

// ─────────────────────────────────────────────
// TERRITORY COLORS
// ─────────────────────────────────────────────

const TERRITORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
  "#a855f7",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#d946ef",
  "#fb923c",
  "#4ade80",
  "#38bdf8",
];

// ─────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      select: false,
    },

    image: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    color: {
      type: String,
      default: "",
    },

    stats: {
      totalDistance: {
        type: Number,
        default: 0,
      },

      totalRuns: {
        type: Number,
        default: 0,
      },

      totalDuration: {
        type: Number,
        default: 0,
      },

      totalTerritory: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────
// PRE SAVE HOOK
// ─────────────────────────────────────────────

UserSchema.pre("save", async function () {
  const user = this as IUser;

  // HASH PASSWORD

  if (
    user.isModified("password") &&
    user.password
  ) {
    const salt = await bcrypt.genSalt(12);

    user.password = await bcrypt.hash(
      user.password,
      salt
    );
  }

  // AUTO ASSIGN TERRITORY COLOR

  if (user.isNew && !user.color) {
    try {
      const count =
        await mongoose
          .model("User")
          .countDocuments();

      user.color =
        TERRITORY_COLORS[
          count % TERRITORY_COLORS.length
        ];
    } catch {
      user.color = TERRITORY_COLORS[0];
    }
  }
});

// ─────────────────────────────────────────────
// METHODS
// ─────────────────────────────────────────────

UserSchema.methods.comparePassword =
  async function (
    candidate: string
  ): Promise<boolean> {
    if (!this.password) {
      return false;
    }

    return bcrypt.compare(
      candidate,
      this.password
    );
  };

// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

const UserModel: Model<IUser> =
  mongoose.models.User ||
  mongoose.model<IUser>(
    "User",
    UserSchema
  );

export default UserModel;