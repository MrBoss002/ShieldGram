import { Composer } from "grammy";

export const pinHandler = new Composer();

// --- /pin COMMAND ---
pinHandler.command("pin", async (ctx) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
      return ctx.reply("❌ The <code>/pin</code> command can only be used in groups.", { parse_mode: "HTML" });
    }

    // Verify Admin status
    const member = await ctx.getChatMember(ctx.from!.id);
    if (!["creator", "administrator"].includes(member.status)) {
      return ctx.reply("⚠️ You need to be an Admin to use <code>/pin</code>.", { parse_mode: "HTML" });
    }

    // Check if command is a reply to a message
    const replyMessage = ctx.message.reply_to_message;
    if (!replyMessage) {
      return ctx.reply("⚠️ Please reply to the message you want to pin.");
    }

    // Check if notification flag is included (e.g. /pin loud or /pin notify)
    const args = ctx.message.text.split(" ").slice(1);
    const notify = args.length > 0 && ["loud", "notify", "yes"].includes(args[0].toLowerCase());

    await ctx.api.pinChatMessage(ctx.chat.id, replyMessage.message_id, {
      disable_notification: !notify,
    });

    const statusMsg = await ctx.reply("📌 <b>Message pinned successfully!</b>", { parse_mode: "HTML" });

    // Auto-delete confirmation message after 3 seconds
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch {}
    }, 3000);

  } catch (error) {
    console.error("[Pin Error]:", error);
    await ctx.reply("❌ Failed to pin message. Make sure I have 'Pin Messages' admin permission.");
  }
});

// --- /unpinall COMMAND ---
pinHandler.command("unpinall", async (ctx) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
      return ctx.reply("❌ The <code>/unpinall</code> command can only be used in groups.", { parse_mode: "HTML" });
    }

    // Verify Admin status
    const member = await ctx.getChatMember(ctx.from!.id);
    if (!["creator", "administrator"].includes(member.status)) {
      return ctx.reply("⚠️ You need to be an Admin to use <code>/unpinall</code>.", { parse_mode: "HTML" });
    }

    await ctx.api.unpinAllChatMessages(ctx.chat.id);

    const statusMsg = await ctx.reply("📌 <b>Unpinned all messages in this group!</b>", { parse_mode: "HTML" });

    // Auto-delete confirmation message after 3 seconds
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch {}
    }, 3000);

  } catch (error) {
    console.error("[UnpinAll Error]:", error);
    await ctx.reply("❌ Failed to unpin messages. Make sure I have 'Pin Messages' admin permission.");
  }
});
