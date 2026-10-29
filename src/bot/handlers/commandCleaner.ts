import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const commandCleanerHandler = new Composer();

commandCleanerHandler.on("message:text", async (ctx, next) => {
  try {
    // Only process in group or supergroup chats
    if (ctx.chat.type === "private") return next();

    const text = ctx.message.text;

    // Check if the message starts with command prefixes (e.g., /, !, ?, .)
    const isCommand = /^[/\.!?,$~$].*/.test(text);

    if (isCommand) {
      // Check group database settings
      const config = await GroupConfig.findOne({ groupId: ctx.chat.id });

      if (config?.features?.cleanCmd?.enabled) {
        // Delete command message after 1 second
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

  // Continue to execute other bot plugins/commands normally
  return next();
});
