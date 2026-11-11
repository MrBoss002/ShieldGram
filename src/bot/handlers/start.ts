import { Composer, InlineKeyboard, Context } from "grammy";
import { env } from "../../config/env";
import { GroupConfig } from "../../models/GroupConfig";
import { User } from "../../models/User";
import { buildDashboardKeyboard } from "./admin";

export const startHandler = new Composer();

// Type-safe helper to check admin privileges
async function checkIsAdmin(ctx: Context, groupId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(groupId, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

startHandler.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const currentUserId = ctx.from?.id;
  const startPayload = ctx.match; // e.g. "ref_12345", "secret_xyz", or "config_123"

  // --- SILENT USER REGISTRATION & REFERRAL TRACKING ---
  if (ctx.from && currentUserId) {
    const existingUser = await User.findOne({ userId: currentUserId });

    if (!existingUser) {
      let referrerId: number | undefined = undefined;

      // Check if user started via a referral link silently
      if (startPayload && startPayload.startsWith("ref_")) {
        const parsedRefId = parseInt(startPayload.replace("ref_", ""), 10);
        if (!isNaN(parsedRefId) && parsedRefId !== currentUserId) {
          const referrerExists = await User.findOne({ userId: parsedRefId });
          if (referrerExists) {
            referrerId = parsedRefId;
            // Reward referrer with +2 points and increment referral count
            await User.updateOne(
              { userId: parsedRefId },
              { $inc: { points: 2, referralCount: 1 } }
            );

            // Send confirmation message to the referrer
            try {
              await ctx.api.sendMessage(
                parsedRefId,
                `🎉 <b>New Referral Joined!</b>\n\n` +
                `A new user has joined through your referral link!\n` +
                `You have been rewarded <b>+2 Points</b> for your referral bonus. 💎`,
                { parse_mode: "HTML" }
              );
            } catch (err) {
              // Ignore if the referrer hasn't started the bot in PM yet
            }
          }
        }
      }

      // Create new user with 5 welcome points quietly
      await User.create({
        userId: currentUserId,
        username: ctx.from.username,
        firstName: ctx.from.first_name || "User",
        points: 5, // Welcome bonus
        referredBy: referrerId,
      }).catch((err) => console.error("[User Tracking Error]:", err));
    }
  }

  // --- 1. DEEP LINK CONFIG ROUTE (/start config_GROUPID) ---
  if (startPayload && startPayload.startsWith("config_")) {
    const groupIdStr = startPayload.replace("config_", "");
    const groupId = parseInt(groupIdStr, 10);
    const userId = currentUserId!;

    if (isNaN(groupId)) {
      return ctx.reply("⚠️ <b>Invalid group parameter provided.</b>", { parse_mode: "HTML" });
    }

    // Verify user is an admin of the target group
    const isAdmin = await checkIsAdmin(ctx, groupId, userId);
    if (!isAdmin) {
      return ctx.reply("⚠️ <b>Permission Denied!</b>\nYou must be an administrator in that group to configure settings.", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("💬 Support Group", env.SUPPORT_GROUP || "https://t.me/MrBossSupport"),
      });
    }

    // Auto-create config if it doesn't exist yet
    let config = await GroupConfig.findOne({ groupId });
    if (!config) {
      config = await GroupConfig.create({ groupId, ownerId: userId });
    }

    return ctx.reply(
      `🛡️ <b>ShieldGram Dashboard</b>\n` +
      `Group ID: <code>${groupId}</code>\n\n` +
      `Tap any toggle below to instantly enable or disable features:`,
      {
        parse_mode: "HTML",
        reply_markup: buildDashboardKeyboard(config),
      }
    );
  }

  // --- 2. DEEP LINK SECRET ROUTE (/start secret_SESSIONID) ---
  if (startPayload && startPayload.startsWith("secret_")) {
    // Handled by the secret handler middleware
    return;
  }

  // --- 3. DEFAULT CLEAN LANDING MENU ---
  const firstName = ctx.from?.first_name || "User";

  const welcomeText =
    `<b>Good to see you, ${firstName}</b>!\n\n` +
    `<i>ShieldGram is your ultimate group management bot, engineered to be the #1 security tool on Telegram. Tap <b>📓 GUIDE</b> or send /help below to see how I work.</i>\n\n` +
    `<b>Add me to your group as an Admin right now to activate full protection! ♥️</b>`;

  const keyboard = new InlineKeyboard()
    .url("➕ ADD ME TO GROUP", `https://t.me/${ctx.me.username}?startgroup=true`)
    .row()
    .text("ℹ️ ABOUT", "nav_about")
    .text("📓 GUIDE", "nav_help")
    .row()
    .url("💬 SUPPORT", env.SUPPORT_GROUP || "https://t.me/MrBossSupport")
    .url("📢 UPDATES", env.UPDATES_CHANNEL || "https://t.me/MrBossBotz");

  await ctx.reply(welcomeText, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// --- STATS COMMAND ---
startHandler.command("stats", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await GroupConfig.countDocuments();

    const configs = await GroupConfig.find({}, { "features.forceSub.channels": 1 });
    const fSubSet = new Set<string>();
    configs.forEach((cfg: any) => {
      const channels = cfg.features?.forceSub?.channels || [];
      channels.forEach((ch: string) => fSubSet.add(ch));
    });
    const totalFSubChannels = fSubSet.size;

    const statsText =
      `📊 <b>ShieldGram Analytics & Stats</b>\n\n` +
      `👥 <b>Total Users:</b> <code>${totalUsers.toLocaleString()}</code>\n` +
      `🏰 <b>Total Groups:</b> <code>${totalGroups.toLocaleString()}</code>\n` +
      `📢 <b>F-Sub Channels:</b> <code>${totalFSubChannels.toLocaleString()}</code>\n\n` +
      `⚡ <i>System status: Operational & Online</i>`;

    await ctx.reply(statsText, { parse_mode: "HTML" });
  } catch (error) {
    console.error("[Stats Command Error]:", error);
    await ctx.reply("❌ Failed to retrieve bot statistics.");
  }
});

