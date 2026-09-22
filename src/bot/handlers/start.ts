import { Composer, InlineKeyboard, Context } from "grammy";
import { env } from "../../config/env";
import { GroupConfig } from "../../models/GroupConfig";
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

  const startPayload = ctx.match;

  // --- 1. DEEP LINK CONFIG ROUTE (/start config_GROUPID) ---
  if (startPayload && startPayload.startsWith("config_")) {
    const groupIdStr = startPayload.replace("config_", "");
    const groupId = parseInt(groupIdStr, 10);
    const userId = ctx.from!.id;

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

  // --- 2. DEFAULT LANDING MENU ---
  const firstName = ctx.from?.first_name || "User";

  const welcomeText =
    `👋 <b>Hello ${firstName}!</b>\n\n` +
    `Welcome to <b>ShieldGram</b> — your complete security and group management solution.\n\n` +
    `<b>Key Features:</b>\n` +
    `• <b>Force-Sub Verification</b> — Require channel subscription before speaking\n` +
    `• <b>Instant Auto-Approve</b> — Handle join requests instantly\n` +
    `• <b>Anti-Link & Anti-Weblink</b> — Keep group chat clean from spam\n` +
    `• <b>Custom Welcome Cards</b> — Greet members with dynamic tags & photo buttons\n` +
    `• <b>Entry Captcha</b> — Shield your community from automated userbots\n\n` +
    `Add me to your group as an Admin to get started!`;

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

  const keyboard = new InlineKeyboard().text("🔙 BACK", "nav_home");

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

  const keyboard = new InlineKeyboard().text("🔙 BACK", "nav_home");

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
    `👋 <b>Hello ${firstName}!</b>\n\n` +
    `Welcome to <b>ShieldGram</b> — your complete security and group management solution.\n\n` +
    `Add me to your group as an Admin to get started!`;

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
