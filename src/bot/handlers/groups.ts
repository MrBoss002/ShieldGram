import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const groupsCommandHandler = new Composer();

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Gatekeeper: Strictly locks this command to your OWNER_ID
const isOwner = groupsCommandHandler.filter((ctx) => {
  const ownerId = Number(process.env.OWNER_ID);
  return Boolean(ownerId && ctx.from?.id === ownerId);
});

isOwner.command("groups", async (ctx) => {
  try {
    const groups = await GroupConfig.find({}).sort({ updatedAt: -1 }).lean();

    if (!groups || groups.length === 0) {
      return await ctx.reply("📂 No groups found in the database.");
    }

    const statusMsg = await ctx.reply(
      `⏳ Fetching live data for <b>${groups.length}</b> groups...`,
      { parse_mode: "HTML" }
    );

    const chunks: string[] = [];
    let currentMessage = `📊 <b>Live Groups Deployment Report</b> (Total: ${groups.length})\n\n`;

    for (const [index, g] of groups.entries()) {
      const chatId = g.groupId;
      let groupName = "Private Group";
      let memberCount = "Unknown";
      let inviteLink = "No Link (Need Invite Permission)";

      try {
        const chat = await ctx.api.getChat(chatId);
        const count = await ctx.api.getChatMemberCount(chatId);

        if ("title" in chat && chat.title) {
          groupName = escapeHtml(chat.title);
        }
        memberCount = count.toString();

        if ("username" in chat && chat.username) {
          inviteLink = `<a href="https://t.me/${chat.username}">t.me/${chat.username}</a>`;
        } else if (chat.invite_link) {
          inviteLink = `<a href="${chat.invite_link}">Group Link</a>`;
        } else {
          // Generate a fresh invite link if the bot has 'Invite Users via Link' permission
          try {
            const exportedLink = await ctx.api.exportChatInviteLink(chatId);
            inviteLink = `<a href="${exportedLink}">Generated Link</a>`;
          } catch {
            // Bot lacks 'can_invite_users' permission in this chat
          }
        }
      } catch {
        groupName = "<i>Unavailable (Bot removed or restricted)</i>";
      }

      const entry =
        `${index + 1}. <b>${groupName}</b>\n` +
        `   • ID: <code>${chatId}</code>\n` +
        `   • Members: <b>${memberCount}</b>\n` +
        `   • Link: ${inviteLink}\n\n`;

      // Split into a new message before hitting Telegram's 4096-character limit
      if (currentMessage.length + entry.length > 3800) {
        chunks.push(currentMessage);
        currentMessage = entry;
      } else {
        currentMessage += entry;
      }
    }

    if (currentMessage.trim().length > 0) {
      chunks.push(currentMessage);
    }

    // Remove the "Fetching..." placeholder message
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

    for (const chunk of chunks) {
      await ctx.reply(chunk, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (error) {
    console.error("[Groups Command Error]:", error);
    await ctx.reply("❌ Failed to fetch live group telemetry.");
  }
});

isOwner.command("leave", async (ctx) => {
  const rawArg = (typeof ctx.match === "string" ? ctx.match : "").trim();
  const targetChatId = Number(rawArg);

  if (!rawArg || isNaN(targetChatId)) {
    return await ctx.reply(
      "⚠️ Provide a valid Group ID.\nExample: <code>/leave -1001234567890</code>",
      { parse_mode: "HTML" }
    );
  }

  let leftTelegram = false;

  try {
    const addKeyboard = new InlineKeyboard().url(
      "➕ Add ShieldGram to Group",
      `https://t.me/${ctx.me.username}?startgroup=true&admin=delete_messages+restrict_members+invite_users+pin_messages+manage_chat`
    );

    const goodbyeText =
      "🛡️ <b>ShieldGram Signing Off!</b>\n\n" +
      "It looks like this group is inactive or I haven't been granted admin permissions to protect it yet — " +
      "so my owner decided it's time for me to head out.. Goodbye everyone! ♥️\n\n" +
      "If you'd like to add me back later, tap the button below and make sure to grant me full admin rights! ⚙";

    await ctx.api.sendMessage(targetChatId, goodbyeText, {
      parse_mode: "HTML",
      reply_markup: addKeyboard,
    });

    await ctx.api.leaveChat(targetChatId);
    leftTelegram = true;
  } catch (error) {
    console.error(`[Leave Error for ${targetChatId}]:`, error);
  }

  // Safely delete ONLY this specific group's document from MongoDB
  const deleted = await GroupConfig.deleteOne({ groupId: targetChatId });

  if (leftTelegram || deleted.deletedCount > 0) {
    await ctx.reply(
      `🚪 Left group <code>${targetChatId}</code> and removed its record from the database.`,
      { parse_mode: "HTML" }
    );
  } else {
    await ctx.reply(
      `❌ Could not find group <code>${targetChatId}</code> in Telegram or the database.`,
      { parse_mode: "HTML" }
    );
  }
});