// --- OWNER BONUS COMMAND ---
startHandler.command("bonus", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply("⚠️ <b>The /bonus command must be used in private chat with the bot.</b>", { parse_mode: "HTML" });
  }

  const currentUserId = ctx.from?.id;
  if (!currentUserId || currentUserId !== env.OWNER_ID) {
    return ctx.reply("❌ <b>Unauthorized!</b> This command is restricted to the bot owner.");
  }

  let targetUserId: number | undefined;
  let bonusAmount = 0;

  // Case 1: Command sent as a Reply to a user's message
  if (ctx.message?.reply_to_message?.from) {
    targetUserId = ctx.message.reply_to_message.from.id;
    const args = ctx.match ? (ctx.match as string).trim().split(/\s+/) : [];
    bonusAmount = parseInt(args[0], 10);
  } 
  // Case 2: Command sent with arguments (e.g., /bonus 123456789 50)
  else if (ctx.match) {
    const args = (ctx.match as string).trim().split(/\s+/);
    targetUserId = parseInt(args[0], 10);
    bonusAmount = parseInt(args[1], 10);
  }

  if (!targetUserId || isNaN(targetUserId) || isNaN(bonusAmount) || bonusAmount <= 0) {
    return ctx.reply(
      "⚠️ <b>Invalid usage!</b>\n\n" +
      "• <i>Reply to a user:</i> <code>/bonus 50</code>\n" +
      "• <i>Or use User ID:</i> <code>/bonus 123456789 50</code>",
      { parse_mode: "HTML" }
    );
  }

  try {
    let targetUser = await User.findOne({ userId: targetUserId });
    if (!targetUser) {
      targetUser = await User.create({
        userId: targetUserId,
        firstName: "User",
        points: 5,
      });
    }

    targetUser.points += bonusAmount;
    await targetUser.save();

    await ctx.reply(
      `✅ <b>Bonus Awarded Successfully!</b>\n\n` +
      `• <b>User ID:</b> <code>${targetUserId}</code>\n` +
      `• <b>Amount:</b> <code>+${bonusAmount} Points</code>\n` +
      `• <b>New Balance:</b> <code>${targetUser.points} pts</code>`,
      { parse_mode: "HTML" }
    );

    const channelLink = env.UPDATES_CHANNEL || "https://t.me/MrBossBotz";
    try {
      await ctx.api.sendMessage(
        targetUserId,
        `🎁 <b>Congratulations!</b>\n\n` +
        `You got a bonus of <b>${bonusAmount} points</b> from admin <b>@MrBossTG</b>!\n\n` +
        `📢 Stay tuned for more updates on our channel: ${channelLink}`,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      );
    } catch (dmErr) {
      console.error("[Bonus DM Notification Error]:", dmErr);
    }

  } catch (err) {
    console.error("[Bonus Command Error]:", err);
    await ctx.reply("❌ Failed to process the bonus reward.");
  }
});

