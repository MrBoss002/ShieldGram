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

// Helper function to parse custom buttons for previewing
function parseWelcomeButtons(buttonString?: string): InlineKeyboard | undefined {
  if (!buttonString || !buttonString.trim()) return undefined;

  const keyboard = new InlineKeyboard();
  const rows = buttonString.split("\n");

  for (const row of rows) {
    const buttons = row.split("|");
    let addedCount = 0;

    for (const btn of buttons) {
      const match = btn.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, text, url] = match;
        if (text && url) {
          keyboard.url(text.trim(), url.trim());
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      keyboard.row();
    }
  }

  return keyboard;
}

// 1. UPDATED DASHBOARD KEYBOARD
export const buildDashboardKeyboard = (config: any) => {
  const f = config.features;
  return new InlineKeyboard()
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
    .text("📢 FSUB CHANNELS", `manage_fsub_${config.groupId}`)
    .row()
    .text("📝 WELCOME MSG", `edit_welcome_${config.groupId}`)
    .text("📜 RULES TEXT", `edit_rules_${config.groupId}`);
};

// 2. FORCE-SUB MENU BUILDER
const buildFsubKeyboard = (config: any) => {
  const groupId = config.groupId;
  const channels = config.features?.forceSub?.channels || [];
  const keyboard = new InlineKeyboard();

  if (channels.length === 0) {
    keyboard.text("➕ ADD CHANNEL", `add_fsub_channel_${groupId}`).row();
  } else {
    const chData = channels[0];
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

// 3. CLEAN 2-COLUMN WELCOME MENU BUILDER
const buildWelcomeMenuKeyboard = (config: any) => {
  const groupId = config.groupId;

  return new InlineKeyboard()
    .text("🖼️ SET IMAGE", `set_welcomePic_${groupId}`)
    .text("🗑️", `del_welcomePic_${groupId}`)
    .row()
    .text("📝 SET TEXT", `set_welcomeText_${groupId}`)
    .text("🗑️", `del_welcomeText_${groupId}`)
    .row()
    .text("🔘 SET BUTTONS", `set_welcomeButtons_${groupId}`)
    .text("🗑️", `del_welcomeButtons_${groupId}`)
    .row()
    .text("👁‍🗨 PREVIEW WELCOME MSG", `prev_welcomeAll_${groupId}`)
    .row()
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

    let alertNotice = "Updated feature setting!";

    // --- CAPTCHA & FORCE-SUB MUTUAL EXCLUSION ---
    if (featureKey === "captcha") {
      const isEnabling = !config.features.captcha.enabled;
      config.features.captcha.enabled = isEnabling;

      if (isEnabling && config.features.forceSub.enabled) {
        config.features.forceSub.enabled = false;
        alertNotice = "💡 Captcha enabled! Force-Sub was automatically turned OFF because Captcha handles entry verification.";
      }
    } else if (featureKey === "forceSub") {
      const isEnabling = !config.features.forceSub.enabled;

      if (isEnabling) {
        if (!config.features.forceSub.channels || config.features.forceSub.channels.length === 0) {
          return ctx.answerCallbackQuery({
            text: "⚠️ Please set up a Force-Sub channel first!",
            show_alert: true,
          });
        }
        if (config.features.captcha.enabled) {
          config.features.captcha.enabled = false;
          alertNotice = "💡 Force-Sub enabled! Captcha was automatically turned OFF to prevent duplicate join checks.";
        }
      }
      config.features.forceSub.enabled = isEnabling;
    }

    // --- ANTI-LINK & ANTI-WEBLINK MUTUAL EXCLUSION ---
    else if (featureKey === "antiLink") {
      const isEnabling = !config.features.antiLink.enabled;
      config.features.antiLink.enabled = isEnabling;

      if (isEnabling && config.features.antiWeblink.enabled) {
        config.features.antiWeblink.enabled = false;
        alertNotice = "💡 Anti-Link enabled! Anti-Weblink was turned OFF because Anti-Link deletes all links (including Telegram links).";
      }
    } else if (featureKey === "antiWeblink") {
      const isEnabling = !config.features.antiWeblink.enabled;
      config.features.antiWeblink.enabled = isEnabling;

      if (isEnabling && config.features.antiLink.enabled) {
        config.features.antiLink.enabled = false;
        alertNotice = "💡 Anti-Weblink enabled! Anti-Link was turned OFF (Anti-Weblink allows Telegram links but deletes external URLs).";
      }
    }

    // --- OTHER STANDARD TOGGLES ---
    else {
      switch (featureKey) {
        case "autoApprove": config.features.autoApprove.enabled = !config.features.autoApprove.enabled; break;
        case "cleanAlerts": config.features.cleanSystemAlerts.enabled = !config.features.cleanSystemAlerts.enabled; break;
        case "welcome": config.features.welcome.enabled = !config.features.welcome.enabled; break;
        case "rules": config.features.rules.enabled = !config.features.rules.enabled; break;
        case "antiForward": config.features.antiForward.enabled = !config.features.antiForward.enabled; break;
      }
    }

    await config.save();
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: buildDashboardKeyboard(config) });
    } catch {}
    await ctx.answerCallbackQuery({ text: alertNotice, show_alert: alertNotice !== "Updated feature setting!" });
  }
);

