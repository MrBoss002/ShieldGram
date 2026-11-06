import { Composer } from "grammy";

export const antiQuoteHandler = new Composer();

// In-memory warning tracker (Replace with DB query if using persistence)
// Map<userId_chatId, warningCount>
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

    // 1. Admin exemption check
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (["creator", "administrator"].includes(member.status)) {
        return await next();
      }
    } catch {}

    let isExternalQuote = false;
    let quoteSourceType = "";

    // 2. Check Telegram Forward Origin (Grammy / Bot API 7.0+)
    const origin = ctx.message.forward_origin;
    if (origin) {
      if (origin.type === "channel") {
        isExternalQuote = true;
        quoteSourceType = "Channel";
      } else if (origin.type === "chat") {
        // Quoted/forwarded from an external group
        if (origin.chat.id !== chatId) {
          isExternalQuote = true;
          quoteSourceType = "External Group";
        }
      } else if (origin.type === "user" && origin.sender_user.is_bot) {
        isExternalQuote = true;
        quoteSourceType = "Bot";
      }
    }

    // 3. Check legacy forward fields or reply target origin
    if (!isExternalQuote) {
      const replyMsg = ctx.message.reply_to_message;
      if (replyMsg) {
        if (replyMsg.forward_from_chat) {
          if (replyMsg.forward_from_chat.type === "channel") {
            isExternalQuote = true;
            quoteSourceType = "Channel";
          } else if (replyMsg.forward_from_chat.type === "supergroup" || replyMsg.forward_from_chat.type === "group") {
            if (replyMsg.forward_from_chat.id !== chatId) {
              isExternalQuote = true;
              quoteSourceType = "External Group";
            }
          }
        } else if (replyMsg.from && replyMsg.from.is_bot && replyMsg.from.id !== ctx.me.id) {
          // Quote from an external bot
          isExternalQuote = true;
          quoteSourceType = "Bot";
        }
      }
    }

    // 4. Take action if an external quote block (Channel / Group / Bot) was detected
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
