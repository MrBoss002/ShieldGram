import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const commandCleanerHandler = new Composer();

commandCleanerHandler.on("message:text", async (ctx, next) => {
  try {
    if (ctx.chat.type === "private") return next();

    const text = ctx.message.text.trim();

    // Check if message begins with standard command prefixes
    const isCommand = /^[/\.!?,$~$]\w+/.test(text);

    if (isCommand) {
      const config = await GroupConfig.findOne({ groupId: ctx.chat.id });

      if (config?.features?.cleanCmd?.enabled) {
        setTimeout(async () => {
          try {
            await ctx.deleteMessage();
          } catch (err) {
            // Silently ignore if bot lacks 'Delete Messages' permission
          }
        }, 1000);
      }
    }
  } catch (error) {
    console.error("[CommandCleaner Error]:", error);
  }

  // Pass execution down to the command handlers below
  return next();
});
