import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const antiSpamHandler = new Composer();

// In-memory flood tracking storage: Map<userId_chatId, timestamp[]>
const floodTracker = new Map<string, number[]>();

// Configuration constants
const FLOOD_LIMIT = 5;        // Max messages allowed...
const FLOOD_WINDOW_MS = 5000; // ...within 5 seconds
const MAX_TEXT_LENGTH = 300;  // Max characters allowed for longtext filter
const MAX_WARNS = 3;          // Warning threshold limit

// Helper to fetch and increment warnings in MongoDB database for true persistence
async function incrementUserWarning(userId: number, chatId: number): Promise<number> {
  try {
    let config = await GroupConfig.findOne({ groupId: chatId });
    if (!config) {
      config = await GroupConfig.create({ groupId: chatId, ownerId: userId });
    }

    // Initialize warnings sub-document/map if not present
    if (!(config as any).features.warnings) {
      (config as any).features.warnings = new Map();
    }

    const warningsMap = (config as any).features.warnings;
    const currentWarns = warningsMap.get(userId.toString()) || 0;
    const newWarns = currentWarns + 1;

    warningsMap.set(userId.toString(), newWarns);
    config.markModified("features");
    await config.save();

    return newWarns;
  } catch (err) {
    console.error("[Database Warning Increment Error]:", err);
    return 1; // Fallback
  }
}

antiSpamHandler.on("message", async (ctx, next) => {
  try {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") {
      return await next();
    }

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // 1. Check if user is an admin (Admins are exempt)
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) {
        return await next();
      }
    } catch {}

    const messageText = ctx.message.text || ctx.message.caption || "";

    // 2. Flood Guard Check (Placed first to catch rapid-fire spam effectively)
    const trackerKey = `${userId}_${chatId}`;
    const now = Date.now();
    let timestamps = floodTracker.get(trackerKey) || [];

    timestamps = timestamps.filter((time) => now - time < FLOOD_WINDOW_MS);
    timestamps.push(now);
    floodTracker.set(trackerKey, timestamps);

    if (timestamps.length > FLOOD_LIMIT) {
      try {
        await ctx.deleteMessage();
        const warnCount = await incrementUserWarning(userId, chatId);
        
        const floodWarning = await ctx.reply(
          `⚠️ <b>Flood Guard Warning</b>\n` +
          `Hey ${ctx.from.first_name}, please slow down! Sending messages too quickly triggers warning strikes.\n\n` +
          `<b>Action:</b> Warn (${warnCount}/${MAX_WARNS}) ❕`,
          { parse_mode: "HTML" }
        );

        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(chatId, floodWarning.message_id);
          } catch {}
        }, 9000);

        floodTracker.delete(trackerKey);
        return;
      } catch (err) {
        console.error("[Flood Guard Error]:", err);
      }
    }

    // 3. LongText Filter Check
    if (messageText.length > MAX_TEXT_LENGTH) {
      try {
        await ctx.deleteMessage();
        const warnCount = await incrementUserWarning(userId, chatId);

        const warning = await ctx.reply(
          `⚠️ <b>Anti-Spam Warning</b>\n` +
          `Hey ${ctx.from.first_name}, your message exceeded the allowed character limit (${messageText.length}/${MAX_TEXT_LENGTH} characters) and was removed!\n\n` +
          `<b>Action:</b> Warn (${warnCount}/${MAX_WARNS}) ❕`,
          { parse_mode: "HTML" }
        );
        
        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(chatId, warning.message_id);
          } catch {}
        }, 9000);
        return;
      } catch (err) {
        console.error("[LongText Filter Error]:", err);
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiSpam Middleware Error]:", error);
    await next();
  }
});
