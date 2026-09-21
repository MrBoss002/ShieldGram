import { Context, NextFunction, InlineKeyboard, Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { checkChannelMemberships } from "../../services/gatekeeper";

export const forceSubHandler = new Composer();

// --- 1. FORCESUB MIDDLEWARE ---
export const forceSubMiddleware = async (
  ctx: Context,
  next: NextFunction
): Promise<void> => {
  if (!ctx.chat || (ctx.chat.type !== "supergroup" && ctx.chat.type !== "group")) {
    return next();
  }

  if (!ctx.message || !ctx.from || ctx.from.is_bot) {
    return next();
  }

  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  try {
    // Skip checks for Admins & Owner
    const member = await ctx.getChatMember(userId);
    if (["creator", "administrator"].includes(member.status)) {
      return next();
    }

    // Fetch Group Config
    const config = await GroupConfig.findOne({ groupId });
    if (
      !config ||
      !config.features?.forceSub?.enabled ||
      !config.features?.forceSub?.channels ||
      config.features.forceSub.channels.length === 0
    ) {
      return next();
    }

    // Verify Subscriptions via Gatekeeper Service
    const missingChannels = await checkChannelMemberships(
      ctx.api as any,
      userId,
      config.features.forceSub.channels
    );

    if (missingChannels.length > 0) {
      // Delete user's non-compliant message immediately
      await ctx.deleteMessage().catch(() => {});

      const keyboard = new InlineKeyboard();

      // Build Channel Join Buttons (Standardized "📢 JOIN CHANNEL" Label)
      missingChannels.forEach((channelEntry) => {
        let channelUrl = channelEntry;

        if (channelEntry.includes("|")) {
          const [, link] = channelEntry.split("|");
          channelUrl = link;
        } else if (channelEntry.startsWith("@")) {
          channelUrl = `https://t.me/${channelEntry.replace("@", "")}`;
        } else if (!channelEntry.startsWith("http://") && !channelEntry.startsWith("https://")) {
          const cleanHandle = channelEntry.replace("@", "");
          channelUrl = `https://t.me/${cleanHandle}`;
        }

        keyboard.url("📢 JOIN CHANNEL", channelUrl).row();
      });

      // Verification button for real-time re-check
      keyboard.text("🔄 I Have Joined", `check_fsub_${userId}`);

      const firstName = ctx.from.first_name || "User";
      const warningMsg = await ctx.reply(
        `⚠️ Hello <a href="tg://user?id=${userId}">${firstName}</a>, you must subscribe to our required channel before chatting in this group!`,
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );

      // Auto-delete warning message
      const autoDeleteSecs = config.features.forceSub.autoDeleteSeconds || 30;
      setTimeout(() => {
        ctx.api.deleteMessage(groupId, warningMsg.message_id).catch(() => {});
      }, autoDeleteSecs * 1000);

      return;
    }
  } catch (error) {
    console.error("[ForceSub Middleware Error]:", error);
  }

  return next();
};

// --- 2. CALLBACK HANDLER ("🔄 I Have Joined" BUTTON) ---
forceSubHandler.callbackQuery(/^check_fsub_(\d+)$/, async (ctx) => {
  const targetUserId = parseInt(ctx.match[1]);
  const clickerId = ctx.from.id;

  // Ensure only the targeted user gets verified
  if (clickerId !== targetUserId) {
    return ctx.answerCallbackQuery({
      text: "⚠️ This verification button is not for you!",
      show_alert: true,
    });
  }

  const groupId = ctx.chat?.id;
  if (!groupId) return ctx.answerCallbackQuery();

  const config = await GroupConfig.findOne({ groupId });
  if (!config || !config.features?.forceSub?.channels) {
    return ctx.answerCallbackQuery({
      text: "❌ Configuration error.",
      show_alert: true,
    });
  }

  // Re-verify channel membership in real time
  const missingChannels = await checkChannelMemberships(
    ctx.api as any,
    clickerId,
    config.features.forceSub.channels
  );

  // Case A: User still has not joined
  if (missingChannels.length > 0) {
    return ctx.answerCallbackQuery({
      text: "⚠️ You haven't joined the required channel yet! Please subscribe first and try again.",
      show_alert: true,
    });
  }

  // Case B: User joined successfully
  await ctx.deleteMessage().catch(() => {});

  return ctx.answerCallbackQuery({
    text: "✅ Verification successful! You can now send messages in the group.",
    show_alert: true,
  });
});
