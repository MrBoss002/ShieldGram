import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { issueAutoWarn } from "./moderation";

export const antiSpamHandler = new Composer();

// In-memory flood tracking storage: Map<userId_chatId, timestamp[]>
const floodTracker = new Map<string, number[]>();

// Configuration constants
const FLOOD_LIMIT = 3;        // Max messages allowed...
const FLOOD_WINDOW_MS = 5000; // ...within 5 seconds
const MAX_TEXT_LENGTH = 300;  // Max characters allowed for longtext filter

antiSpamHandler.on("message", async (ctx, next) => {
  try {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") {
      return await next();
    }

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // 1. Check feature toggle status
    const config = await GroupConfig.findOne({ groupId: chatId });
    if (!config || !config.features?.antiSpam?.enabled) {
      return await next();
    }

    // 2. Check if user is an admin (Admins are exempt)
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) {
        return await next();
      }
    } catch {}

    const messageText = ctx.message.text || ctx.message.caption || "";

    // 3. Flood Guard Check (Placed first to catch rapid-fire spam effectively)
    const trackerKey = `${userId}_${chatId}`;
    const now = Date.now();
    let timestamps = floodTracker.get(trackerKey) || [];

    timestamps = timestamps.filter((time) => now - time < FLOOD_WINDOW_MS);
    timestamps.push(now);
    floodTracker.set(trackerKey, timestamps);

    if (timestamps.length >= FLOOD_LIMIT) {
      try {
        await ctx.deleteMessage();
        await issueAutoWarn(
          ctx,
          chatId,
          ctx.from,
          "sending messages too quickly (flood guard)"
        );

        floodTracker.set(trackerKey, []);
        return;
      } catch (err) {
        // Message might already be deleted by another handler
        return;
      }
    }

    // 4. LongText Filter Check
    if (messageText.length > MAX_TEXT_LENGTH) {
      try {
        await ctx.deleteMessage();
        await issueAutoWarn(
          ctx,
          chatId,
          ctx.from,
          `your message exceeded the allowed character limit (${messageText.length}/${MAX_TEXT_LENGTH} characters)`
        );
        return;
      } catch (err) {
        // Message might already be deleted by another handler (e.g. Anti-Link)
        return;
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiSpam Middleware Error]:", error);
    await next();
  }
});
