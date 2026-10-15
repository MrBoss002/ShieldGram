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
      | "AWAITING_WELCOME_BUTTONS"
      | "AWAITING_BANNED_WORDS";
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

// 1. STREAMLINED MAIN DASHBOARD KEYBOARD
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
      `ANTI-BIO LINK: ${f.antiBioLink?.enabled ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_antiBioLink_${config.groupId}`
    )
    .row()
    .text("📢 FSUB CHANNELS", `manage_fsub_${config.groupId}`)
    .row()
    .text("📝 WELCOME MSG", `edit_welcome_${config.groupId}`)
    .text("📜 RULES TEXT", `edit_rules_${config.groupId}`)
    .row()
    .text("🤬 WORD BLACKLIST", `edit_blacklist_${config.groupId}`);
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

// 3. WELCOME MENU BUILDER (WITH INTEGRATED TOGGLE)
const buildWelcomeMenuKeyboard = (config: any) => {
  const groupId = config.groupId;
  const isWelcomeOn = config.features?.welcome?.enabled;

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
    .text("👁‍🗨 PREVIEW", `prev_welcomeAll_${groupId}`)
    .text(isWelcomeOn ? "🟢 WELCOME: ON" : "🔴 WELCOME: OFF", `toggle_welcome_${groupId}`)
    .row()
    .text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);
};

// 4. RULES MENU BUILDER (WITH INTEGRATED TOGGLE)
const buildRulesMenuKeyboard = (config: any) => {
  const groupId = config.groupId;
  const isRulesOn = config.features?.rules?.enabled;

  return new InlineKeyboard()
    .text("👁‍🗨 PREVIEW", `prev_rules_${groupId}`)
    .text("🗑️ DELETE", `del_rules_${groupId}`)
    .row()
    .text(isRulesOn ? "🟢 RULES CMD: ON" : "🔴 RULES CMD: OFF", `toggle_rules_${groupId}`)
    .row()
    .text("🔙 BACK TO DASHBOARD", `open_config_${groupId}`);
};

// 5. WORD BLACKLIST MENU BUILDER (WITH INTEGRATED TOGGLE)
const buildBlacklistMenuKeyboard = (config: any) => {
  const groupId = config.groupId;
  const isBlacklistOn = config.features?.wordBlacklist?.enabled;

  return new InlineKeyboard()
    .text("➕ ADD WORDS", `add_blacklist_words_${groupId}`)
    .text("🗑️ CLEAR LIST", `clear_blacklist_${groupId}`)
    .row()
    .text("📜 VIEW LIST", `view_blacklist_${groupId}`)
    .text(isBlacklistOn ? "🟢 BANNED WORDS: ON" : "🔴 BANNED WORDS: OFF", `toggle_wordBlacklist_${groupId}`)
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

// Feature Toggles (Handles Dashboard & Sub-Menu Toggles)
adminHandler.callbackQuery(
  /^toggle_(autoApprove|captcha|cleanAlerts|forceSub|welcome|rules|antiLink|antiWeblink|antiForward|antiBioLink|wordBlacklist)_(-?\d+)$/,
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
        case "antiBioLink": config.features.antiBioLink.enabled = !config.features.antiBioLink.enabled; break;
        case "wordBlacklist": config.features.wordBlacklist.enabled = !config.features.wordBlacklist.enabled; break;
      }
    }

    await config.save();

    try {
      // Update keyboard depending on where the toggle was pressed
      if (featureKey === "welcome") {
        await ctx.editMessageReplyMarkup({ reply_markup: buildWelcomeMenuKeyboard(config) });
      } else if (featureKey === "rules") {
        await ctx.editMessageReplyMarkup({ reply_markup: buildRulesMenuKeyboard(config) });
      } else if (featureKey === "wordBlacklist") {
        await ctx.editMessageReplyMarkup({ reply_markup: buildBlacklistMenuKeyboard(config) });
      } else {
        await ctx.editMessageReplyMarkup({ reply_markup: buildDashboardKeyboard(config) });
      }
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
    `👋 <b>Welcome Message Customization</b>\n\n` +
    `🖼 IMAGE: ${hasImg ? "✅" : "❎"}\n` +
    `📝 TEXT: ${hasTxt ? "✅" : "❎"}\n` +
    `🔘 BUTTONS: ${hasBtn ? "✅" : "❎"}\n\n` +
    `Configure greeting messages, media, and interactive buttons for new members joining your group.`;

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
    `👋 <b>Welcome Message Customization</b>\n\n` +
    `🖼 IMAGE: ${hasImg ? "✅" : "❎"}\n` +
    `📝 TEXT: ${hasTxt ? "✅" : "❎"}\n` +
    `🔘 BUTTONS: ${hasBtn ? "✅" : "❎"}\n\n` +
    `Configure greeting messages, media, and interactive buttons for new members joining your group.`;

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
  
  const welcomePromptText =
    `📝 <b>Send your new welcome greeting text:</b>\n\n` +
    `You can use markdown format in your text. Use these placeholders where needed:\n\n` +
    `• <code>{MENTION}</code> - Mention user\n` +
    `• <code>{FIRSTNAME}</code> - User's first name\n` +
    `• <code>{USERNAME}</code> - User's username\n` +
    `• <code>{USERID}</code> - User's ID\n` +
    `• <code>{GROUPNAME}</code> - Group name`;

  await ctx.editMessageText(welcomePromptText, {
    parse_mode: "HTML",
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
    `📜 <b>Group Rules & Regulations Setup</b>\n\n` +
    `Send your group rules below. You can use standard markdown formatting for your regulations.`;

  await ctx.editMessageText(rulesGuideText, {
    parse_mode: "HTML",
    reply_markup: buildRulesMenuKeyboard(await GroupConfig.findOne({ groupId })),
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
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: buildRulesMenuKeyboard(config) });
  } catch {}
});

