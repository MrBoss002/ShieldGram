import { Composer, Context } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { Warn } from "../../models/warn";

export const moderationHandler = new Composer();

// Helper to check if user is an admin or creator
async function isGroupAdmin(ctx: any): Promise<boolean> {
  if (!ctx.from) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

// Helper to check if a specific user ID is an admin
async function checkIsAdminById(ctx: Context, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

// Helper to auto-delete bot action messages after 5 minutes
const scheduleAutoDelete = (ctx: Context, chatId: number, messageId: number) => {
  setTimeout(async () => {
    try {
      await ctx.api.deleteMessage(chatId, messageId);
    } catch {
      // Ignore errors if message was already manually deleted
    }
  }, 5 * 60 * 1000); // 5 minutes in ms
};

// Helper to issue automated warnings from security middleware
async function issueAutoWarn(
  ctx: Context,
  groupId: number,
  user: { id: number; first_name: string },
  reason: string
) {
  try {
    let warnRecord = await Warn.findOne({ groupId, userId: user.id });
    if (!warnRecord) {
      warnRecord = new Warn({ groupId, userId: user.id, warnCount: 0, reasons: [] });
    }

    warnRecord.warnCount += 1;
    warnRecord.reasons.push(reason);

    const userMention = `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;

    if (warnRecord.warnCount >= 3) {
      // Mute the user automatically on 3rd warning
      await ctx.api.restrictChatMember(groupId, user.id, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      });

      warnRecord.warnCount = 0;
      warnRecord.reasons = [];
      await warnRecord.save();

      const sentMsg = await ctx.reply(
        `🚨 <b>3/3 Warnings Reached!</b>\n\n` +
        `• <b>User:</b> ${userMention}\n` +
        `• <b>Action:</b> Muted Automatically 🤐\n` +
        `• <b>Reason for Final Warn:</b> ${reason}`,
        { parse_mode: "HTML" }
      );
      scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
    } else {
      await warnRecord.save();

      const sentMsg = await ctx.reply(
        `⚠️ ${userMention}, your message was deleted because ${reason}.\n\n` +
        `<b>Warning ${warnRecord.warnCount}/3</b>`,
        { parse_mode: "HTML" }
      );
      scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
    }
  } catch (err) {
    console.error("[Auto-Warn Error]:", err);
  }
}

// Helper to parse target user and reason from Reply or Command Arguments
async function parseTargetAndReason(ctx: Context): Promise<{
  targetUser?: { id: number; first_name: string; username?: string };
  reason: string;
}> {
  let reason = "";
  let targetUser: { id: number; first_name: string; username?: string } | undefined;

  // Case 1: Command sent as a Reply to a user's message
  if (ctx.message?.reply_to_message?.from) {
    targetUser = ctx.message.reply_to_message.from;
    reason = ctx.match ? (ctx.match as string).trim() : "";
  } 
  // Case 2: Command sent with arguments
  else if (ctx.match) {
    const args = (ctx.match as string).trim().split(/\s+/);
    const firstArg = args[0];
    reason = args.slice(1).join(" ");

    if (firstArg) {
      if (/^\d+$/.test(firstArg)) {
        const userId = parseInt(firstArg, 10);
        try {
          const chatMember = await ctx.api.getChatMember(ctx.chat!.id, userId);
          targetUser = chatMember.user;
        } catch {
          targetUser = { id: userId, first_name: `User (${userId})` };
        }
      } else if (firstArg.startsWith("@")) {
        const usernameWithoutAt = firstArg.replace("@", "");
        targetUser = { id: 0, first_name: firstArg, username: usernameWithoutAt };
      }
    }
  }

  return { targetUser, reason: reason || "No reason provided" };
}

// =============================================================
// 1. ADMINISTRATIVE MODERATION COMMANDS
// =============================================================

// --- COMMAND: /warn ---
moderationHandler.command("warn", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser, reason } = await parseTargetAndReason(ctx);
  if (!targetUser) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a User ID/Username to warn.\nExample: <code>/warn 123456789 spamming</code>", { parse_mode: "HTML" });
  }

  if (targetUser.id === adminId) {
    return ctx.reply("❌ You cannot warn yourself!");
  }

  if (targetUser.id !== 0 && (await checkIsAdminById(ctx, ctx.chat.id, targetUser.id))) {
    return ctx.reply("❌ You cannot warn another Administrator.");
  }

  const groupId = ctx.chat.id;

  try {
    let warnRecord = await Warn.findOne({ groupId, userId: targetUser.id });
    if (!warnRecord) {
      warnRecord = new Warn({ groupId, userId: targetUser.id, warnCount: 0, reasons: [] });
    }

    warnRecord.warnCount += 1;
    warnRecord.reasons.push(reason);

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    if (warnRecord.warnCount >= 3) {
      await ctx.api.restrictChatMember(groupId, targetUser.id, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      });

      warnRecord.warnCount = 0;
      warnRecord.reasons = [];
      await warnRecord.save();

      const sentMsg = await ctx.reply(
        `🚨 <b>3/3 Warnings Reached!</b>\n\n` +
        `• <b>User:</b> ${userMention}\n` +
        `• <b>Action:</b> Muted Automatically 🤐\n` +
        `• <b>Reason for Final Warn:</b> ${reason}`,
        { parse_mode: "HTML" }
      );
      scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
    } else {
      await warnRecord.save();

      const sentMsg = await ctx.reply(
        `⚠️ <b>User Warned</b> [${warnRecord.warnCount}/3]\n\n` +
        `• <b>User:</b> ${userMention}\n` +
        `• <b>Admin:</b> ${adminMention}\n` +
        `• <b>Reason:</b> ${reason}`,
        { parse_mode: "HTML" }
      );
      scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
    }
  } catch (err) {
    console.error("[Warn Error]:", err);
    ctx.reply("❌ Failed to process warning. Ensure the bot has admin rights.");
  }
});

// --- COMMAND: /unwarn ---
moderationHandler.command("unwarn", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser } = await parseTargetAndReason(ctx);
  if (!targetUser) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a User ID to unwarn.");
  }

  const groupId = ctx.chat.id;

  try {
    const warnRecord = await Warn.findOne({ groupId, userId: targetUser.id });
    if (!warnRecord || warnRecord.warnCount === 0) {
      return ctx.reply("ℹ️ User has no active warnings.");
    }

    warnRecord.warnCount = Math.max(0, warnRecord.warnCount - 1);
    if (warnRecord.reasons.length > 0) warnRecord.reasons.pop();
    await warnRecord.save();

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `✅ <b>Warning Removed</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}\n` +
      `• <b>Current Warnings:</b> ${warnRecord.warnCount}/3`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Unwarn Error]:", err);
    ctx.reply("❌ Failed to remove warning.");
  }
});

// --- COMMAND: /mute ---
moderationHandler.command("mute", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser, reason } = await parseTargetAndReason(ctx);
  if (!targetUser || targetUser.id === 0) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a valid User ID to mute.");
  }

  if (targetUser.id === adminId) {
    return ctx.reply("❌ You cannot mute yourself!");
  }

  if (await checkIsAdminById(ctx, ctx.chat.id, targetUser.id)) {
    return ctx.reply("❌ You cannot mute another Administrator.");
  }

  const groupId = ctx.chat.id;

  try {
    await ctx.api.restrictChatMember(groupId, targetUser.id, {
      can_send_messages: false,
      can_send_audios: false,
      can_send_documents: false,
      can_send_photos: false,
      can_send_videos: false,
      can_send_video_notes: false,
      can_send_voice_notes: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
    });

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `🤐 <b>User Muted</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}\n` +
      `• <b>Reason:</b> ${reason}`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Mute Error]:", err);
    ctx.reply("❌ Failed to mute user. Ensure I have Admin rights with 'Restrict Users' permissions.");
  }
});

// --- COMMAND: /unmute ---
moderationHandler.command("unmute", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser } = await parseTargetAndReason(ctx);
  if (!targetUser || targetUser.id === 0) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a valid User ID to unmute.");
  }

  const groupId = ctx.chat.id;

  try {
    await ctx.api.restrictChatMember(groupId, targetUser.id, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `🔊 <b>User Unmuted</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Unmute Error]:", err);
    ctx.reply("❌ Failed to unmute user.");
  }
});