// --- FORCE-SUB FLOW ---
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
      `1. Add me to your channel as an Admin.\n` +
      `2. Forward any post from that channel here.`,
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

  const menuText =
    `👋 <b>Welcome Message Customization</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `IMAGE: ${hasImg ? "✅" : "❎"}  |  TEXT: ${hasTxt ? "✅" : "❎"}  |  BUTTONS: ${hasBtn ? "✅" : "❎"}`;

  await ctx.editMessageText(menuText, {
    parse_mode: "HTML",
    reply_markup: buildWelcomeMenuKeyboard(config),
  });
  await ctx.answerCallbackQuery();
});

// PREVIEW COMPLETE WELCOME CARD
adminHandler.callbackQuery(/^prev_welcomeAll_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery();

  const w = config.features?.welcome;
  const firstName = ctx.from.first_name || "User";
  const groupTitle = "Sample Group";

  let welcomeText = w?.message?.trim() || "";

  if (welcomeText) {
    welcomeText = welcomeText
      .replace(/{MENTION}/gi, `<a href="tg://user?id=${ctx.from.id}">${firstName}</a>`)
      .replace(/{(FIRSTNAME|NAME)}/gi, firstName)
      .replace(/{USERNAME}/gi, ctx.from.username ? `@${ctx.from.username}` : firstName)
      .replace(/{USERID}/gi, ctx.from.id.toString())
      .replace(/{(GROUPNAME|TITLE)}/gi, groupTitle);
  }

  const keyboard = parseWelcomeButtons(w?.buttons);

  try {
    if (w?.mediaUrl) {
      await ctx.replyWithPhoto(w.mediaUrl, {
        caption: welcomeText || undefined,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      if (!welcomeText) {
        return ctx.answerCallbackQuery({
          text: "⚠️ No welcome text or image configured to preview!",
          show_alert: true,
        });
      }

      await ctx.reply(welcomeText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    await ctx.reply("❌ Error generating preview. Please check your button syntax or image ID.");
  }

  await ctx.answerCallbackQuery();
});

// DELETE WELCOME HANDLERS
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

  const menuText =
    `👋 <b>Welcome Message Customization</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `IMAGE: ${hasImg ? "✅" : "❎"}  |  TEXT: ${hasTxt ? "✅" : "❎"}  |  BUTTONS: ${hasBtn ? "✅" : "❎"}`;

  await ctx.editMessageText(menuText, {
    parse_mode: "HTML",
    reply_markup: buildWelcomeMenuKeyboard(config),
  });
});

// SET WELCOME PROMPT HANDLERS
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

