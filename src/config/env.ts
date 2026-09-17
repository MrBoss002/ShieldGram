import dotenv from "dotenv";

dotenv.config();

interface Environment {
  BOT_TOKEN: string;
  MONGO_URI: string;
  ADMIN_HANDLE: string;
  UPDATES_CHANNEL: string;
  SUPPORT_GROUP: string;
  DEV_GITHUB: string;
}

const getEnv = (): Environment => {
  const {
    BOT_TOKEN,
    MONGO_URI,
    ADMIN_HANDLE = "MrBossTG",
    UPDATES_CHANNEL = "https://t.me/MrBossBotz",
    SUPPORT_GROUP = "https://t.me/MrBossSupport",
    DEV_GITHUB = "https://github.com/MrBoss002",
  } = process.env;

  if (!BOT_TOKEN) {
    throw new Error("CRITICAL: BOT_TOKEN is missing in .env file.");
  }

  if (!MONGO_URI) {
    throw new Error("CRITICAL: MONGO_URI is missing in .env file.");
  }

  return {
    BOT_TOKEN,
    MONGO_URI,
    ADMIN_HANDLE,
    UPDATES_CHANNEL,
    SUPPORT_GROUP,
    DEV_GITHUB,
  };
};

export const env = getEnv();
