import { connectDB } from "./config/db";
import { bot } from "./bot/bot";

const startServer = async () => {
  console.log("🛡️ Initializing ShieldGram Engine...");

  // Connect to MongoDB Database
  await connectDB();

  // Start Long Polling Bot Instance
  console.log("🚀 Starting ShieldGram Bot (@ShieldGramxBot)...");
  await bot.start({
    onStart: (botInfo: any) => {
      console.log(`✅ ShieldGram is live as @${botInfo.username}`);
    },
  });
};

// Graceful Shutdown Listeners
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

startServer();
