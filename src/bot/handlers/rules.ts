import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const rulesHandler = new Composer();

rulesHandler.command("rules", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return ctx.reply("❌ The `/rules` command can only be used inside groups.");
  }

  const groupId = ctx.chat.id;

  try {
    const config = await GroupConfig.findOne({ groupId });

    if (!config || !config.features.rules.enabled) {
      return ctx.reply("⚠️ Rules command is currently disabled for this group.");
    }

    const rulesText = config.features.rules.text || "No rules configured yet.";

    // Delete command message to maintain clean chat
    await ctx.deleteMessage().catch(() => {});

    // Send rules directly in PM to user to avoid group chat clutter
    await ctx.api
      .sendMessage(
        ctx.from!.id,
        `📜 **Group Rules for ${ctx.chat.title}**\n\n${rulesText}`,
        { parse_mode: "Markdown" }
      )
      .then(() => {
        // Optional quick notify alert in group
        ctx.reply(`📜 [${ctx.from!.first_name}](tg://user?id=${ctx.from!.id}), I've sent you the group rules in PM!`, {
          parse_mode: "Markdown",
        }).then((m) => {
          setTimeout(() => ctx.api.deleteMessage(groupId, m.message_id).catch(() => {}), 10000);
        });
      })
      .catch(() => {
        // Fallback in group if PM is blocked
        ctx.reply(`📜 **Group Rules:**\n\n${rulesText}`, { parse_mode: "Markdown" });
      });
  } catch (error) {
    console.error("[Rules Handler Error]:", error);
  }
});
