import { Composer } from "grammy";

export const antiBotHandler = new Composer();

antiBotHandler.on("chat_member", async (ctx, next) => {
  try {
    const update = ctx.chatMember;
    const chatId = ctx.chat.id;

    // Check if a new member joined / was added
    const isNewMember =
      ["left", "kicked", "restricted"].includes(update.old_chat_member.status) &&
      ["member", "administrator"].includes(update.new_chat_member.status);

    if (!isNewMember) {
      return await next();
    }

    const addedMember = update.new_chat_member.user;

    // Check if the newly joined member is a bot
    if (!addedMember.is_bot) {
      return await next();
    }

    // Bypass if the action was performed anonymously by a channel/group
    if (ctx.senderChat) {
      return await next();
    }

    // Find out who invited/added them (ctx.from represents the user who performed the action)
    const inviter = ctx.from;
    
    // If we can't determine who invited them, or if it's the bot itself, pass through
    if (!inviter || inviter.id === addedMember.id) {
      return await next();
    }

    // Bypass for Telegram's anonymous admin placeholder
    if (inviter.id === 1087968) {
      return await next();
    }

    // Check if the person who added the bot is an admin or creator
    let isAdmin = false;
    try {
      const inviterMember = await ctx.api.getChatMember(chatId, inviter.id);
      isAdmin = ["creator", "administrator"].includes(inviterMember.status);
    } catch (err) {
      console.error("[Anti-Bot Admin Verification Error]:", err);
    }

    // If an admin added the bot, allow it
    if (isAdmin) {
      return await next();
    }

    // If a regular non-admin added the rogue bot, ban it immediately!
    try {
      await ctx.api.banChatMember(chatId, addedMember.id);

      const alertMsg = await ctx.reply(
        `🤖 <b>Anti-Bot Action Triggered</b>\n` +
        `Rogue bot <b>@${addedMember.username || addedMember.first_name}</b> added by ${inviter.first_name} was automatically removed.\n\n` +
        `<b>Action:</b> Bot Banned 🛡️`,
        { parse_mode: "HTML" }
      );

      // Auto-delete alert after 9 seconds to keep chat tidy
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(chatId, alertMsg.message_id);
        } catch {}
      }, 9000);
    } catch (err) {
      console.error(`[Anti-Bot Ban Error for bot ${addedMember.id}]:`, err);
    }

    await next();
  } catch (error) {
    console.error("[AntiBot Middleware Error]:", error);
    await next();
  }
});
