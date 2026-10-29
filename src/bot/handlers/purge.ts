import { Composer } from "grammy";

export const purgeHandler = new Composer();

purgeHandler.command("purge", async (ctx) => {
  try {
    // Ensure we are inside a group message
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.message) {
      return ctx.reply("❌ The <code>/purge</code> command can only be used in groups.", { parse_mode: "HTML" });
    }

    // Verify Admin status
    const member = await ctx.getChatMember(ctx.from!.id);
    if (!["creator", "administrator"].includes(member.status)) {
      return ctx.reply("⚠️ You need to be an Admin to use <code>/purge</code>.", { parse_mode: "HTML" });
    }

    // Must be a reply to a message
    const replyMessage = ctx.message.reply_to_message;
    if (!replyMessage) {
      return ctx.reply("⚠️ Please reply to the starting message you want to purge from.");
    }

    const startId = replyMessage.message_id;
    const endId = ctx.message.message_id;

    // Collect message IDs in range
    const messageIdsToDelete: number[] = [];
    for (let id = startId; id <= endId; id++) {
      messageIdsToDelete.push(id);
    }

    // Telegram allows deleting up to 100 messages per API call using deleteMessages
    const chunkSize = 100;
    for (let i = 0; i < messageIdsToDelete.length; i += chunkSize) {
      const chunk = messageIdsToDelete.slice(i, i + chunkSize);
      await ctx.api.deleteMessages(ctx.chat.id, chunk);
    }

    const deletedCount = messageIdsToDelete.length;

    // Send self-destructing status notice
    const statusMsg = await ctx.reply(`🗑️ <b>Purged ${deletedCount} messages!</b>`, { parse_mode: "HTML" });

    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch {}
    }, 3000);

  } catch (error) {
    console.error("[Purge Error]:", error);
    await ctx.reply("❌ Failed to purge messages. Make sure I have 'Delete Messages' admin permissions.");
  }
});
