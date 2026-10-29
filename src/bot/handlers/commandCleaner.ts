import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const commandCleanerHandler = new Composer();

commandCleanerHandler.on("message:text", async (ctx, next) => {
  try {
    if (ctx.chat.type === "private") return next();

    const text = ctx.message.text;

    // Enhanced Regex: Matches standard commands (/cmd), commands with bot mentions (/cmd@bot), 
    // and other command triggers like !, ?, ., etc. followed by text.
    const isCommand = /^[/\.!?,$~$][a-zA-Z0-9_]+(@[a-zA-Z0-9_]+)?(\s.*)?$/.test(text) || /^[/\.!?,$~$][a-zA-Z0-9_]+$/.test(text);

    if (isCommand) {
      const config = await GroupConfig.findOne({ groupId: ctx.chat.id });

      if (config?.features?.cleanCmd?.enabled) {
        setTimeout(async () => {
          try {
            await ctx.deleteMessage();
          } catch (err) {
            // Fails silently if bot lacks 'Delete Messages' admin permission
          }
        }, 1000);
      }
    }
  } catch (error) {
    console.error("[CommandCleaner Error]:", error);
  }

  return next();
});
