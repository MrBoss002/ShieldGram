import { Composer, InlineKeyboard } from "grammy";
import { env } from "../../config/env";
import { GroupConfig } from "../../models/GroupConfig";
import { buildDashboardKeyboard } from "./admin";

export const startHandler = new Composer();

// Helper to check if user is an admin of the target group
async function checkIsAdmin(ctx: any, groupId: number, userId: number): Promise<boolean> {
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

  // Handle Deep Link from Group (/start config_GROUPID)
  if (startPayload && startPayload.startsWith("config_")) {
    const groupIdStr = startPayload.replace("config_", "");
    const groupId = parseInt(groupIdStr, 10);
    const userId = ctx.from!.id;

    if (isNaN(groupId)) {
      return ctx.reply("⚠️ Invalid group parameter provided.");
    }

    // Verify user is an admin of the group
    const isAdmin = await checkIsAdmin(ctx, groupId, userId);
    if (!isAdmin) {
      return ctx.reply("⚠️ You do not have permission to configure this group! You must be an admin there.", {
        reply_markup: new InlineKeyboard().url("💬 Support Group", env.SUPPORT_GROUP),
      });
    }

    const config = await GroupConfig.findOne({ groupId });
    if (!config) {
      return ctx.reply("❌ Group configuration not found. Please run `/config` inside the group first!", {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().url("💬 Support Group", env.SUPPORT_GROUP),
      });
    }

    // Directly present the Dashboard Keyboard imported from admin.ts
    return ctx.reply(
      `🛡️ **ShieldGram Dashboard**\nGroup ID: \`${groupId}\`\n\nTap any toggle below to instantly enable or disable features:`,
      {
        parse_mode: "Markdown",
        reply_markup: buildDashboardKeyboard(config),
      }
    );
  }

  // Default /start message in PM
  const firstName = ctx.from?.first_name || "User";

  const welcomeText =
    `👋 **Hello ${firstName}!**\n\n` +
    `Welcome to **ShieldGram** — the ultimate security and management bot for Telegram groups and channels.\n\n` +
    `I can help you:\n` +
    `• Enforce Force-Sub requirements on group chats\n` +
    `• Auto-approve incoming join requests in real-time\n` +
    `• Display custom Welcome & Goodbye greetings\n` +
    `• Clean up default system alert messages\n` +
    `• Stop userbots with instant PM Captcha checks\n\n` +
    `Add me to your group as an Admin to get started!`;

  const keyboard = new InlineKeyboard()
    .url("➕ Add Me To Your Group", `https://t.me/${ctx.me.username}?startgroup=true`)
    .row()
    .text("ℹ️ About ShieldGram", "nav_about")
    .text("❓ Help & Setup", "nav_help")
    .row()
    .url("🌐 Support", env.SUPPORT_GROUP)
    .url("📢 Updates", env.UPDATES_CHANNEL);

  await ctx.reply(welcomeText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

startHandler.callbackQuery("nav_about", async (ctx) => {
  const aboutText =
    `ℹ️ **About ShieldGram**\n\n` +
    `• **Version**: 1.0.0\n` +
    `• **Developer**: [${env.ADMIN_HANDLE}](${env.DEV_GITHUB})\n` +
    `• **Framework**: Node.js + TypeScript + gramY\n` +
    `• **Database**: MongoDB\n` +
    `• **License**: AGPL-3.0\n` +
    `• **Privacy & Security**: Native Telegram Bot API only — no session logins or userbots required.`;

  const keyboard = new InlineKeyboard().text("🔙 Back", "nav_home");

  await ctx.editMessageText(aboutText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

startHandler.callbackQuery("nav_help", async (ctx) => {
  const helpText =
    `❓ **How to Set Up ShieldGram:**\n\n` +
    `**1. Add to Group**: Add @${ctx.me.username} as an Admin in your group with *Delete Messages* and *Restrict Users* permissions.\n` +
    `**2. Open Config**: Click the **⚙️ Configure in PM** button inside your group to receive your private management menu.\n` +
    `**3. Add Channels**: Tap *Manage Force-Sub* ➔ *Add Channel*, then forward any message from your target channel to link it.\n` +
    `**4. Toggle Features**: Enable or disable Captcha, Auto-Approve, System Cleaner, or Rules with a single tap.`;

  const keyboard = new InlineKeyboard().text("🔙 Back", "nav_home");

  await ctx.editMessageText(helpText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

startHandler.callbackQuery("nav_home", async (ctx) => {
  const welcomeText =
    `👋 **Hello ${ctx.from?.first_name || "User"}!**\n\n` +
    `Welcome to **ShieldGram** — the ultimate security and management bot for Telegram groups and channels.\n\n` +
    `Add me to your group as an Admin to get started!`;

  const keyboard = new InlineKeyboard()
    .url("➕ Add Me To Your Group", `https://t.me/${ctx.me.username}?startgroup=true`)
    .row()
    .text("ℹ️ About ShieldGram", "nav_about")
    .text("❓ Help & Setup", "nav_help")
    .row()
    .url("🌐 Support", env.SUPPORT_GROUP)
    .url("📢 Updates", env.UPDATES_CHANNEL);

  await ctx.editMessageText(welcomeText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});
