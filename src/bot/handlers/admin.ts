import { Composer, InlineKeyboard, Context } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { env } from "../../config/env";

export const adminHandler = new Composer();

const SUPPORT_GROUP_URL = env.SUPPORT_GROUP;

const adminStates = new Map<
  number,
  {
    action:
      | "AWAITING_FSUB_FORWARD"
      | "AWAITING_RULES_TEXT"
      | "AWAITING_WELCOME_TEXT"
      | "AWAITING_WELCOME_PIC"
      | "AWAITING_WELCOME_BUTTONS";
    groupId: number;
    dashboardMessageId?: number;
  }
>();

async function checkIsAdmin(ctx: Context, groupId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(groupId, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

// 1. UPDATED DASHBOARD KEYBOARD
export const buildDashboardKeyboard = (config: any) => {
  const f = config.features;
  return new InlineKeyboard()
    // Upper-case labels
    .text(
      `AUTO-APPROVE: ${f.autoApprove?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_autoApprove_${config.groupId}`
    )
    .text(
      `CAPTCHA: ${f.captcha?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_captcha_${config.groupId}`
    )
    .row()
    .text(
      `CLEAN ALERTS: ${f.cleanSystemAlerts?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_cleanAlerts_${config.groupId}`
    )
    .text(
      `FORCE-SUB: ${f.forceSub?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_forceSub_${config.groupId}`
    )
    .row()
    .text(
      `ANTI-LINK: ${f.antiLink?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_antiLink_${config.groupId}`
    )
    .text(
      `ANTI-WEBLINK: ${f.antiWeblink?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_antiWeblink_${config.groupId}`
    )
    .row()
    .text(
      `ANTI-FORWARD: ${f.antiForward?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_antiForward_${config.groupId}`
    )
    .text(
      `WELCOME: ${f.welcome?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_welcome_${config.groupId}`
    )
    .row()
    .text(
      `RULES CMD: ${f.rules?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_rules_${config.groupId}`
    )
    .row()
    // Shortened Action Buttons
    .text("📢 FSUB CHANNELS", `manage_fsub_${config.groupId}`)
    .row()
    .text("📝 WELCOME MSG", `edit_welcome_${config.groupId}`)
    .text("📜 RULES TEXT", `edit_rules_${config.groupId}`);
};

// 2. FORCE-SUB MENU BUILDER (State 1 & State 2)
const buildFsubKeyboard = (config: any) => {
  const groupId = config.groupId;
  const channels = config.features?.forceSub?.channels || [];
  const keyboard = new InlineKeyboard();

  if (channels.length === 0) {
    // State 1: No channel
    keyboard.text("➕ ADD CHANNEL", `add_fsub_channel_${groupId}`).row();
  } else {
    // State 2: Channel added
    const chData = channels[0]; // Format: "@username" or "id|link"
    let displayTitle = "Channel";
    let url = "";

    if (chData.startsWith("@")) {
      displayTitle = chData;
      url = `https://t.me/${chData.replace("@", "")}`;
    } else {
      const parts = chData.split("|");
      displayTitle = "Private Channel";
      url = parts[1] || "";
    }

    if (url) {
      keyboard.url(`📢 ${displayTitle}`, url);
    } else {
      keyboard.text(`📢 ${displayTitle}`, "ignore");
    }
    keyboard.text("🗑️", `unlink_fsub_${groupId}`).row();
  }

  keyboard.text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);
  return keyboard;
};

// 3. COMPACT GRID WELCOME MENU BUILDER
const buildWelcomeMenuKeyboard = (config: any) => {
  const groupId = config.groupId;

  return new InlineKeyboard()
    // Row 1: Image Actions
    .text("🖼️ SET IMAGE", `set_welcomePic_${groupId}`)
    .text("👁‍🗨", `prev_welcomePic_${groupId}`)
    .text("🗑️", `del_welcomePic_${groupId}`)
    .row()
    // Row 2: Text Actions
    .text("📝 SET TEXT", `set_welcomeText_${groupId}`)
    .text("👁‍🗨", `prev_welcomeText_${groupId}`)
    .text("🗑️", `del_welcomeText_${groupId}`)
    .row()
    // Row 3: Button Actions
    .text("🔘 SET BUTTON", `set_welcomeButtons_${groupId}`)
    .text("👁‍🗨", `prev_welcomeButtons_${groupId}`)
    .text("🗑️", `del_welcomeButtons_${groupId}`)
    .row()
    // Row 4: Back Button
    .text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);
};