// --- WORD BLACKLIST MANAGEMENT FLOW ---
adminHandler.callbackQuery(/^edit_blacklist_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Config not found!" });

  const menuText =
    `🚫 <b>Word Blacklist Settings</b>\n\n` +
    `Automatically detect and delete messages containing restricted words, profanity, or prohibited terms to keep your group clean.`;

  await ctx.editMessageText(menuText, {
    parse_mode: "HTML",
    reply_markup: buildBlacklistMenuKeyboard(config),
  });
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^add_blacklist_words_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  adminStates.set(ctx.from.id, { action: "AWAITING_BANNED_WORDS", groupId });

  await ctx.editMessageText(
    `➕ <b>Add Banned Words</b>\n\n` +
      `Send the word or words you want to add. You can send multiple words separated by commas (e.g., <code>word1, badword2, scam link</code>):`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🔙 BACK", `edit_blacklist_${groupId}`),
    }
  );
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^view_blacklist_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery();

  const words = config.features?.wordBlacklist?.words || [];

  if (words.length === 0) {
    return ctx.answerCallbackQuery({ text: "ℹ️ No blacklisted words configured yet.", show_alert: true });
  }

  const formattedList = words.map((w, index) => `${index + 1}. <code>${w}</code>`).join("\n");

  await ctx.reply(`📜 <b>Active Banned Words List (${words.length}):</b>\n\n${formattedList}`, {
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery();
});

adminHandler.callbackQuery(/^clear_blacklist_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  if (!(await checkIsAdmin(ctx, groupId, ctx.from.id))) return;

  const config = await GroupConfig.findOne({ groupId });
  if (config) {
    config.features.wordBlacklist.words = [];
    config.features.wordBlacklist.enabled = false;
    await config.save();
  }

  await ctx.answerCallbackQuery({ text: "🗑️ Banned words list cleared successfully!", show_alert: true });

  try {
    await ctx.editMessageReplyMarkup({ reply_markup: buildBlacklistMenuKeyboard(config) });
  } catch {}
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
  const backBlacklist = new InlineKeyboard().text("🔙 BACK TO BLACKLIST MENU", `edit_blacklist_${groupId}`);

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
    // Preserve native entities/formatting sent by admin
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
      reply_markup: new InlineKeyboard().text("🔙 BACK TO RULES MENU", `edit_rules_${groupId}`),
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

  if (action === "AWAITING_BANNED_WORDS") {
    const rawInput = ctx.message.text || "";
    if (!rawInput.trim()) {
      return ctx.reply("❌ Please send valid words to add.");
    }

    // Split input by commas, hyphens, or newlines and clean them up
    const newWords = rawInput
      .split(/[\, \n\-]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (newWords.length === 0) {
      return ctx.reply("❌ No valid words detected. Try again.");
    }

    // Merge without duplicates
    const existingWords = config.features.wordBlacklist.words || [];
    const mergedWords = Array.from(new Set([...existingWords, ...newWords]));

    config.features.wordBlacklist.words = mergedWords;
    config.features.wordBlacklist.enabled = true; // Auto-enable when words are added
    await config.save();
    adminStates.delete(ctx.from.id);

    return ctx.reply(
      `✅ <b>Successfully added ${newWords.length} new word(s)!</b>\nTotal blacklisted words: <b>${mergedWords.length}</b>`,
      {
        parse_mode: "HTML",
        reply_markup: backBlacklist,
      }
    );
  }

  return next();
});
