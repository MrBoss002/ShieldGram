import { Context, NextFunction, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { checkChannelMemberships } from "../../services/gatekeeper";

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
    // 1. Skip checks for Admins & Owner
    const member = await ctx.getChatMember(userId);
    if (["creator", "administrator"].includes(member.status)) {
      return next();
    }

    // 2. Fetch Group Config
    const config = await GroupConfig.findOne({ groupId });
    if (
      !config ||
      !config.features.forceSub.enabled ||
      !config.features.forceSub.channels ||
      config.features.forceSub.channels.length === 0
    ) {
      return next();
    }

    // 3. Verify Subscriptions via Gatekeeper
    const missingChannels = await checkChannelMemberships(
      ctx.api as any,
      userId,
      config.features.forceSub.channels
    );

    if (missingChannels.length > 0) {
      // Immediately delete user's message
      await ctx.deleteMessage().catch(() => {});

      const keyboard = new InlineKeyboard();

      // Build Channel Join Buttons
      missingChannels.forEach((channel, index) => {
        let channelUrl = channel;
        if (!channel.startsWith("http://") && !channel.startsWith("https://")) {
          const cleanHandle = channel.replace("@", "");
          channelUrl = `https://t.me/${cleanHandle}`;
        }
        keyboard.url(`📢 Join Channel ${index + 1}`, channelUrl).row();
      });

      // Add a verification button for quick re-check
      keyboard.text("🔄 I Have Joined", `check_fsub_${userId}`);

      const firstName = ctx.from.first_name || "User";
      const warningMsg = await ctx.reply(
        `⚠️ Hello [${firstName}](tg://user?id=${userId}), you must subscribe to our required channels before chatting in this group!`,
        {
          parse_mode: "Markdown",
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
