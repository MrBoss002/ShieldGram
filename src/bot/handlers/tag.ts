import { Composer } from "grammy";

export const tagCommandHandler = new Composer();

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

tagCommandHandler.command("tag", async (ctx) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private" || !ctx.from) {
      return;
    }

    const chatId = ctx.chat.id;
    const senderId = ctx.from.id;

    // 1. Check if the sender is a group admin (or anonymous admin 1087968)
    if (senderId !== 1087968) {
      const senderMember = await ctx.api.getChatMember(chatId, senderId);
      if (!["creator", "administrator"].includes(senderMember.status)) {
        return; // Silently ignore regular members
      }
    }

    // 2. Require replying to a target user
    const replyTarget = ctx.message?.reply_to_message?.from;
    if (!replyTarget) {
      return await ctx.reply(
        "ℹ️ Reply to a member's message with <code>/tag Label</code> to set their tag, or reply with <code>/tag</code> to remove it.",
        { parse_mode: "HTML" }
      );
    }

    // Safe fallback so ctx.match never crashes if empty
    const rawTag = (typeof ctx.match === "string" ? ctx.match : "").trim();

    // 3. Validate tag length (Telegram limit is 16 characters)
    if (rawTag.length > 16) {
      return await ctx.reply("❌ Tags must be 16 characters or fewer.");
    }

    // 4. Set or remove the tag (empty string clears it)
    await ctx.api.setChatMemberTag(chatId, replyTarget.id, rawTag);

    const safeName = escapeHtml(replyTarget.first_name);

    if (rawTag === "") {
      await ctx.reply(`✅ Removed tag for <b>${safeName}</b>.`, { parse_mode: "HTML" });
    } else {
      await ctx.reply(
        `🏷️ Updated tag for <b>${safeName}</b> to: <code>${escapeHtml(rawTag)}</code>`,
        { parse_mode: "HTML" }
      );
    }
  } catch (error: any) {
    console.error("[Tag Command Error]:", error);
    await ctx.reply(
      "❌ Failed to update tag. Make sure I have the <b>Manage Tags</b> admin permission, the target is a regular member (not an admin), and the tag contains no emojis.",
      { parse_mode: "HTML" }
    );
  }
});
