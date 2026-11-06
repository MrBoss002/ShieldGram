import { Composer } from "grammy";

export const antiSpamHandler = new Composer();

// In-memory flood tracking storage: Map<userId_chatId, timestamp[]>
const floodTracker = new Map<string, number[]>();

// In-memory warning tracker (Replace with DB query if using persistence)
// Map<userId_chatId, warningCount>
const userWarns = new Map<string, number>();

// Configuration constants
const FLOOD_LIMIT = 5;       // Max messages allowed...
const FLOOD_WINDOW_MS = 4000; // ...within 4 seconds
const MAX_TEXT_LENGTH = 300;  // Max characters allowed for longtext filter
const MAX_WARNS = 3;          // Warning threshold limit

// Helper to increment and fetch warn count
function addWarning(userId: number, chatId: number): number {
  const key = `${userId}_${chatId}`;
  const current = userWarns.get(key) || 0;
  const updated = current + 1;
  userWarns.set(key, updated);
  return updated;
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

    // 2. LongText Filter Check
    if (messageText.length > MAX_TEXT_LENGTH) {
      try {
        await ctx.deleteMessage();
        const warnCount = addWarning(userId, chatId);

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
        }, 5000);
        return;
      } catch (err) {
        console.error("[LongText Filter Error]:", err);
      }
    }

    // 3. Flood Guard Check
    const trackerKey = `${userId}_${chatId}`;
    const now = Date.now();
    let timestamps = floodTracker.get(trackerKey) || [];

    timestamps = timestamps.filter((time) => now - time < FLOOD_WINDOW_MS);
    timestamps.push(now);
    floodTracker.set(trackerKey, timestamps);

    if (timestamps.length > FLOOD_LIMIT) {
      try {
        await ctx.deleteMessage();
        const warnCount = addWarning(userId, chatId);
        
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
        }, 5000);

        floodTracker.delete(trackerKey);
        return;
      } catch (err) {
        console.error("[Flood Guard Error]:", err);
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiSpam Middleware Error]:", error);
    await next();
  }
});
