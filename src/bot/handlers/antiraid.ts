import { Composer, InlineKeyboard } from "grammy";

export const antiRaidHandler = new Composer();

const joinTracker = new Map<number, number[]>();

const RAID_JOIN_LIMIT = 5;
const RAID_WINDOW_MS = 10000;
const EMERGENCY_SLOWMODE_SEC = 60;

antiRaidHandler.on("chat_member", async (ctx, next) => {
  try {
    const update = ctx.chatMember;
    const chatId = ctx.chat.id;

    const isNewJoin =
      ["left", "kicked"].includes(update.old_chat_member.status) &&
      ["member", "restricted"].includes(update.new_chat_member.status);

    if (!isNewJoin) {
      return await next();
    }

    const now = Date.now();
    let timestamps = joinTracker.get(chatId) || [];

    timestamps = timestamps.filter((time) => now - time < RAID_WINDOW_MS);
    timestamps.push(now);
    joinTracker.set(chatId, timestamps);

    if (timestamps.length >= RAID_JOIN_LIMIT) {
      joinTracker.set(chatId, []);

      try {
        // Safe raw API call for slow-mode
        await ctx.api.raw.setChatSlowModeDelay({
          chat_id: chatId,
          slow_mode_delay: EMERGENCY_SLOWMODE_SEC,
        });

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

antiRaidHandler.callbackQuery(/^antiraid_disable_(-?\d+)$/, async (ctx) => {
  try {
    const chatId = Number(ctx.match[1]);
    const userId = ctx.from.id;

    const member = await ctx.api.getChatMember(chatId, userId);
    if (!["creator", "administrator"].includes(member.status)) {
      return await ctx.answerCallbackQuery({
        text: "❌ Only administrators can disable Emergency Raid Mode!",
        show_alert: true,
      });
    }

    await ctx.api.raw.setChatSlowModeDelay({
      chat_id: chatId,
      slow_mode_delay: 0,
    });

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
