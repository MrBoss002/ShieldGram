import { Schema, model, Document } from "mongoose";

export interface ISecretSession extends Document {
  sessionId: string;
  senderId: number;
  recipientId: number;
  groupId: number;
  sourceMessageId?: number;
  sourceChatId?: number;
  createdAt: Date;
}

const secretSessionSchema = new Schema<ISecretSession>({
  sessionId: { type: String, required: true, unique: true },
  senderId: { type: Number, required: true },
  recipientId: { type: Number, required: true },
  groupId: { type: Number, required: true },
  sourceMessageId: { type: Number },
  sourceChatId: { type: Number },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 600 // Automatically deletes the session after 10 minutes if not completed
  },
});

export const SecretSession = model<ISecretSession>("SecretSession", secretSessionSchema);
