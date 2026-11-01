import { Composer } from "grammy";

export const infoHandler = new Composer();

// --- 1. /infou (User Information) ---
infoHandler.command("infou", async (ctx) => {
  try {
    if (!ctx.chat || !ctx.message) return;

    let targetUserId: number | undefined;

    const replyMsg = ctx.message.reply_to_message;
    if (replyMsg) {
      if (replyMsg.forward_from) {
        targetUserId = replyMsg.forward_from.id;
      } else if (replyMsg.from) {
        targetUserId = replyMsg.from.id;
      }
    }

    if (!targetUserId) {
      const args = ctx.message.text.split(" ").slice(1);
      if (args.length > 0) {
        const query = args[0].replace("@", "");
        if (!isNaN(Number(query))) {
          targetUserId = Number(query);
        } else {
          try {
            const chat = await ctx.api.getChat(`@${query}`);
            if (chat.type === "private") targetUserId = chat.id;
          } catch {}
        }
      }
    }

    if (!targetUserId) targetUserId = ctx.from!.id;

    let targetUser: any;
    try {
      targetUser = await ctx.api.getChat(targetUserId);
    } catch {
      return ctx.reply("❌ <b>User not found!</b> Make sure the ID or username is valid.", { parse_mode: "HTML" });
    }

    if (targetUser.type !== "private") {
      return ctx.reply("⚠️ The provided ID belongs to a group/channel. Use <code>/infog</code> or <code>/infoc</code>.", { parse_mode: "HTML" });
    }

    const firstName = targetUser.first_name || "Unknown";
    const lastName = targetUser.last_name ? ` ${targetUser.last_name}` : "";
    const username = targetUser.username ? `@${targetUser.username}` : "<i>None</i>";
    const bio = targetUser.bio || "<i>No bio available</i>";
    const isPremium = targetUser.is_premium ? "⭐ <b>Yes (Telegram Premium)</b>" : "Standard User";

    const caption = 
      `👤 <b>USER INFORMATION CARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Full Name:</b> ${firstName}${lastName}\n` +
      `• <b>User ID:</b> <code>${targetUser.id}</code>\n` +
      `• <b>Username:</b> ${username}\n` +
      `• <b>Account Type:</b> ${isPremium}\n` +
      `• <b>Bio:</b> ${bio}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <i>ShieldGram Security Suite</i>`;

    try {
      const photos = await ctx.api.getUserProfilePhotos(targetUser.id, { limit: 1 });
      if (photos.total_count > 0) {
        const photoFileId = photos.photos[0][photos.photos[0].length - 1].file_id;
        return await ctx.replyWithPhoto(photoFileId, { caption, parse_mode: "HTML" });
      }
    } catch {}

    await ctx.reply(caption, { parse_mode: "HTML" });
  } catch (error) {
    console.error("[InfoU Error]:", error);
    await ctx.reply("❌ Failed to fetch user info.");
  }
});


