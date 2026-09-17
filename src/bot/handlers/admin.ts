import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const adminHandler = new Composer();

// Helper to render the Admin Dashboard Keyboard dynamically
const buildDashboardKeyboard = (config: any) => {
  const f = config.features;
  return new InlineKeyboard()
    .text(
      `Auto-Approve: ${f.autoApprove.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_autoApprove_${config.groupId}`
    )
    .text(
      `Captcha: ${f.captcha.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_captcha_${config.groupId}`
    )
    .row()
    .text(
      `Clean Alerts: ${f.cleanSystemAlerts.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_cleanAlerts_${config.groupId}`
    )
    .text(
      `Force-Sub: ${f.forceSub.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_forceSub_${config.groupId}`
    )
    .row()
    .text(
      `Welcome: ${f.welcome.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_welcome_${config.groupId}`
    )
    .text(
      `Rules Cmd: ${f.rules.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_rules_${config.groupId}`
    )
    .row()
    .text("📢 Manage Force-Sub Channels", `manage_fsub_${config.groupId}`)
    .row()
    .text("👋 Edit Welcome Msg", `edit_welcome_${config.groupId}`)
    .text("📜 Edit Rules Text", `edit_rules_${config.groupId}`);
};

// Group Command: /config
adminHandler.command("config", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return ctx.reply("❌ The `/config` command can only be used inside groups.");
  }

  const member = await ctx.getChatMember(ctx.from!.id);
  if (!["creator", "administrator"].includes(member.status)) {
    return ctx.reply("❌ Only group admins can configure ShieldGram.");
  }

  const groupId = ctx.chat.id;

  // Ensure DB Record exists
  let config = await GroupConfig.findOne({ groupId });
  if (!config) {
    config = await GroupConfig.create({
      groupId,
      ownerId: ctx.from!.id,
    });
  }

  const pmConfigUrl = `https://t.me/${ctx.me.username}?start=config_${groupId}`;
  const keyboard = new InlineKeyboard().url("⚙️ Configure in PM", pmConfigUrl);

  await ctx.reply(
    `🛡️ **ShieldGram Admin Panel**\n\nClick below to open your private group configuration dashboard:`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

// Render PM Dashboard when open_config_ is clicked
adminHandler.callbackQuery(/^open_config_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const config = await GroupConfig.findOne({ groupId });

  if (!config) {
    return ctx.answerCallbackQuery({
      text: "❌ Configuration not found. Please run /config in the group first.",
      show_alert: true,
    });
  }

  await ctx.editMessageText(
    `🛡️ **ShieldGram Dashboard**\nGroup ID: \`${groupId}\`\n\nTap any toggle below to instantly enable or disable features:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildDashboardKeyboard(config),
    }
  );
  await ctx.answerCallbackQuery();
});

// Feature Toggle Callback Handler
adminHandler.callbackQuery(/^toggle_(autoApprove|captcha|cleanAlerts|forceSub|welcome|rules)_(-?\d+)$/, async (ctx) => {
  const featureKey = ctx.match[1];
  const groupId = parseInt(ctx.match[2]);

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Group config not found!" });

  // Map toggle keys to schema properties
  switch (featureKey) {
    case "autoApprove":
      config.features.autoApprove.enabled = !config.features.autoApprove.enabled;
      break;
    case "captcha":
      config.features.captcha.enabled = !config.features.captcha.enabled;
      break;
    case "cleanAlerts":
      config.features.cleanSystemAlerts.enabled = !config.features.cleanSystemAlerts.enabled;
      break;
    case "forceSub":
      config.features.forceSub.enabled = !config.features.forceSub.enabled;
      break;
    case "welcome":
      config.features.welcome.enabled = !config.features.welcome.enabled;
      break;
    case "rules":
      config.features.rules.enabled = !config.features.rules.enabled;
      break;
  }

  await config.save();

  await ctx.editMessageReplyMarkup({
    reply_markup: buildDashboardKeyboard(config),
  });

  await ctx.answerCallbackQuery({ text: "Updated feature setting!" });
});
