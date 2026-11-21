import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

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
    const rawTag = ctx.match.trim();

    // 1. Validate tag length (Telegram limit is 16 characters)
    if (rawTag.length > 16) {
      return await ctx.reply("❌ Tags must be 16 characters or fewer.");
    }

    // 2. Check if the sender is a group admin
    const senderMember = await ctx.api.getChatMember(chatId, senderId);
    const isAdmin = ["creator", "administrator"].includes(senderMember.status);

    // 3. Determine who gets the tag (Replied user vs. Sender)
    const replyTarget = ctx.message?.reply_to_message?.from;
    let targetUserId = senderId;
    let targetName = ctx.from.first_name;

    if (replyTarget) {
      if (!isAdmin) {
        return await ctx.reply("⚠️ Only group admins can change another member's tag.");
      }
      targetUserId = replyTarget.id;
      targetName = replyTarget.first_name;
    } else {
      // Safe lookup so TypeScript doesn't fail before GroupConfig schema is updated
      const config = (await GroupConfig.findOne({ groupId: chatId }).lean()) as any;
      const allowSelfTag = config?.features?.allowSelfTag ?? false;

      if (!isAdmin && !allowSelfTag) {
        return await ctx.reply("⚠️ Self-tagging is currently disabled in this group.");
      }
    }

    // 4. Pass rawTag directly as a string (matches your grammY version's signature)
    await ctx.api.setChatMemberTag(chatId, targetUserId, rawTag);

    const safeName = escapeHtml(targetName);

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
      "❌ Failed to update tag. Make sure I have the <b>Manage Tags</b> admin permission, the target is not an admin, and the tag contains no emojis.",
      { parse_mode: "HTML" }
    );
  }
});