// --- HANDLERS ---

adminHandler.command("config", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return ctx.reply("❌ The <code>/config</code> command can only be used inside groups.", { parse_mode: "HTML" });
  }

  const member = await ctx.getChatMember(ctx.from!.id);
  if (!["creator", "administrator"].includes(member.status)) {
    return ctx.reply("⚠️ You do not have permission to do this!");
  }

  const groupId = ctx.chat.id;
  let config = await GroupConfig.findOne({ groupId });
  if (!config) {
    config = await GroupConfig.create({ groupId, ownerId: ctx.from!.id });
  }

  const pmConfigUrl = `https://t.me/${ctx.me.username}?start=config_${groupId}`;
  const keyboard = new InlineKeyboard().url("⚙️ CONFIGURE IN PM", pmConfigUrl);

  await ctx.reply(
    `👋 <b>Thank you for using ShieldGram in ${ctx.chat.title}!</b>\n\n` +
    `⚡ Important: Make sure to give me Admin permissions so all security features work properly.\n\n` +
      `⚙️ If you are an Admin, click the button below to open your configuration dashboard in PM:`,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
});

adminHandler.callbackQuery(/^open_config_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const userId = ctx.from.id;

  if (!(await checkIsAdmin(ctx, groupId, userId))) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  adminStates.delete(userId);
  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Configuration not found!", show_alert: true });

  try {
    await ctx.editMessageText(
      `🛡️ <b>ShieldGram Dashboard</b>\nGroup ID: <code>${groupId}</code>\n\nTap any toggle below to instantly enable or disable features:`,
      { parse_mode: "HTML", reply_markup: buildDashboardKeyboard(config) }
    );
  } catch {}
  await ctx.answerCallbackQuery();
});

// Feature Toggles
adminHandler.callbackQuery(
  /^toggle_(autoApprove|captcha|cleanAlerts|forceSub|welcome|rules|antiLink|antiWeblink|antiForward)_(-?\d+)$/,
  async (ctx) => {
    const featureKey = ctx.match[1];
    const groupId = parseInt(ctx.match[2]);

    if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) {
      return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
    }

    const config = await GroupConfig.findOne({ groupId });
    if (!config) return ctx.answerCallbackQuery({ text: "Group config not found!" });

    if (featureKey === "forceSub" && !config.features.forceSub.enabled) {
      if (!config.features.forceSub.channels || config.features.forceSub.channels.length === 0) {
        return ctx.answerCallbackQuery({
          text: "⚠️ Please set up a Force-Sub channel first!",
          show_alert: true,
        });
      }
    }

    switch (featureKey) {
      case "autoApprove": config.features.autoApprove.enabled = !config.features.autoApprove.enabled; break;
      case "captcha": config.features.captcha.enabled = !config.features.captcha.enabled; break;
      case "cleanAlerts": config.features.cleanSystemAlerts.enabled = !config.features.cleanSystemAlerts.enabled; break;
      case "forceSub": config.features.forceSub.enabled = !config.features.forceSub.enabled; break;
      case "welcome": config.features.welcome.enabled = !config.features.welcome.enabled; break;
      case "rules": config.features.rules.enabled = !config.features.rules.enabled; break;
      case "antiLink": config.features.antiLink.enabled = !config.features.antiLink.enabled; break;
      case "antiWeblink": config.features.antiWeblink.enabled = !config.features.antiWeblink.enabled; break;
      case "antiForward": config.features.antiForward.enabled = !config.features.antiForward.enabled; break;
    }

    await config.save();
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: buildDashboardKeyboard(config) });
    } catch {}
    await ctx.answerCallbackQuery({ text: "Updated feature setting!" });
  }
);

