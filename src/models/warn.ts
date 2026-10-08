import { Schema, model, Document } from "mongoose";

export interface IWarn extends Document {
  groupId: number;
  userId: number;
  warnCount: number;
  reasons: string[];
  updatedAt: Date;
}

const WarnSchema = new Schema<IWarn>(
  {
    groupId: { type: Number, required: true },
    userId: { type: Number, required: true },
    warnCount: { type: Number, default: 0 },
    reasons: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound index to quickly find a specific user's warnings in a specific group
WarnSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export const Warn = model<IWarn>("Warn", WarnSchema);