// --- RULES CUSTOMIZATION FLOW ---
adminHandler.callbackQuery(/^edit_rules_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  adminStates.set(ctx.from.id, { action: "AWAITING_RULES_TEXT", groupId });

  const rulesGuideText =
    `📜 <b>GROUP REGULATION SETUP</b>\n\n` +
    `Send your group rules below. You can write your own or copy and customize the ready-to-use template below.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `✨ <b>SUPPORTED FORMATTING</b>\n` +
    `🔸 <code>&lt;b&gt;Bold Text&lt;/b&gt;</code> ➔ <b>Bold Text</b>\n` +
    `🔸 <code>&lt;i&gt;Italic Text&lt;/i&gt;</code> ➔ <i>Italic Text</i>\n` +
    `🔸 <code>&lt;a href="https://example.com"&gt;Link Text&lt;/a&gt;</code> ➔ <a href="https://example.com">Link Text</a>\n` +
    `🔸 <code>&lt;code&gt;Monospace Code&lt;/code&gt;</code> ➔ <code>Monospace Code</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📋 <b>READY-TO-USE TEMPLATE</b>\n` +
    `<i>(Tap code below to copy, edit, and send)</i>\n\n` +
    `<code>🛡️ &lt;b&gt;GROUP RULES &amp; REGULATIONS&lt;/b&gt;\n\n` +
    `1️⃣ &lt;b&gt;Respect All Members&lt;/b&gt;\n` +
    `• Keep discussions civil and friendly. No hate speech, harassment, or personal attacks.\n\n` +
    `2️⃣ &lt;b&gt;No Spam or Unsolicited Promotion&lt;/b&gt;\n` +
    `• Avoid posting self-promotional links, referral links, or mass spam messages without permission.\n\n` +
    `3️⃣ &lt;b&gt;English/Primary Language Only&lt;/b&gt;\n` +
    `• Please stick to the group's main language so moderators can review content effectively.\n\n` +
    `4️⃣ &lt;b&gt;No NSFW / Illegal Content&lt;/b&gt;\n` +
    `• Any explicit material, scams, or illegal activities will result in an immediate ban.\n\n` +
    `5️⃣ &lt;b&gt;Follow Admin Instructions&lt;/b&gt;\n` +
    `• Respect decisions made by group administrators and moderators.\n\n` +
    `💡 &lt;i&gt;Violations may result in a mute or ban from the group.&lt;/i&gt;</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👇 <b>Send your rules text below:</b>`;

  const keyboard = new InlineKeyboard()
    .text("👁‍🗨 PREVIEW", `prev_rules_${groupId}`)
    .text("🗑️ DELETE", `del_rules_${groupId}`)
    .row()
    .text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);

  await ctx.editMessageText(rulesGuideText, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// PREVIEW RULES
adminHandler.callbackQuery(/^prev_rules_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const config = await GroupConfig.findOne({ groupId });
  const rulesText = config?.features?.rules?.text;

  if (!rulesText) {
    return ctx.answerCallbackQuery({ text: "⚠️ No rules configured yet!", show_alert: true });
  }

  await ctx.reply(`👁‍🗨 <b>Preview Group Rules:</b>\n\n${rulesText}`, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
  await ctx.answerCallbackQuery();
});

// DELETE RULES
adminHandler.callbackQuery(/^del_rules_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  const config = await GroupConfig.findOne({ groupId });
  if (config) {
    config.features.rules.text = "";
    config.features.rules.enabled = false;
    await config.save();
  }

  await ctx.answerCallbackQuery({ text: "🗑️ Rules deleted successfully!", show_alert: false });
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
  const backDashboard = new InlineKeyboard().text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);

  if (action === "AWAITING_FSUB_FORWARD") {
    const origin = ctx.message?.forward_origin;
    const forwardedChat = origin && origin.type === "channel" ? origin.chat : undefined;

    if (!forwardedChat) {
      return ctx.reply("❌ Forward directly from your target Channel.");
    }

    let channelData = "";

    if (forwardedChat.username) {
      channelData = `@${forwardedChat.username}`;
    } else {
      try {
        const invite = await ctx.api.createChatInviteLink(forwardedChat.id, {
          name: "ShieldGram Force-Sub Link",
        });
        channelData = `${forwardedChat.id}|${invite.invite_link}`;
      } catch (error) {
        console.error("[Create Invite Link Error]:", error);
        return ctx.reply(
          "❌ <b>Failed to create invite link!</b>\nMake sure I am added to the channel as an <b>Admin</b> with <i>'Invite Users via Link'</i> permissions.",
          { parse_mode: "HTML" }
        );
      }
    }

    config.features.forceSub.channels = [channelData];
    config.features.forceSub.enabled = true;
    
    // Auto-disable Captcha when Force-Sub is configured
    if (config.features.captcha.enabled) {
      config.features.captcha.enabled = false;
    }

    await config.save();
    adminStates.delete(ctx.from.id);

    return ctx.reply("✅ <b>Force-Sub Channel Connected Successfully!</b>", {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("📢 MANAGE FSUB", `manage_fsub_${groupId}`),
    });
  }

  if (action === "AWAITING_RULES_TEXT") {
    const newRules = ctx.message.text || "";
    if (!newRules.trim()) {
      return ctx.reply("❌ Please send a valid text for group rules.");
    }

    config.features.rules.text = newRules;
    config.features.rules.enabled = true;
    await config.save();
    adminStates.delete(ctx.from.id);

    return ctx.reply("✅ <b>Group rules updated and enabled!</b>", {
      parse_mode: "HTML",
      reply_markup: backDashboard,
    });
  }

  if (action === "AWAITING_WELCOME_TEXT") {
    config.features.welcome.message = ctx.message.text || "";
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ <b>Welcome text updated!</b>", {
      parse_mode: "HTML",
      reply_markup: backWelcome,
    });
  }

  if (action === "AWAITING_WELCOME_PIC") {
    const photo = ctx.message.photo;
    if (!photo) return ctx.reply("❌ Please send a valid photo.");

    config.features.welcome.mediaUrl = photo[photo.length - 1].file_id;
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ <b>Welcome image set!</b>", {
      parse_mode: "HTML",
      reply_markup: backWelcome,
    });
  }

  if (action === "AWAITING_WELCOME_BUTTONS") {
    config.features.welcome.buttons = ctx.message.text || "";
    await config.save();
    adminStates.delete(ctx.from.id);
    return ctx.reply("✅ <b>Welcome buttons updated!</b>", {
      parse_mode: "HTML",
      reply_markup: backWelcome,
    });
  }

  return next();
});
