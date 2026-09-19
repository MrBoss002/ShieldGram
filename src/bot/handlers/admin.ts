import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const adminHandler = new Composer();

// Update this to your actual support group link
const SUPPORT_GROUP_URL = "https://t.me/MrBossSupport";

// Memory storage to track active admin editing sessions
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

// Utility: Check if user is an admin in the group
async function checkIsAdmin(ctx: any, groupId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(groupId, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

// Utility: Render Main Dashboard Keyboard
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

// Utility: Render Welcome Sub-menu Keyboard
const buildWelcomeMenuKeyboard = (config: any) => {
  const groupId = config.groupId;
  const welcome = config.features.welcome;
  const isPicOn = welcome.mediaEnabled && welcome.mediaUrl;

  return new InlineKeyboard()
    .text(
      `Welcome Pic: ${isPicOn ? "🟢 ON" : "🔴 OFF"}`,
      `toggle_welcomePic_${groupId}`
    )
    .row()
    .text("🖼️ Set Welcome Image", `set_welcomePic_${groupId}`)
    .row()
    .text("📝 Edit Text", `set_welcomeText_${groupId}`)
    .text("🔘 Edit Buttons", `set_welcomeButtons_${groupId}`)
    .row()
    .text("⚙️ Back to Dashboard", `open_config_${groupId}`);
};

// Command: /config in Group
adminHandler.command("config", async (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return ctx.reply("❌ The `/config` command can only be used inside groups.");
  }

  const member = await ctx.getChatMember(ctx.from!.id);
  if (!["creator", "administrator"].includes(member.status)) {
    return ctx.reply("⚠️ You do not have permission to do this! Only group admins can configure ShieldGram.");
  }

  const groupId = ctx.chat.id;

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
    `👋 **Thank you for using ShieldGram in ${ctx.chat.title}!**\n\n` +
      `⚡ **Important:** Make sure to give me **Admin permissions** so all security features work properly.\n\n` +
      `⚙️ If you are an Admin, click the button below to open your configuration dashboard in PM:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// Render PM Dashboard
adminHandler.callbackQuery(/^open_config_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const userId = ctx.from.id;

  const isAdmin = await checkIsAdmin(ctx, groupId, userId);
  if (!isAdmin) {
    return ctx.answerCallbackQuery({
      text: "⚠️ You do not have permission to configure this group!",
      show_alert: true,
    });
  }

  adminStates.delete(userId);

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

// Feature Toggle Callback Handler (With Smart Validation Popups)
adminHandler.callbackQuery(
  /^toggle_(autoApprove|captcha|cleanAlerts|forceSub|welcome|rules)_(-?\d+)$/,
  async (ctx) => {
    const featureKey = ctx.match[1];
    const groupId = parseInt(ctx.match[2]);
    const userId = ctx.from.id;

    const isAdmin = await checkIsAdmin(ctx, groupId, userId);
    if (!isAdmin) {
      return ctx.answerCallbackQuery({
        text: "⚠️ Permission denied!",
        show_alert: true,
      });
    }

    const config = await GroupConfig.findOne({ groupId });
    if (!config) return ctx.answerCallbackQuery({ text: "Group config not found!" });

    // Prevent turning ON empty settings
    if (featureKey === "forceSub" && !config.features.forceSub.enabled) {
      if (!config.features.forceSub.channels || config.features.forceSub.channels.length === 0) {
        return ctx.answerCallbackQuery({
          text: "⚠️ Please set up a Force-Sub channel first using the 'Manage Force-Sub' button below!",
          show_alert: true,
        });
      }
    }

    if (featureKey === "rules" && !config.features.rules.enabled) {
      if (!config.features.rules.text) {
        return ctx.answerCallbackQuery({
          text: "⚠️ Please set your group rules first using the 'Edit Rules Text' button below!",
          show_alert: true,
        });
      }
    }

    // Toggle values
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
  }
);

// -------------------------------------------------------------
// 1. MANAGE FORCE-SUB FLOW
// -------------------------------------------------------------
adminHandler.callbackQuery(/^manage_fsub_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  await ctx.answerCallbackQuery();
  adminStates.set(ctx.from.id, {
    action: "AWAITING_FSUB_FORWARD",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  const keyboard = new InlineKeyboard().text("⚙️ Back to Dashboard", `open_config_${groupId}`);

  await ctx.editMessageText(
    `📢 **Manage Force-Sub Channel**\n\n` +
      `To configure channel subscription verification:\n` +
      `1. Add me to your channel as an **Admin** with *Invite Users* permission.\n` +
      `2. **Forward any post/message** from that channel into this chat.\n\n` +
      `⏳ Waiting for your forwarded channel message...`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// -------------------------------------------------------------
// 2. EDIT RULES TEXT FLOW
// -------------------------------------------------------------
adminHandler.callbackQuery(/^edit_rules_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  await ctx.answerCallbackQuery();
  adminStates.set(ctx.from.id, {
    action: "AWAITING_RULES_TEXT",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  const keyboard = new InlineKeyboard().text("⚙️ Back to Dashboard", `open_config_${groupId}`);

  await ctx.editMessageText(
    `📜 **Group Rules Setup Menu**\n\n` +
      `Send your chat guidelines below. You can use standard Telegram Markdown styling:\n` +
      `• \`*Bold Text*\` ➔ *Bold*\n` +
      `• \`_Italic Text_\` ➔ _Italic_\n` +
      `• \`[Link Text](https://...)\` ➔ Clickable Link\n\n` +
      `**Example Rules Template:**\n` +
      `\`1. Respect all members.\n2. No spam or referral links.\n3. Follow admin guidance.\`\n\n` +
      `✏️ Please reply with your new group rules text:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// -------------------------------------------------------------
// 3. WELCOME MESSAGE CUSTOMIZATION MENU
// -------------------------------------------------------------
adminHandler.callbackQuery(/^edit_welcome_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) {
    return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });
  }

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Group config not found!" });

  await ctx.editMessageText(
    `👋 **Welcome Message Customization**\n\n` +
      `Customize how new members are greeted when joining your group! Toggle image attachments, or update text and custom inline buttons.\n\n` +
      `Current Welcome Text:\n> _${config.features.welcome.message || "Default Welcome Message"}_`,
    {
      parse_mode: "Markdown",
      reply_markup: buildWelcomeMenuKeyboard(config),
    }
  );
  await ctx.answerCallbackQuery();
});

// Welcome Image Toggle
adminHandler.callbackQuery(/^toggle_welcomePic_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });

  const config = await GroupConfig.findOne({ groupId });
  if (!config) return ctx.answerCallbackQuery({ text: "Config not found!" });

  if (!config.features.welcome.mediaUrl) {
    return ctx.answerCallbackQuery({
      text: "⚠️ Please upload a welcome image first using 'Set Welcome Image'!",
      show_alert: true,
    });
  }

  config.features.welcome.mediaEnabled = !config.features.welcome.mediaEnabled;
  await config.save();

  await ctx.editMessageReplyMarkup({ reply_markup: buildWelcomeMenuKeyboard(config) });
  await ctx.answerCallbackQuery({ text: "Updated welcome media toggle!" });
});

// Set Welcome Image Prompt
adminHandler.callbackQuery(/^set_welcomePic_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });

  await ctx.answerCallbackQuery();
  adminStates.set(ctx.from.id, {
    action: "AWAITING_WELCOME_PIC",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  const keyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);

  await ctx.editMessageText(
    `🖼️ **Set Welcome Image**\n\n` +
      `Please send an image photo below (File size must be under 1MB).\n\n` +
      `⏳ Waiting for image upload...`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// Edit Welcome Text Prompt
adminHandler.callbackQuery(/^set_welcomeText_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });

  await ctx.answerCallbackQuery();
  adminStates.set(ctx.from.id, {
    action: "AWAITING_WELCOME_TEXT",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  const keyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);

  await ctx.editMessageText(
    `📝 **Edit Welcome Text**\n\n` +
      `Send your new welcome greeting. You can use dynamic variables:\n` +
      `• \`{MENTION}\` ➔ Mentions the new user\n` +
      `• \`{GROUPNAME}\` ➔ Mentions the group name\n\n` +
      `**Example:**\n` +
      `\`Welcome {MENTION} to {GROUPNAME}! Please read the rules before chatting.\`\n\n` +
      `✏️ Reply with your welcome message text:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// Edit Welcome Custom Buttons Prompt
adminHandler.callbackQuery(/^set_welcomeButtons_(-?\d+)$/, async (ctx) => {
  const groupId = parseInt(ctx.match[1]);
  const isAdmin = await checkIsAdmin(ctx, groupId, ctx.from.id);

  if (!isAdmin) return ctx.answerCallbackQuery({ text: "⚠️ Permission denied!", show_alert: true });

  await ctx.answerCallbackQuery();
  adminStates.set(ctx.from.id, {
    action: "AWAITING_WELCOME_BUTTONS",
    groupId,
    dashboardMessageId: ctx.callbackQuery.message?.message_id,
  });

  const keyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);

  await ctx.editMessageText(
    `🔘 **Edit Custom Welcome Buttons**\n\n` +
      `Send your button links using the following clean layout format:\n\n` +
      `**Same Row Buttons (Split with \`|\`):**\n` +
      `\`[Channel](https://t.me/mychannel) | [Rules](https://t.me/myrules)\`\n\n` +
      `**Stacked Line Buttons (New Lines):**\n` +
      `\`[Website](https://example.com)\`\n` +
      `\`[Support](https://t.me/mysupport)\`\n\n` +
      `✏️ Send your button links structure below:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// -------------------------------------------------------------
// 4. CENTRAL INPUT LISTENER (Handles Forwards, Texts, Photos)
// -------------------------------------------------------------
adminHandler.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private") return next();

  const userState = adminStates.get(ctx.from.id);
  if (!userState) return next();

  const { action, groupId, dashboardMessageId } = userState;
  const config = await GroupConfig.findOne({ groupId });

  if (!config) {
    adminStates.delete(ctx.from.id);
    return ctx.reply("❌ Group configuration record not found.");
  }

  // Common Keyboards
  const successKeyboard = new InlineKeyboard().text("⚙️ Back to Dashboard", `open_config_${groupId}`);
  const errorKeyboard = new InlineKeyboard()
    .text("⚙️ Back to Dashboard", `open_config_${groupId}`)
    .url("💬 Support Group", SUPPORT_GROUP_URL);

  // A. HANDLE FORCE-SUB FORWARDED POST
  if (action === "AWAITING_FSUB_FORWARD") {
    const forwardedChat = ctx.message.forward_from_chat;

    if (!forwardedChat || forwardedChat.type !== "channel") {
      return ctx.reply(
        "❌ **Invalid Forward!**\nPlease make sure you are forwarding a message directly from your target **Channel**.",
        { parse_mode: "Markdown", reply_markup: errorKeyboard }
      );
    }

    try {
      // Verify bot admin permissions in the channel
      const botMember = await ctx.api.getChatMember(forwardedChat.id, ctx.me.id);
      if (!["administrator", "creator"].includes(botMember.status)) {
        return ctx.reply(
          `❌ **Verification Failed!**\nI am not an admin in **${forwardedChat.title}**. Please promote me to Admin with *Invite Users* permission and try again.`,
          { parse_mode: "Markdown", reply_markup: errorKeyboard }
        );
      }

      const channelRef = forwardedChat.username ? `@${forwardedChat.username}` : `${forwardedChat.id}`;
      config.features.forceSub.channels = [channelRef];
      config.features.forceSub.enabled = true;
      await config.save();

      adminStates.delete(ctx.from.id);

      const msgText = `✅ **Force-Sub Channel Connected Successfully!**\n\nTarget Channel: **${forwardedChat.title}** (\`${channelRef}\`)`;
      if (dashboardMessageId) {
        await ctx.api.editMessageText(ctx.chat.id, dashboardMessageId, msgText, {
          parse_mode: "Markdown",
          reply_markup: successKeyboard,
        });
        return ctx.reply("✅ Channel updated successfully!");
      }
      return ctx.reply(msgText, { parse_mode: "Markdown", reply_markup: successKeyboard });
    } catch {
      return ctx.reply(
        `❌ **Verification Failed!**\nMake sure I am added as an Admin in the channel.`,
        { parse_mode: "Markdown", reply_markup: errorKeyboard }
      );
    }
  }

  // B. HANDLE RULES TEXT
  if (action === "AWAITING_RULES_TEXT") {
    const rulesInput = ctx.message.text;
    if (!rulesInput) {
      return ctx.reply("❌ Rules content must be valid text.", { reply_markup: errorKeyboard });
    }

    config.features.rules.text = rulesInput;
    config.features.rules.enabled = true;
    await config.save();
    adminStates.delete(ctx.from.id);

    const msgText = "✅ **Group Rules Saved Successfully!**";
    if (dashboardMessageId) {
      await ctx.api.editMessageText(ctx.chat.id, dashboardMessageId, msgText, {
        parse_mode: "Markdown",
        reply_markup: successKeyboard,
      });
      return ctx.reply("✅ Rules updated successfully!");
    }
    return ctx.reply(msgText, { parse_mode: "Markdown", reply_markup: successKeyboard });
  }

  // C. HANDLE WELCOME TEXT
  if (action === "AWAITING_WELCOME_TEXT") {
    const welcomeText = ctx.message.text;
    if (!welcomeText) {
      return ctx.reply("❌ Welcome greeting must be text.", { reply_markup: errorKeyboard });
    }

    config.features.welcome.message = welcomeText;
    await config.save();
    adminStates.delete(ctx.from.id);

    const welcomeKeyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);
    return ctx.reply("✅ **Welcome message text updated!**", { reply_markup: welcomeKeyboard });
  }

  // D. HANDLE WELCOME IMAGE
  if (action === "AWAITING_WELCOME_PIC") {
    const photo = ctx.message.photo;
    if (!photo || photo.length === 0) {
      return ctx.reply("❌ Please send a valid image photo.", { reply_markup: errorKeyboard });
    }

    const largestPhoto = photo[photo.length - 1];
    if (largestPhoto.file_size && largestPhoto.file_size > 1024 * 1024) {
      return ctx.reply("❌ Photo size is too large! Please send an image under 1MB.", { reply_markup: errorKeyboard });
    }

    config.features.welcome.mediaUrl = largestPhoto.file_id;
    config.features.welcome.mediaEnabled = true;
    await config.save();
    adminStates.delete(ctx.from.id);

    const welcomeKeyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);
    return ctx.reply("✅ **Welcome image set successfully!**", { reply_markup: welcomeKeyboard });
  }

  // E. HANDLE WELCOME BUTTONS
  if (action === "AWAITING_WELCOME_BUTTONS") {
    const buttonText = ctx.message.text;
    if (!buttonText) {
      return ctx.reply("❌ Custom button configuration must be text format.", { reply_markup: errorKeyboard });
    }

    config.features.welcome.buttons = buttonText;
    await config.save();
    adminStates.delete(ctx.from.id);

    const welcomeKeyboard = new InlineKeyboard().text("🔙 Back to Welcome Menu", `edit_welcome_${groupId}`);
    return ctx.reply("✅ **Custom welcome buttons updated!**", { reply_markup: welcomeKeyboard });
  }

  return next();
});
