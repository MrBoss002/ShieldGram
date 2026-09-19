import { Schema, model, Document } from "mongoose";

export interface IGroupConfig extends Document {
  groupId: number;
  ownerId: number;
  features: {
    forceSub: {
      enabled: boolean;
      channels: string[]; // List of channel usernames or IDs (e.g. ["@channel1", "-100123456789"])
      autoDeleteSeconds: number;
    };
    autoApprove: {
      enabled: boolean;
      sendWelcomePm: boolean;
    };
    welcome: {
      enabled: boolean;
      message: string;
      mediaEnabled: boolean;
      mediaUrl?: string;
      buttons?: string;
    };
    goodbye: {
      enabled: boolean;
      message: string;
    };
    captcha: {
      enabled: boolean;
    };
    cleanSystemAlerts: {
      enabled: boolean;
    };
    rules: {
      enabled: boolean;
      text: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const GroupConfigSchema = new Schema<IGroupConfig>(
  {
    groupId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: Number,
      required: true,
      index: true,
    },
    features: {
      forceSub: {
        enabled: { type: Boolean, default: false },
        channels: { type: [String], default: [] },
        autoDeleteSeconds: { type: Number, default: 30 },
      },
      autoApprove: {
        enabled: { type: Boolean, default: false },
        sendWelcomePm: { type: Boolean, default: true },
      },
      welcome: {
        enabled: { type: Boolean, default: false },
        message: {
          type: String,
          default: "Welcome {MENTION} to {GROUPNAME}! 🎉",
        },
        mediaEnabled: { type: Boolean, default: false },
        mediaUrl: { type: String, default: "" },
        buttons: { type: String, default: "" },
      },
      goodbye: {
        enabled: { type: Boolean, default: false },
        message: {
          type: String,
          default: "Goodbye {MENTION}! We will miss you.",
        },
      },
      captcha: {
        enabled: { type: Boolean, default: false },
      },
      cleanSystemAlerts: {
        enabled: { type: Boolean, default: true },
      },
      rules: {
        enabled: { type: Boolean, default: false },
        text: {
          type: String,
          default: "No rules configured yet for this group.",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export const GroupConfig = model<IGroupConfig>(
  "GroupConfig",
  GroupConfigSchema
);
