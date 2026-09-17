import { Context, NextFunction, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { checkChannelMemberships } from "../../services/gatekeeper";

export const forceSubMiddleware = async (
  ctx: Context,
  next: NextFunction
): Promise<void> => {
  // Only execute in supergroups or regular groups
  if (!ctx.chat || (ctx.chat.type !== "supergroup" && ctx.chat.type !== "group")) {
    return next();
  }

  // Skip system updates, bots, and service messages
  if (!ctx.message || ctx.from?.is_bot) {
    return next();
  }

  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  try {
    // Ignore group admins and creator from Force-Sub checks
    const member = await ctx.getChatMember(userId);
    if (["creator", "administrator"].includes(member.status)) {
      return next();
    }

    // Fetch group configuration
    const config = await GroupConfig.findOne({ groupId });
    if (
      !config ||
      !config.features.forceSub.enabled ||
      config.features.forceSub.channels.length === 0
    ) {
      return next();
    }

    // Check channel subscriptions
    const missingChannels = await checkChannelMemberships(
      ctx.api as any,
      userId,
      config.features.forceSub.channels
    );

    if (missingChannels.length > 0) {
      // Delete non-compliant user message
      await ctx.deleteMessage().catch(() => {});

      // Build inline buttons for missing channels
      const keyboard = new InlineKeyboard();
      missingChannels.forEach((channel, index) => {
        const cleanHandle = channel.replace("@", "");
        keyboard.url(`📢 Join Channel ${index + 1}`, `https://t.me/${cleanHandle}`).row();
      });

      const warningMsg = await ctx.reply(
        `⚠️ Hello [${ctx.from.first_name}](tg://user?id=${userId}), you must subscribe to our required channels before chatting in this group!`,
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

      return; // Stop execution chain
    }
  } catch (error) {
    console.error("[ForceSub Middleware Error]:", error);
  }

  return next();
};
