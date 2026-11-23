import { Composer, InlineKeyboard } from "grammy";
import { GlobalBan } from "../../models/GlobalBan";
import { GroupConfig } from "../../models/GroupConfig";

export const gbanHandler = new Composer();

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const appealKeyboard = new InlineKeyboard().url(
  "⚖️ Appeal / Support Chat",
  "https://t.me/MrBossSupport"
);

function extractTargetAndReason(ctx: any): {
  targetUserId: number | null;
  reason: string;
} {
  const rawArgs = (typeof ctx.match === "string" ? ctx.match : "").trim();
  const replyUser = ctx.message?.reply_to_message?.from;

  if (replyUser && !replyUser.is_bot) {
    return {
      targetUserId: replyUser.id,
      reason: rawArgs || "Violation of ShieldGram Global Security Rules",
    };
  }

  const parts = rawArgs.split(/\s+/);
  const parsedId = Number(parts[0]);

  if (parts[0] && !isNaN(parsedId)) {
    const reasonText = parts.slice(1).join(" ").trim();
    return {
      targetUserId: parsedId,
      reason: reasonText || "Violation of ShieldGram Global Security Rules",
    };
  }

  return { targetUserId: null, reason: "" };
}

const isOwner = gbanHandler.filter((ctx) => {
  const ownerId = Number(process.env.OWNER_ID);
  return Boolean(ownerId && ctx.from?.id === ownerId);
});

// 1. /gban Command
isOwner.command("gban", async (ctx) => {
  const { targetUserId, reason } = extractTargetAndReason(ctx);
  const ownerId = Number(process.env.OWNER_ID);

  if (!targetUserId) {
    return await ctx.reply(
      "⚠️ Reply to a user's message or provide a valid User ID.\nExample: <code>/gban 123456789 Scammer</code>",
      { parse_mode: "HTML" }
    );
  }

  if (targetUserId === ownerId || targetUserId === ctx.me.id) {
    return await ctx.reply("❌ You cannot globally ban yourself or the bot.");
  }

  try {
    await GlobalBan.findOneAndUpdate(
      { userId: targetUserId },
      { userId: targetUserId, reason, bannedAt: new Date() },
      { upsert: true, new: true }
    );

    const groups = await GroupConfig.find({}).lean();
    const statusMsg = await ctx.reply(
      `🛡️ Executing Global Ban on <code>${targetUserId}</code> across <b>${groups.length}</b> groups...`,
      { parse_mode: "HTML" }
    );

    let successCount = 0;
    const safeReason = escapeHtml(reason);

    const alertCard =
      "🚨 <b>ShieldGram Global Ban Alert</b>\n\n" +
      `👤 <b>User ID:</b> <code>${targetUserId}</code>\n` +
      `📝 <b>Reason:</b> ${safeReason}\n` +
      `⚡ <b>Action:</b> Permanently Banned Across Network\n\n` +
      "<i>Believe this was a mistake? Tap below to appeal.</i>";

    for (const g of groups) {
      try {
        await ctx.api.banChatMember(g.groupId, targetUserId);
        successCount++;

        await ctx.api
          .sendMessage(g.groupId, alertCard, {
            parse_mode: "HTML",
            reply_markup: appealKeyboard,
          })
          .catch(() => {});

        await sleep(60);
      } catch {
        // Skip groups where bot lacks admin rights
      }
    }

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

    await ctx.reply(
      `✅ <b>Global Ban Completed</b>\n\n` +
        `• <b>User ID:</b> <code>${targetUserId}</code>\n` +
        `• <b>Reason:</b> ${safeReason}\n` +
        `• <b>Enforced in:</b> ${successCount} / ${groups.length} groups`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("[GBan Error]:", error);
    await ctx.reply("❌ Failed to execute Global Ban.");
  }
});

// 2. /ungban Command
isOwner.command("ungban", async (ctx) => {
  const { targetUserId } = extractTargetAndReason(ctx);

  if (!targetUserId) {
    return await ctx.reply(
      "⚠️ Reply to a user's message or provide a valid User ID.\nExample: <code>/ungban 123456789</code>",
      { parse_mode: "HTML" }
    );
  }

  try {
    const deleted = await GlobalBan.deleteOne({ userId: targetUserId });
    const groups = await GroupConfig.find({}).lean();

    let unbannedCount = 0;
    for (const g of groups) {
      try {
        await ctx.api.unbanChatMember(g.groupId, targetUserId, {
          only_if_banned: true,
        });
        unbannedCount++;
        await sleep(60);
      } catch {
        // Ignore groups where bot lacks unban rights
      }
    }

    if (deleted.deletedCount > 0 || unbannedCount > 0) {
      await ctx.reply(
        `🕊️ <b>Global Ban Lifted</b>\n\n` +
          `• <b>User ID:</b> <code>${targetUserId}</code>\n` +
          `• <b>Unbanned in:</b> ${unbannedCount} / ${groups.length} groups`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        `ℹ️ User <code>${targetUserId}</code> was not found in the Global Ban list.`,
        { parse_mode: "HTML" }
      );
    }
  } catch (error) {
    console.error("[UnGBan Error]:", error);
    await ctx.reply("❌ Failed to lift Global Ban.");
  }
});

// 3. Auto-Shield Middleware
gbanHandler.on(["message", "chat_member"], async (ctx, next) => {
  if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
    return await next();
  }

  const userToCheck = ctx.chatMember?.new_chat_member?.user || ctx.from;

  if (!userToCheck || userToCheck.is_bot) {
    return await next();
  }

  // Typecast as any to satisfy TypeScript compilation cleanly
  const banRecord = (await GlobalBan.findOne({
    userId: userToCheck.id,
  }).lean()) as any;

  if (banRecord) {
    try {
      await ctx.api.banChatMember(ctx.chat.id, userToCheck.id);

      const alertCard =
        "🚨 <b>ShieldGram Global Ban Alert</b>\n\n" +
        `👤 <b>User ID:</b> <code>${userToCheck.id}</code>\n` +
        `📝 <b>Reason:</b> ${escapeHtml(banRecord.reason || "Global Security Violation")}\n` +
        `⚡ <b>Action:</b> Auto-Banned on Sight\n\n` +
        "<i>Believe this was a mistake? Tap below to appeal.</i>";

      await ctx.reply(alertCard, {
        parse_mode: "HTML",
        reply_markup: appealKeyboard,
      });
    } catch {
      // Bot lacks admin ban rights in this group
    }
    return;
  }

  await next();
});
