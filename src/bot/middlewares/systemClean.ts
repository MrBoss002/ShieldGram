import { Context, NextFunction } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const systemCleanMiddleware = async (
  ctx: Context,
  next: NextFunction
): Promise<void> => {
  if (!ctx.chat || (ctx.chat.type !== "supergroup" && ctx.chat.type !== "group")) {
    return next();
  }

  // Detect service messages (user joined, left, pinned message, title changed, etc.)
  const isServiceMessage =
    !!ctx.message?.new_chat_members ||
    !!ctx.message?.left_chat_member ||
    !!ctx.message?.new_chat_title ||
    !!ctx.message?.new_chat_photo ||
    !!ctx.message?.pinned_message;

  if (isServiceMessage) {
    try {
      const config = await GroupConfig.findOne({ groupId: ctx.chat.id });
      if (config && config.features.cleanSystemAlerts.enabled) {
        await ctx.deleteMessage().catch(() => {});
        return; // Message deleted, do not propagate
      }
    } catch (error) {
      console.error("[SystemClean Middleware Error]:", error);
    }
  }

  return next();
};
