import { Composer } from "grammy";

export const setGppHandler = new Composer();

setGppHandler.command("setgpp", async (ctx) => {
  try {
    // 1. Check if the bot is used in a group or supergroup
    if (ctx.chat.type === "private") {
      return ctx.reply("❌ This command can only be used inside a group chat!");
    }

    // 2. Check if the user replied to an image/photo
    const repliedMessage = ctx.message?.reply_to_message;
    const photo = repliedMessage?.photo;

    if (!photo || photo.length === 0) {
      return ctx.reply("❌ Please reply to an image with the `/setgpp` command to update the group profile picture.");
    }

    // 3. Get the highest quality photo file ID (last item in the array)
    const fileId = photo[photo.length - 1].file_id;

    // 4. Retrieve the file path from Telegram servers
    const file = await ctx.api.getFile(fileId);
    const filePath = file.file_path;
    
    if (!filePath) {
      return ctx.reply("❌ Failed to retrieve image file from Telegram.");
    }

    const fileUrl = `https://api.telegram.org/file/bot${ctx.token}/${filePath}`;

    // 5. Update the group profile photo
    await ctx.api.setChatPhoto(ctx.chat.id, {
      source: fileUrl,
    });

    await ctx.reply("✅ Group profile picture has been updated successfully!");
  } catch (error: any) {
    console.error("[SetGPP Error]:", error);
    ctx.reply(`❌ Failed to update group profile picture: ${error.message}`);
  }
});
