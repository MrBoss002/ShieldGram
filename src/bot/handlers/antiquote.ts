import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const antiQuoteHandler = new Composer();

const MAX_WARNS = 3;

async function incrementUserWarning(userId: number, chatId: number): Promise<number> {
  try {
    let config = await GroupConfig.findOne({ groupId: chatId });
    if (!config) {
      config = await GroupConfig.create({ groupId: chatId, ownerId: userId });
    }
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
    console.error("[Database Warning Error]:", err);
    return 1;
  }
}

antiQuoteHandler.on("message", async (ctx, next) => {
  try {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") {
      return await next();
    }

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // Admin exemption check
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) {
        return await next();
      }
    } catch {}

    let isExternalQuote = false;
    let quoteSourceType = "Channel/Bot";
    const msg = ctx.message as any;

    // 1. Check modern forward_origin
    if (msg.forward_origin) {
      const origin = msg.forward_origin;
      if (origin.type === "channel") {
        isExternalQuote = true;
        quoteSourceType = "Channel";
      } else if (origin.type === "chat" && origin.chat && origin.chat.id !== chatId) {
        isExternalQuote = true;
        quoteSourceType = "External Group";
      } else if (origin.type === "user" && origin.sender_user && origin.sender_user.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "Bot";
      }
    }

    // 2. Check legacy forward fields
    if (!isExternalQuote) {
      if (msg.forward_from_chat) {
        if (msg.forward_from_chat.type === "channel") {
          isExternalQuote = true;
          quoteSourceType = "Channel";
        } else if (msg.forward_from_chat.id !== chatId) {
          isExternalQuote = true;
          quoteSourceType = "External Group";
        }
      } else if (msg.forward_from && msg.forward_from.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "Bot";
      }
    }

    // 3. Check reply / quoted message target
    if (!isExternalQuote && msg.reply_to_message) {
      const reply = msg.reply_to_message;
      if (reply.forward_from_chat) {
        if (reply.forward_from_chat.type === "channel" || reply.forward_from_chat.id !== chatId) {
          isExternalQuote = true;
          quoteSourceType = "Channel/Group";
        }
      } else if (reply.from && reply.from.is_bot && reply.from.id !== ctx.me.id) {
        isExternalQuote = true;
        quoteSourceType = "Bot";
      }
    }

    // Take action if external quote/forward detected
    if (isExternalQuote) {
      try {
        await ctx.deleteMessage();
        const warnCount = await incrementUserWarning(userId, chatId);

        const warning = await ctx.reply(
          `⚠️ <b>Anti-Quote Warning</b>\n` +
          `Hey ${ctx.from.first_name}, quoting or forwarding content from external ${quoteSourceType}s is restricted here to prevent spam ads.\n\n` +
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
        console.error("[Anti-Quote Action Error]:", err);
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiQuote Middleware Error]:", error);
    await next();
  }
});
