import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  userId: number;
  username?: string;
  firstName: string;
  joinedAt: Date;
  points: number;
  referredBy?: number;
  referralCount: number;
}

const userSchema = new Schema<IUser>({
  userId: { type: Number, required: true, unique: true },
  username: { type: String },
  firstName: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  points: { type: Number, default: 5 },          
  referredBy: { type: Number },                 
  referralCount: { type: Number, default: 0 },  
});

export const User = model<IUser>("User", userSchema);
