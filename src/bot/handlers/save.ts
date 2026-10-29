import { Composer, InlineKeyboard } from "grammy";

export const saveHandler = new Composer();

saveHandler.command("save", async (ctx) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
      return ctx.reply("❌ The <code>/save</code> command is meant to be used inside group chats.", { parse_mode: "HTML" });
    }

    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg) {
      return ctx.reply("⚠️ Reply to any message or file with <code>/save</code> to keep it in your PM!", { parse_mode: "HTML" });
    }

    const userId = ctx.from.id;

    try {
      // Use copyMessage to handle groups with forward restrictions seamlessly
      await ctx.api.copyMessage(userId, ctx.chat.id, replyMsg.message_id);

      const status = await ctx.reply("📥 <b>Saved to your Direct Messages!</b> Check your PM.", { parse_mode: "HTML" });

      // Auto-delete group notice after 4 seconds
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, status.message_id);
        } catch {}
      }, 4000);

    } catch (pmError: any) {
      // Handles unstarted PM or blocked bot error
      const botUsername = ctx.me.username;
      const pmUrl = `https://t.me/${botUsername}?start=save`;
      const keyboard = new InlineKeyboard().url("💬 Start Bot in PM", pmUrl);

      return ctx.reply(
        "⚠️ <b>I couldn't send you a PM!</b>\n" +
        "You need to tap the button below and start a private chat with me first.",
        { parse_mode: "HTML", reply_markup: keyboard }
      );
    }

  } catch (error) {
    console.error("[Save Error]:", error);
    await ctx.reply("❌ Unable to save message.");
  }
});
