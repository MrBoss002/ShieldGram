import { Composer } from "grammy";

export const antiBotHandler = new Composer();

antiBotHandler.on("message:new_chat_members", async (ctx, next) => {
  try {
    if (!ctx.chat || ctx.chat.type === "private") {
      return await next();
    }

    const chatId = ctx.chat.id;
    const addedBy = ctx.from;
    const newMembers = ctx.message.new_chat_members;

    // Filter out all bots added in this event
    const addedBots = newMembers.filter((member) => member.is_bot);

    // If no bots were added, pass through
    if (addedBots.length === 0) {
      return await next();
    }

    // Check if the user who added the bot is an admin
    let isAdmin = false;
    try {
      const inviterMember = await ctx.api.getChatMember(chatId, addedBy.id);
      isAdmin = ["creator", "administrator"].includes(inviterMember.status);
    } catch (err) {
      console.error("[Anti-Bot Admin Check Error]:", err);
    }

    // If an admin added the bot, allow it
    if (isAdmin) {
      return await next();
    }

    // If a non-admin added the bot, ban each rogue bot
    for (const botUser of addedBots) {
      try {
        // Ban the rogue bot from the group
        await ctx.banChatMember(botUser.id);

        const alertMsg = await ctx.reply(
          `🤖 <b>Anti-Bot Action Triggered</b>\n` +
          `Rogue bot <b>@${botUser.username || botUser.first_name}</b> added by ${addedBy.first_name} was automatically removed.\n\n` +
          `<b>Action:</b> Bot Banned 🛡️`,
          { parse_mode: "HTML" }
        );

        // Auto-delete alert after 7 seconds to keep chat tidy
        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(chatId, alertMsg.message_id);
          } catch {}
        }, 7000);
      } catch (err) {
        console.error(`[Anti-Bot Ban Error for ${botUser.id}]:`, err);
      }
    }

  } catch (error) {
    console.error("[AntiBot Middleware Error]:", error);
    await next();
  }
});