// --- COMMAND: /kick ---
moderationHandler.command("kick", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser, reason } = await parseTargetAndReason(ctx);
  if (!targetUser || targetUser.id === 0) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a valid User ID to kick.");
  }

  if (targetUser.id === adminId) {
    return ctx.reply("❌ You cannot kick yourself!");
  }

  if (await checkIsAdminById(ctx, ctx.chat.id, targetUser.id)) {
    return ctx.reply("❌ You cannot kick another Administrator.");
  }

  const groupId = ctx.chat.id;

  try {
    await ctx.api.banChatMember(groupId, targetUser.id);
    await ctx.api.unbanChatMember(groupId, targetUser.id, { only_if_banned: true });

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `👢 <b>User Kicked</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}\n` +
      `• <b>Reason:</b> ${reason}`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Kick Error]:", err);
    ctx.reply("❌ Failed to kick user. Ensure I have Admin rights with 'Ban Users' permissions.");
  }
});

// --- COMMAND: /ban ---
moderationHandler.command("ban", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser, reason } = await parseTargetAndReason(ctx);
  if (!targetUser || targetUser.id === 0) {
    return ctx.reply("⚠️ Please reply to a user's message or provide a valid User ID to ban.");
  }

  if (targetUser.id === adminId) {
    return ctx.reply("❌ You cannot ban yourself!");
  }

  if (await checkIsAdminById(ctx, ctx.chat.id, targetUser.id)) {
    return ctx.reply("❌ You cannot ban another Administrator.");
  }

  const groupId = ctx.chat.id;

  try {
    await ctx.api.banChatMember(groupId, targetUser.id);

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `🚫 <b>User Banned</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}\n` +
      `• <b>Reason:</b> ${reason}`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Ban Error]:", err);
    ctx.reply("❌ Failed to ban user. Ensure I have Admin rights with 'Ban Users' permissions.");
  }
});

