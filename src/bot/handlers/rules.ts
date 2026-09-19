import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const rulesHandler = new Composer();

rulesHandler.command("rules", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return ctx.reply("❌ The `/rules` command can only be used inside groups.");
  }

  const groupId = ctx.chat.id;
  const userId = ctx.from!.id;
  const firstName = ctx.from!.first_name || "User";

  try {
    const config = await GroupConfig.findOne({ groupId });

    if (!config || !config.features.rules.enabled) {
      return ctx.reply("⚠️ Rules command is currently disabled for this group.");
    }

    const rulesText = config.features.rules.text || "No rules configured yet.";

    // Delete command message to maintain clean chat
    await ctx.deleteMessage().catch(() => {});

    // Try sending rules in private message
    try {
      await ctx.api.sendMessage(
        userId,
        `📜 **Group Rules for ${ctx.chat.title}**\n\n${rulesText}`,
        { parse_mode: "Markdown" }
      );

      // Notify in group that rules were sent to PM
      const notifyMsg = await ctx.reply(
        `📜 [${firstName}](tg://user?id=${userId}), I've sent you the group rules in PM!`,
        { parse_mode: "Markdown" }
      );

      // Auto-delete group notification after 10s
      setTimeout(() => {
        ctx.api.deleteMessage(groupId, notifyMsg.message_id).catch(() => {});
      }, 10000);

    } catch (pmError) {
      // Fallback if user blocked the bot or hasn't started it in PM yet
      const pmKeyboard = new InlineKeyboard().url(
        "📩 Tap here to start bot & view rules",
        `https://t.me/${ctx.me.username}?start=rules_${groupId}`
      );

      const fallbackMsg = await ctx.reply(
        `📜 [${firstName}](tg://user?id=${userId}), please tap the button below to view the group rules in PM!`,
        {
          parse_mode: "Markdown",
          reply_markup: pmKeyboard,
        }
      );

      // Auto-delete fallback message after 15s
      setTimeout(() => {
        ctx.api.deleteMessage(groupId, fallbackMsg.message_id).catch(() => {});
      }, 15000);
    }
  } catch (error) {
    console.error("[Rules Handler Error]:", error);
  }
});
