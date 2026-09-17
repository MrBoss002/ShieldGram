import { connectDB } from "../config/db";
import { bot } from "./bot";

// Dummy HTTP server to satisfy Render's port check on Free Web Services
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ShieldGram is running active!");
}).listen(PORT, () => {
  console.log(`🌐 Dummy health-check server bound to port ${PORT}`);
});

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