// --- FORCE-SUB FLOW (SINGLE CHANNEL) ---
adminHandler.callbackQuery(/^manage_fsub_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Config not found!" });

  const chs = config.features?.forceSub?.channels || [];
  let statusText = chs.length > 0 ? chs[0].split("|")[0] : "None";

  await ctx.editMessageText(
    `📢 <b>Manage Force-Sub Channel</b>\n\nConnected Channel: <b>${statusText}</b>`,
    { parse_mode: "HTML", reply_markup: buildFsubKeyboard(config) }
  );
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^add_fsub_channel_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  adminStates.set(ctx.from.id, {
    action: "AWAITING_FSUB_FORWARD",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  await ctx.editMessageText(
    `📢 <b>Add Force-Sub Channel</b>\n\n` +
      `1. Add me to your channel as an <b>Admin</b>.\n` +
      `2. <b>Forward any post</b> from that channel here.`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🔙 BACK", `manage_fsub_${groupId}`) }
  );
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^unlink_fsub_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  const config = await GroupConfig.findOne({ groupId });
  if (config) {
    config.features.forceSub.channels = [];
    config.features.forceSub.enabled = false;
    await config.save();
  }

  await ctx.answerCallbackQuery({ text: "🗑️ Unlinked successfully!", show_alert: false });

  await ctx.editMessageText(
    `📢 <b>Manage Force-Sub Channel</b>\n\nConnected Channel: <b>None</b>`,
    { parse_mode: "HTML", reply_markup: buildFsubKeyboard(config) }
  );
});

// --- WELCOME MENU FLOW ---
adminHandler.callbackQuery(/^edit_welcome_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Config not found!" });

  const hasImg = !!config.features?.welcome?.mediaUrl;
  const hasTxt = !!config.features?.welcome?.message;
  const hasBtn = !!config.features?.welcome?.buttons;

  await ctx.editMessageText(
    `👋 <b>Welcome Message Customization</b>\n\n` +
      `IMAGE: ${hasImg ? "✅" : "❎"}, TEXT: ${hasTxt ? "✅" : "❎"}, BUTTONS: ${hasBtn ? "✅" : "❎"}`,
    { parse_mode: "HTML", reply_markup: buildWelcomeMenuKeyboard(config) }
  );
  await ctx.answerCallbackQuery();
});

// PREVIEW (👁‍🗨) HANDLERS
adminHandler.callbackQuery(/^prev_welcome(Pic|Text|Buttons)_(-?\d+)$/, async (ctx) => {
  const type = ctx.match[1];
  const groupId = parseInt(ctx.match[2]);

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery();

  const w = config.features?.welcome;
  if (type === "Pic") {
    if (!w?.mediaUrl) return ctx.answerCallbackQuery({ text: "⚠️ Didn't set yet!", show_alert: true });
    await ctx.replyWithPhoto(w.mediaUrl, { caption: "👁‍🗨 Preview: Welcome Image" });
  } else if (type === "Text") {
    if (!w?.message) return ctx.answerCallbackQuery({ text: "⚠️ Didn't set yet!", show_alert: true });
    await ctx.reply(`👁‍🗨 <b>Preview Text:</b>\n\n${w.message}`, { parse_mode: "HTML" });
  } else if (type === "Buttons") {
    if (!w?.buttons) return ctx.answerCallbackQuery({ text: "⚠️ Didn't set yet!", show_alert: true });
    await ctx.reply(`👁‍🗨 <b>Preview Buttons Config:</b>\n<code>${w.buttons}</code>`, { parse_mode: "HTML" });
  }
  await ctx.answerCallbackQuery();
});

