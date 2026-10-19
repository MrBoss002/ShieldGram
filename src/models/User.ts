import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  userId: number;
  username?: string;
  firstName: string;
  joinedAt: Date;
}

const userSchema = new Schema<IUser>({
  userId: { type: Number, required: true, unique: true },
  username: { type: String },
  firstName: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