// --- COMMAND: /unban ---
moderationHandler.command("unban", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const adminId = ctx.from!.id;
  if (!(await checkIsAdminById(ctx, ctx.chat.id, adminId))) {
    return ctx.reply("⚠️ You must be an Admin to use this command.");
  }

  const { targetUser } = await parseTargetAndReason(ctx);
  if (!targetUser || targetUser.id === 0) {
    return ctx.reply("⚠️ Please provide a valid User ID to unban.\nExample: <code>/unban 123456789</code>", { parse_mode: "HTML" });
  }

  const groupId = ctx.chat.id;

  try {
    await ctx.api.unbanChatMember(groupId, targetUser.id, { only_if_banned: true });

    const userMention = `<a href="tg://user?id=${targetUser.id}">${targetUser.first_name}</a>`;
    const adminMention = `<a href="tg://user?id=${adminId}">${ctx.from!.first_name}</a>`;

    const sentMsg = await ctx.reply(
      `🔓 <b>User Unbanned</b>\n\n` +
      `• <b>User:</b> ${userMention}\n` +
      `• <b>Admin:</b> ${adminMention}`,
      { parse_mode: "HTML" }
    );
    scheduleAutoDelete(ctx, groupId, sentMsg.message_id);
  } catch (err) {
    console.error("[Unban Error]:", err);
    ctx.reply("❌ Failed to unban user.");
  }
});

// =============================================================
// 2. AUTOMATIC SECURITY FILTERS WITH AUTO-WARNINGS
// =============================================================