// DELETE (🗑️) HANDLERS
adminHandler.callbackQuery(/^del_welcome(Pic|Text|Buttons)_(-?\d+)$/, async (ctx) => {
  const type = ctx.match[1];
  const groupId = parseInt(ctx.match[2]);

  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery();

  if (type === "Pic") config.features.welcome.mediaUrl = "";
  if (type === "Text") config.features.welcome.message = "";
  if (type === "Buttons") config.features.welcome.buttons = "";

  await config.save();
  await ctx.answerCallbackQuery({ text: "🗑️ Deleted successfully!", show_alert: false });

  const hasImg = !!config.features?.welcome?.mediaUrl;
  const hasTxt = !!config.features?.welcome?.message;
  const hasBtn = !!config.features?.welcome?.buttons;

  await ctx.editMessageText(
    `👋 <b>Welcome Message Customization</b>\n\n` +
      `IMAGE: ${hasImg ? "✅" : "❎"}, TEXT: ${hasTxt ? "✅" : "❎"}, BUTTONS: ${hasBtn ? "✅" : "❎"}`,
    { parse_mode: "HTML", reply_markup: buildWelcomeMenuKeyboard(config) }
  );
});

// SET PROMPT HANDLERS
adminHandler.callbackQuery(/^set_welcomePic_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  adminStates.set(ctx.from.id, { action: "AWAITING_WELCOME_PIC", groupId });
  await ctx.editMessageText("🖼️ Send an image photo below (under 1MB):", {
    reply_markup: new InlineKeyboard().text("🔙 BACK", `edit_welcome_${groupId}`),
  });
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^set_welcomeText_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  adminStates.set(ctx.from.id, { action: "AWAITING_WELCOME_TEXT", groupId });
  await ctx.editMessageText("📝 Send your new welcome greeting text:", {
    reply_markup: new InlineKeyboard().text("🔙 BACK", `edit_welcome_${groupId}`),
  });
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^set_welcomeButtons_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  adminStates.set(ctx.from.id, { action: "AWAITING_WELCOME_BUTTONS", groupId });
  await ctx.editMessageText("🔘 Send button links layout format:\n<code>[Name](url) | [Name2](url)</code>", {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text("🔙 BACK", `edit_welcome_${groupId}`),
  });
  await ctx.answerCallbackQuery();
});

// --- CENTRAL INPUT LISTENER ---
adminHandler.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private") return next();

  const userState = adminStates.get(ctx.from.id);
  if (!userState) return next();

  const { action, groupId } = userState;
  const config = await GroupConfig.findOne({ groupId });
  if (!config) return next();

  const backWelcome = new InlineKeyboard().text("🔙 BACK TO WELCOME MENU", `edit_welcome_${groupId}`);

  if (action === "AWAITING_FSUB_FORWARD") {
    const origin = ctx.message?.forward_origin;
    const forwardedChat = origin && origin.type === "channel" ? origin.chat : undefined;

    if (!forwardedChat) {
      return ctx.reply("❌ Forward directly from your target **Channel**.");
    }

    const channelData = forwardedChat.username
      ? `@${forwardedChat.username}`
      : `${forwardedChat.id}|https://t.me/c/${Math.abs(forwardedChat.id)}/1`;

    config.features.forceSub.channels = [channelData];
    config.features.forceSub.enabled = true;
    await config.save();
    adminStates.delete(ctx.from.id);

    return ctx.reply("✅ **Force-Sub Channel Connected Successfully!**", {
      reply_markup: new InlineKeyboard().text("📢 MANAGE FSUB", `manage_fsub_${groupId}`),
    });
  }

  if (action === "AWAITING_WELCOME_TEXT") {
    config.features.welcome.message = ctx.message.text || "";
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ **Welcome text updated!**", { reply_markup: backWelcome });
  }

  if (action === "AWAITING_WELCOME_PIC") {
    const photo = ctx.message.photo;
    if (!photo) return ctx.reply("❌ Please send a valid photo.");

    config.features.welcome.mediaUrl = photo[photo.length - 1].file_id;
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ **Welcome image set!**", { reply_markup: backWelcome });
  }

  if (action === "AWAITING_WELCOME_BUTTONS") {
    config.features.welcome.buttons = ctx.message.text || "";
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ **Welcome buttons updated!**", { reply_markup: backWelcome });
  }

  return next();
});
