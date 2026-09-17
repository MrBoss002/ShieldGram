import { Composer, InlineKeyboard } from "grammy";
import { env } from "../../config/env";

export const startHandler = new Composer();

startHandler.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const startPayload = ctx.match;

  if (startPayload && startPayload.startsWith("config_")) {
    const groupIdStr = startPayload.replace("config_", "");
    await ctx.reply(
      `🛡️ **ShieldGram Admin Settings**\n\nDirect configuration initialized for group ID: \`${groupIdStr}\`.\n\nUse the panel below to toggle features or update settings:`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("⚙️ Open Settings", `open_config_${groupIdStr}`)
          .row(),
      }
    );
    return;
  }

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
