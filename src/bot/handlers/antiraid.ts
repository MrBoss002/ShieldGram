import { Composer, InlineKeyboard } from "grammy";

export const antiRaidHandler = new Composer();

// Tracking join timestamps: Map<chatId, timestamp[]>
const joinTracker = new Map<number, number[]>();

// Configuration thresholds
const RAID_JOIN_LIMIT = 5;      // Joins threshold...
const RAID_WINDOW_MS = 10000;   // ...within 10 seconds
const EMERGENCY_SLOWMODE_SEC = 60; // 60 seconds slow-mode delay

antiRaidHandler.on("chat_member", async (ctx, next) => {
  try {
    const update = ctx.chatMember;
    const chatId = ctx.chat.id;

    // Check if event is a new member joining/added
    const isNewJoin =
      ["left", "kicked"].includes(update.old_chat_member.status) &&
      ["member", "restricted"].includes(update.new_chat_member.status);

    if (!isNewJoin) {
      return await next();
    }

    const now = Date.now();
    let timestamps = joinTracker.get(chatId) || [];

    // Filter joins within window
    timestamps = timestamps.filter((time) => now - time < RAID_WINDOW_MS);
    timestamps.push(now);
    joinTracker.set(chatId, timestamps);

    // Trigger Anti-Raid Emergency Mode
    if (timestamps.length >= RAID_JOIN_LIMIT) {
      // Clear tracker so it doesn't spam alert messages repeatedly
      joinTracker.set(chatId, []);

      try {
        // Enable Slow Mode (60 seconds)
        await ctx.api.setChatSlowModeDelay(chatId, EMERGENCY_SLOWMODE_SEC);

        const keyboard = new InlineKeyboard().text(
          "🟢 Disable Raid Mode",
          `antiraid_disable_${chatId}`
        );

        await ctx.reply(
          `🚨 <b>Anti-Raid Activated</b>\n` +
          `Abnormal join velocity detected! Emergency slow-mode (${EMERGENCY_SLOWMODE_SEC}s) has been automatically enabled to protect the group.\n\n` +
          `<b>Action:</b> Emergency Lockdown 🛡️`,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          }
        );
      } catch (err) {
        console.error("[Anti-Raid Enable Error]:", err);
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiRaid Middleware Error]:", error);
    await next();
  }
});

// Callback handler for the "Disable Raid Mode" inline button
antiRaidHandler.callbackQuery(/^antiraid_disable_(-?\d+)$/, async (ctx) => {
  try {
    const chatId = Number(ctx.match[1]);
    const userId = ctx.from.id;

    // Admin authorization check
    const member = await ctx.api.getChatMember(chatId, userId);
    if (!["creator", "administrator"].includes(member.status)) {
      return await ctx.answerCallbackQuery({
        text: "❌ Only administrators can disable Emergency Raid Mode!",
        show_alert: true,
      });
    }

    // Turn off slow-mode (0 seconds delay)
    await ctx.api.setChatSlowModeDelay(chatId, 0);

    await ctx.answerCallbackQuery({
      text: "✅ Raid Mode disabled! Slow-mode removed.",
    });

    await ctx.editMessageText(
      `✅ <b>Raid Mode Lifted</b>\n` +
      `Emergency slow-mode was disabled by <b>${ctx.from.first_name}</b>. Group chat permissions restored!`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[Anti-Raid Disable Error]:", err);
    await ctx.answerCallbackQuery({
      text: "❌ Failed to update chat slow-mode status.",
      show_alert: true,
    });
  }
});