moderationHandler.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return next();
  }

  const config = await GroupConfig.findOne({ groupId: ctx.chat.id });
  if (!config) return next();

  const { features } = config;

  const isAdmin = await isGroupAdmin(ctx);
  if (isAdmin) return next();

  const user = ctx.from;
  if (!user) return next();

  const messageText = ctx.message.text || ctx.message.caption || "";
  const lowerMessageText = messageText.toLowerCase();

  const entities = ctx.message.entities || ctx.message.caption_entities || [];
  const hasLinkEntity = entities.some((e) => ["url", "text_link"].includes(e.type));

  // 1. WORD BLACKLIST ENFORCEMENT
  if (features.wordBlacklist?.enabled && features.wordBlacklist.words?.length > 0) {
    const blacklistedWords = features.wordBlacklist.words;
    
    // Check if the message contains any blacklisted word/phrase
    const matchedWord = blacklistedWords.find((word) => {
      const regex = new RegExp(`\\b${word.toLowerCase().replace(/[\-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return regex.test(lowerMessageText) || lowerMessageText.includes(word.toLowerCase());
    });

    if (matchedWord) {
      try {
        await ctx.deleteMessage();
        await issueAutoWarn(ctx, ctx.chat.id, user, `your message contained a prohibited word`);
        return;
      } catch (err) {
        console.error(`[Moderation] Failed to delete blacklisted word message in ${ctx.chat.id}:`, err);
      }
    }
  }

  // 2. ANTI-BIO LINK ENFORCEMENT
  if (features.antiBioLink?.enabled) {
    try {
      const fullUser = await ctx.api.getChat(user.id);
      const bio = fullUser.bio || "";

      const hasBioLink = /https?:\/\/|t\.me\/|telegram\.me\/|@[\w_]+/i.test(bio);

      if (hasBioLink) {
        await ctx.deleteMessage();
        await issueAutoWarn(ctx, ctx.chat.id, user, "your bio contains a link");
        return;
      }
    } catch (err) {
      console.error(`[Moderation] Anti-Bio Link check failed in ${ctx.chat.id}:`, err);
    }
  }

  // 3. ANTI-FORWARD ENFORCEMENT
  if (features.antiForward?.enabled && ctx.message.forward_origin) {
    if (ctx.message.is_automatic_forward) {
      return next();
    }

    try {
      await ctx.deleteMessage();
      await issueAutoWarn(ctx, ctx.chat.id, user, "forwarded messages are restricted");
      return;
    } catch (err) {
      console.error(`[Moderation] Failed to delete forwarded message in ${ctx.chat.id}:`, err);
    }
  }

  // 4. ANTI-LINK ENFORCEMENT (Deletes ALL Links)
  if (features.antiLink?.enabled && hasLinkEntity) {
    try {
      await ctx.deleteMessage();
      await issueAutoWarn(ctx, ctx.chat.id, user, "sending links is restricted");
      return;
    } catch (err) {
      console.error(`[Moderation] Failed to delete link in ${ctx.chat.id}:`, err);
    }
  }

  // 5. ANTI-WEBLINK ENFORCEMENT (Deletes Non-Telegram External Links)
  if (features.antiWeblink?.enabled && hasLinkEntity) {
    const hasExternalLink = entities.some((entity) => {
      if (entity.type === "url") {
        const urlText = messageText.substring(entity.offset, entity.offset + entity.length);
        return !/t\.me|telegram\.me/i.test(urlText);
      }
      if (entity.type === "text_link" && entity.url) {
        return !/t\.me|telegram\.me/i.test(entity.url);
      }
      return false;
    });

    if (hasExternalLink) {
      try {
        await ctx.deleteMessage();
        await issueAutoWarn(ctx, ctx.chat.id, user, "external web links are restricted");
        return;
      } catch (err) {
        console.error(`[Moderation] Failed to delete web link in ${ctx.chat.id}:`, err);
      }
    }
  }

  return next();
});
