import dotenv from "dotenv";
dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    console.log("AVAILABLE ENV KEYS:", Object.keys(process.env));
    throw new Error(`CRITICAL: ${key} is missing in .env file.`);
  }
  return value;
};

export const env = {
  BOT_TOKEN: getEnv("BOT_TOKEN"),
  MONGO_URI: getEnv("MONGO_URI"),
  ADMIN_HANDLE: process.env.ADMIN_HANDLE || "MrBossTG",
  UPDATES_CHANNEL: process.env.UPDATES_CHANNEL || "https://t.me/MrBossBotz",
  SUPPORT_GROUP: process.env.SUPPORT_GROUP || "https://t.me/MrBossSupport",
  DEV_GITHUB: process.env.DEV_GITHUB || "https://github.com/MrBoss002",
};