// --- 2. /infog (Group Information) ---
infoHandler.command("infog", async (ctx) => {
  try {
    if (!ctx.chat || !ctx.message) return;

    let targetChatId: number | string | undefined;

    const replyMsg = ctx.message.reply_to_message;
    if (replyMsg && replyMsg.forward_from_chat) {
      if (["group", "supergroup"].includes(replyMsg.forward_from_chat.type)) {
        targetChatId = replyMsg.forward_from_chat.id;
      }
    }

    if (!targetChatId) {
      const args = ctx.message.text.split(" ").slice(1);
      if (args.length > 0) {
        const query = args[0];
        targetChatId = !isNaN(Number(query)) || query.startsWith("-100") ? Number(query) : (query.startsWith("@") ? query : `@${query}`);
      }
    }

    if (!targetChatId) {
      if (ctx.chat.type !== "private") {
        targetChatId = ctx.chat.id;
      } else {
        return ctx.reply("⚠️ Provide a Group ID/Username or reply to a forwarded group message.", { parse_mode: "HTML" });
      }
    }

    let chatData: any, memberCount = 0, adminCount = 0;
    try {
      chatData = await ctx.api.getChat(targetChatId);
      if (!["group", "supergroup"].includes(chatData.type)) {
        return ctx.reply("❌ Target ID is not a group. Use <code>/infou</code> or <code>/infoc</code>.", { parse_mode: "HTML" });
      }
      memberCount = await ctx.api.getChatMemberCount(chatData.id);
      const admins = await ctx.api.getChatAdministrators(chatData.id);
      adminCount = admins.length;
    } catch {
      return ctx.reply("❌ <b>Could not fetch group info!</b> Check ID and bot permissions.", { parse_mode: "HTML" });
    }

    const title = chatData.title || "Unknown Group";
    const username = chatData.username ? `@${chatData.username}` : "<i>None</i>";
    const description = chatData.description || "<i>No description available</i>";

    const caption = 
      `🏷️ <b>GROUP INFORMATION CARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Group Title:</b> ${title}\n` +
      `• <b>Chat ID:</b> <code>${chatData.id}</code>\n` +
      `• <b>Username:</b> ${username}\n` +
      `• <b>Total Members:</b> ${memberCount}\n` +
      `• <b>Total Admins:</b> ${adminCount}\n` +
      `• <b>Description:</b> ${description}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <i>ShieldGram Security Suite</i>`;

    try {
      if (chatData.photo) {
        const photoFileId = chatData.photo.big_file_id || chatData.photo.small_file_id;
        return await ctx.api.sendPhoto(ctx.chat.id, photoFileId, { caption, parse_mode: "HTML" });
      }
    } catch {}

    await ctx.reply(caption, { parse_mode: "HTML" });
  } catch (error) {
    console.error("[InfoG Error]:", error);
    await ctx.reply("❌ Failed to fetch group info.");
  }
});


// --- 3. /infoc (Channel Information) ---
infoHandler.command("infoc", async (ctx) => {
  try {
    if (!ctx.chat || !ctx.message) return;

    let targetChatId: number | string | undefined;

    const replyMsg = ctx.message.reply_to_message;
    if (replyMsg && replyMsg.forward_from_chat) {
      if (replyMsg.forward_from_chat.type === "channel") {
        targetChatId = replyMsg.forward_from_chat.id;
      }
    }

    if (!targetChatId) {
      const args = ctx.message.text.split(" ").slice(1);
      if (args.length > 0) {
        const query = args[0];
        targetChatId = !isNaN(Number(query)) || query.startsWith("-100") ? Number(query) : (query.startsWith("@") ? query : `@${query}`);
      }
    }

    if (!targetChatId) {
      return ctx.reply("⚠️ Provide a Channel ID/Username or reply to a forwarded channel post.", { parse_mode: "HTML" });
    }

    let chatData: any, subCount = 0;
    try {
      chatData = await ctx.api.getChat(targetChatId);
      if (chatData.type !== "channel") {
        return ctx.reply("❌ Target ID is not a channel. Use <code>/infou</code> or <code>/infog</code>.", { parse_mode: "HTML" });
      }
      subCount = await ctx.api.getChatMemberCount(chatData.id);
    } catch {
      return ctx.reply("❌ <b>Could not fetch channel info!</b> Make sure the bot is an admin or member of the channel.", { parse_mode: "HTML" });
    }

    const title = chatData.title || "Unknown Channel";
    const username = chatData.username ? `@${chatData.username}` : "<i>None</i>";
    const description = chatData.description || "<i>No description available</i>";

    const caption = 
      `📢 <b>CHANNEL INFORMATION CARD</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Channel Title:</b> ${title}\n` +
      `• <b>Channel ID:</b> <code>${chatData.id}</code>\n` +
      `• <b>Username:</b> ${username}\n` +
      `• <b>Subscribers:</b> ${subCount}\n` +
      `• <b>Description:</b> ${description}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <i>ShieldGram Security Suite</i>`;

    try {
      if (chatData.photo) {
        const photoFileId = chatData.photo.big_file_id || chatData.photo.small_file_id;
        return await ctx.api.sendPhoto(ctx.chat.id, photoFileId, { caption, parse_mode: "HTML" });
      }
    } catch {}

    await ctx.reply(caption, { parse_mode: "HTML" });
  } catch (error) {
    console.error("[InfoC Error]:", error);
    await ctx.reply("❌ Failed to fetch channel info.");
  }
});
