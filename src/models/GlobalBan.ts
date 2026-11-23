import mongoose, { Schema, Document } from "mongoose";

export interface IGlobalBan extends Document {
  userId: number;
  reason: string;
  bannedAt: Date;
}

const GlobalBanSchema = new Schema<IGlobalBan>({
  userId: { type: Number, required: true, unique: true, index: true },
  reason: { type: String, default: "No reason specified" },
  bannedAt: { type: Date, default: Date.now },
});

export const GlobalBan =
  mongoose.models.GlobalBan ||
  mongoose.model<IGlobalBan>("GlobalBan", GlobalBanSchema);
