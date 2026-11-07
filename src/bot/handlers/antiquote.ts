import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { issueAutoWarn } from "./moderation";

export const antiQuoteHandler = new Composer();

antiQuoteHandler.on("message", async (ctx, next) => {
  try {
    if (!ctx.chat || !ctx.from || ctx.chat.type === "private") {
      return await next();
    }

    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    // 1. Check feature toggle status (Default to enabled if undefined)
    const config = await GroupConfig.findOne({ groupId: chatId });
    if (config && config.features?.antiQuote && !config.features.antiQuote.enabled) {
      return await next();
    }

    // 2. Admin exemption check
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) {
        return await next();
      }
    } catch {}

    let isExternalQuote = false;
    let quoteSourceType = "external content";
    const msg = ctx.message as any;

    // 3. Check modern Telegram forward_origin
    if (msg.forward_origin) {
      const origin = msg.forward_origin;
      if (origin.type === "channel") {
        isExternalQuote = true;
        quoteSourceType = "a channel";
      } else if (origin.type === "chat" && origin.chat && origin.chat.id !== chatId) {
        isExternalQuote = true;
        quoteSourceType = "an external group";
      } else if (origin.type === "user" && origin.sender_user && origin.sender_user.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "a bot";
      } else if (origin.type === "hidden_user") {
        isExternalQuote = true;
        quoteSourceType = "a hidden user format";
      }
    }

    // 4. Check Telegram external_reply (New Telegram Quote feature)
    if (!isExternalQuote && msg.external_reply) {
      isExternalQuote = true;
      quoteSourceType = "an external quote/reply";
    }

    // 5. Check legacy forward fields
    if (!isExternalQuote) {
      if (msg.forward_from_chat) {
        if (msg.forward_from_chat.type === "channel") {
          isExternalQuote = true;
          quoteSourceType = "a channel";
        } else if (msg.forward_from_chat.id !== chatId) {
          isExternalQuote = true;
          quoteSourceType = "an external group";
        }
      } else if (msg.forward_from && msg.forward_from.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "a bot";
      } else if (msg.forward_date) {
        isExternalQuote = true;
        quoteSourceType = "a forwarded post";
      }
    }

    // 6. Check reply / quoted message target
    if (!isExternalQuote && msg.reply_to_message) {
      const reply = msg.reply_to_message;
      if (reply.forward_from_chat || reply.forward_origin || reply.external_reply) {
        isExternalQuote = true;
        quoteSourceType = "a channel/group post";
      } else if (reply.from && reply.from.is_bot && reply.from.id !== ctx.me.id) {
        isExternalQuote = true;
        quoteSourceType = "a bot message";
      }
    }

    // 7. Trigger Warning if external quote/forward detected
    if (isExternalQuote) {
      try {
        await ctx.deleteMessage();
        await issueAutoWarn(
          ctx,
          chatId,
          ctx.from,
          `quoting or forwarding content from ${quoteSourceType} is restricted`
        );
        return;
      } catch (err) {
        return;
      }
    }

    await next();
  } catch (error) {
    console.error("[AntiQuote Middleware Error]:", error);
    await next();
  }
});
