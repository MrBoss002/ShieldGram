import { Composer } from "grammy";

export const antiQuoteHandler = new Composer();

const userWarns = new Map<string, number>();
const MAX_WARNS = 3;

function addWarning(userId: number, chatId: number): number {
  const key = `${userId}_${chatId}`;
  const current = userWarns.get(key) || 0;
  const updated = current + 1;
  userWarns.set(key, updated);
  return updated;
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
    let quoteSourceType = "";

    const origin = ctx.message.forward_origin as any;
    if (origin) {
      if (origin.type === "channel") {
        isExternalQuote = true;
        quoteSourceType = "Channel";
      } else if (origin.type === "chat") {
        if (origin.chat && origin.chat.id !== chatId) {
          isExternalQuote = true;
          quoteSourceType = "External Group";
        }
      } else if (origin.type === "user" && origin.sender_user && origin.sender_user.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "Bot";
      }
    }

    if (!isExternalQuote) {
      const replyMsg = ctx.message.reply_to_message as any;
      if (replyMsg) {
        if (replyMsg.forward_from_chat) {
          const fwdChat = replyMsg.forward_from_chat;
          if (fwdChat.type === "channel") {
            isExternalQuote = true;
            quoteSourceType = "Channel";
          } else if ((fwdChat.type === "supergroup" || fwdChat.type === "group") && fwdChat.id !== chatId) {
            isExternalQuote = true;
            quoteSourceType = "External Group";
          }
        } else if (replyMsg.from && replyMsg.from.is_bot && replyMsg.from.id !== ctx.me.id) {
          isExternalQuote = true;
          quoteSourceType = "Bot";
        }
      }
    }

    if (isExternalQuote) {
      try {
        await ctx.deleteMessage();
        const warnCount = addWarning(userId, chatId);

        const warning = await ctx.reply(
          `⚠️ <b>Anti-Quote Warning</b>\n` +
          `Hey ${ctx.from.first_name}, quoting content from external ${quoteSourceType}s is restricted here to prevent spam ads.\n\n` +
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