// --- NAVIGATION CALLBACKS ---

startHandler.callbackQuery("nav_about", async (ctx) => {
  const devHandle = env.ADMIN_HANDLE || "MrBossTG";
  const devLink = env.DEV_GITHUB || "https://github.com/MrBoss002";

  const aboutText =
    `ℹ️ <b>About ShieldGram</b>\n\n` +
    `• <b>Version</b>: 1.0.0\n` +
    `• <b>Developer</b>: <a href="${devLink}">${devHandle}</a>\n` +
    `• <b>Framework</b>: Node.js + TypeScript + gramY\n` +
    `• <b>Database</b>: MongoDB\n` +
    `• <b>Architecture</b>: Pure Telegram Bot API (No userbots required)`;

  const keyboard = new InlineKeyboard()
    .text("🔙 BACK", "nav_home")
    .text("📖 HELP", "help_main");

  try {
    await ctx.editMessageText(aboutText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } catch {}
  await ctx.answerCallbackQuery();
});

startHandler.callbackQuery("nav_help", async (ctx) => {
  const helpText =
    `❓ <b>ShieldGram Setup Guide</b>\n\n` +
    `1️⃣ <b>Add to Group</b>: Add @${ctx.me.username} as an Admin in your group with <i>Delete Messages</i> & <i>Restrict Users</i> permissions.\n\n` +
    `2️⃣ <b>Open Dashboard</b>: Send <code>/config</code> in your group and tap <b>⚙️ CONFIGURE IN PM</b>.\n\n` +
    `3️⃣ <b>Link Channels</b>: In PM, go to <i>Manage Force-Sub</i> ➔ <i>Add Channel</i> and forward a post from your channel.\n\n` +
    `4️⃣ <b>Customize Toggles</b>: Enable or disable Captcha, Anti-Link, Rules, and Welcome Messages with a single click.`;

  const keyboard = new InlineKeyboard()
    .text("🔙 BACK", "nav_home")
    .text("📖 HELP", "help_main");

  try {
    await ctx.editMessageText(helpText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch {}
  await ctx.answerCallbackQuery();
});

startHandler.callbackQuery("nav_home", async (ctx) => {
  const firstName = ctx.from?.first_name || "User";

  const welcomeText =
    `<b>Good to see you, ${firstName}</b>!\n\n` +
    `<i>ShieldGram is your ultimate group management bot, engineered to be the #1 security tool on Telegram. Tap <b>📓 GUIDE</b> or send /help below to see how I work.</i>\n\n` +
    `<b>Add me to your group as an Admin right now to activate full protection! ♥️</b>`;

  const keyboard = new InlineKeyboard()
    .url("➕ ADD ME TO GROUP", `https://t.me/${ctx.me.username}?startgroup=true`)
    .row()
    .text("ℹ️ ABOUT", "nav_about")
    .text("📓 GUIDE", "nav_help")
    .row()
    .url("💬 SUPPORT", env.SUPPORT_GROUP || "https://t.me/MrBossSupport")
    .url("📢 UPDATES", env.UPDATES_CHANNEL || "https://t.me/MrBossBotz");

  try {
    await ctx.editMessageText(welcomeText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch {}
  await ctx.answerCallbackQuery();
});
