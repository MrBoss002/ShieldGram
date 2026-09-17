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
    const member = await ctx.getChatMember(userId);
    if (["creator", "administrator"].includes(member.status)) {
      return next();
    }

    const config = await GroupConfig.findOne({ groupId });
    if (
      !config ||
      !config.features.forceSub.enabled ||
      config.features.forceSub.channels.length === 0
    ) {
      return next();
    }

    const missingChannels = await checkChannelMemberships(
      ctx.api as any,
      userId,
      config.features.forceSub.channels
    );

    if (missingChannels.length > 0) {
      await ctx.deleteMessage().catch(() => {});

      const keyboard = new InlineKeyboard();
      missingChannels.forEach((channel, index) => {
        const cleanHandle = channel.replace("@", "");
        keyboard.url(`📢 Join Channel ${index + 1}`, `https://t.me/${cleanHandle}`).row();
      });

      const firstName = ctx.from.first_name;
      const warningMsg = await ctx.reply(
        `⚠️ Hello [${firstName}](tg://user?id=${userId}), you must subscribe to our required channels before chatting in this group!`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        }
      );

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
