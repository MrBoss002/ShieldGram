import { Composer } from "grammy";

export const infoHandler = new Composer();

// --- 0. Universal /info Help Manual ---
infoHandler.command("info", async (ctx) => {
  try {
    const helpText = 
      `🔍 <b>SHIELDGRAM INFO SUITE MANUAL</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Welcome to the universal lookup suite! Choose a sub-command below:\n\n` +
      `👤 <b>/infou</b> [User ID / @username / Reply]\n` +
      `   • <i>Fetches user profile details, ID, and premium status.</i>\n` +
      `   • <i>In groups:</i> Reply to any user's message.\n` +
      `   • <i>In PM:</i> Forward a message from a user and reply with <code>/infou</code>.\n\n` +
      `🏷️ <b>/infog</b> [Group ID / @group / Reply to Forward]\n` +
      `   • <i>Fetches group title, member count, admin count, and description.</i>\n\n` +
      `📢 <b>/infoc</b> [Channel ID / @channel / Reply to Forward]\n` +
      `   • <i>Fetches channel title, subscriber count, and description.</i>\n\n` +
      `💡 <b>Pro-Tip & Anti-Forwarding Warning:</b>\n` +
      `If a group has <b>Protect Content (anti-forwarding)</b> enabled, forwarding messages out of it might be blocked or trigger restrictions.\n` +
      `*We recommend using our chat in **Private Messages (PM)** to safely forward messages and look up details without hitting group blocks!*` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <i>ShieldGram Security Suite</i>`;

    await ctx.reply(helpText, { parse_mode: "HTML" });
  } catch (error) {
    console.error("[Info Help Error]:", error);
  }
});


// --- 1. /infou (User Information - Enhanced for PM Forwards & Group Replies) ---
infoHandler.command("infou", async (ctx) => {
  try {
    if (!ctx.chat || !ctx.message) return;

    let targetUserId: number | undefined;

    const replyMsg = ctx.message.reply_to_message as any;
    if (replyMsg) {
      // Check modern forward_origin for user sender
      if (replyMsg.forward_origin) {
        if (replyMsg.forward_origin.type === "user") {
          targetUserId = replyMsg.forward_origin.sender_user?.id;
        } else if (replyMsg.forward_origin.type === "hidden_user") {
          return ctx.reply("⚠️ <b>Cannot fetch user info:</b> This user has hidden their profile name/forward privacy settings.", { parse_mode: "HTML" });
        }
      } 
      // Fallback legacy checks for forwards and direct message authors
      if (!targetUserId && replyMsg.forward_from) {
        targetUserId = replyMsg.forward_from.id;
      } else if (!targetUserId && replyMsg.from) {
        targetUserId = replyMsg.from.id;
      }
    }

    // Check direct command arguments (e.g. /infou 123456789 or @username)
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

    // Fallback behavior:
    // If used in a group with no arguments/reply, target the command sender.
    // If used in PM with no arguments/reply, prompt the user.
    if (!targetUserId) {
      if (ctx.chat.type !== "private" && !replyMsg) {
        targetUserId = ctx.from!.id;
      } else {
        return ctx.reply("⚠️ Please provide a User ID, username, or reply to a forwarded user message.", { parse_mode: "HTML" });
      }
    }

    let targetUser: any;
    try {
      targetUser = await ctx.api.getChat(targetUserId);
    } catch {
      return ctx.reply("❌ <b>User not found!</b> Make sure the ID is valid and the user has interacted with the bot.", { parse_mode: "HTML" });
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

    const replyMsg = ctx.message.reply_to_message as any;
    if (replyMsg) {
      if (replyMsg.forward_origin && ["group", "supergroup"].includes(replyMsg.forward_origin.type)) {
        targetChatId = replyMsg.forward_origin.chat?.id;
      } else if (replyMsg.forward_from_chat && ["group", "supergroup"].includes(replyMsg.forward_from_chat.type)) {
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

    const replyMsg = ctx.message.reply_to_message as any;
    if (replyMsg) {
      if (replyMsg.forward_origin && replyMsg.forward_origin.type === "channel") {
        targetChatId = replyMsg.forward_origin.chat?.id;
      } else if (replyMsg.forward_from_chat && replyMsg.forward_from_chat.type === "channel") {
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
