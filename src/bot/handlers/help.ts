import { Composer, InlineKeyboard } from "grammy";

export const helpHandler = new Composer();

// --- KEYBOARD BUILDERS ---

// 1. Main Help Landing Page Keyboard (2x2 Grid)
const mainHelpKeyboard = new InlineKeyboard()
  .text("⚙️ TOGGLES", "help_toggles")
  .text("🛠️ SETUP", "help_setup")
  .row()
  .text("📋 COMMANDS", "help_commands")
  .text("🛡️ MODS", "help_mods")
  .row()
  .text("🔙 BACK TO SETUP GUIDE", "nav_help");

// 2. Back to Help Menu Keyboard
const backToHelpKeyboard = new InlineKeyboard()
  .text("🔙 BACK TO HELP", "help_main");

// --- HELPER FUNCTION FOR LANDING TEXT ---
const getLandingText = () =>
  "🤖 <b>ShieldGram Help & Documentation Center</b>\n\n" +
  "<i>Welcome to the official ShieldGram command and feature guide! Use the interactive buttons below to explore our feature toggles, setup configurations, utility commands, and moderation suite.</i>\n\n" +
  "🔹 <b>Toggles:</b> Protection switches & defense toggles.\n\n" +
  "🔹 <b>Setup:</b> Group configuration & management menus.\n\n" +
  "🔹 <b>Commands:</b> Utility & general command syntax.\n\n" +
  "🔹 <b>Mods:</b> Administrative & moderation commands.";

// --- HANDLERS ---

// Command handler for /help (PM Only)
helpHandler.command("help", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply("ℹ️ Please use the /help command in private chat with me.", {
      reply_parameters: ctx.message ? { message_id: ctx.message.message_id } : undefined,
    });
  }

  await ctx.reply(getLandingText(), {
    parse_mode: "HTML",
    reply_markup: mainHelpKeyboard,
  });
});

// Callback: Main Help Menu
helpHandler.callbackQuery("help_main", async (ctx) => {
  await ctx.editMessageText(getLandingText(), {
    parse_mode: "HTML",
    reply_markup: mainHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});

// Callback: Toggles Guide Page
helpHandler.callbackQuery("help_toggles", async (ctx) => {
  const text = 
    "<b>⚙️ SHIELDGRAM TOGGLES GUIDE</b>\n\n" +
    "<b>🔹 AUTO APPROVE :</b>\n" +
    "— By turning on this button, ShieldGram will automatically approve pending join requests to the group.\n\n" +
    "<b>🔸 FORCE-SUB :</b>\n" +
    "— If you set a channel using the FSUB CHANNELS button, users must subscribe to it before sending messages.\n\n" +
    "<b>🔹 CLEAN ALERT :</b>\n" +
    "— Automatically deletes the bot's warning and moderation alert messages after a short time to keep the chat clean.\n\n" +
    "<b>🔸 CLEAN CMD :</b>\n" +
    "— Automatically deletes command messages sent by users in the group to reduce chat clutter.\n\n" +
    "<b>🔹 ANTI-LINK :</b>\n" +
    "— Blocks and removes messages containing general hyperlinks sent by non-admin users.\n\n" +
    "<b>🔸 ANTI-WEBLINK :</b>\n" +
    "— Blocks specific external web URLs and website links from being posted in the group.\n\n" +
    "<b>🔹 ANTI-FORWARD :</b>\n" +
    "— Restricts users from forwarding messages directly into the group.\n\n" +
    "<b>🔸 ANTI-BIO LINK :</b>\n" +
    "— Detects and restricts users who have external links or ads in their Telegram bio profile.\n\n" +
    "<b>🔹 ANTI SPAM :</b>\n" +
    "— Protects the group by catching rapid-fire flood messages and long text spam.\n\n" +
    "<b>🔸 ANTI-BOT :</b>\n" +
    "— Automatically kicks or blocks unauthorized or suspicious bots added to the group.\n\n" +
    "<b>🔹 ANTI QUOTE :</b>\n" +
    "— Restricts quoting or forwarding content from external channels, groups, or bots.\n\n" +
    "<b>🔸 ANTI-RAID :</b>\n" +
    "— Triggers emergency lockdown and slow-mode during sudden member join surges to stop raid attacks.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});

// Callback: Setup Guide Page
helpHandler.callbackQuery("help_setup", async (ctx) => {
  const text = 
    "<b>🛠️ SHIELDGRAM SETUP & MANAGEMENT GUIDE</b>\n\n" +
    "<b>🔹 FSUB CHANNELS :</b>\n" +
    "— Manage forced subscription channel links. Add or remove channels that users must join before chatting in the group.\n\n" +
    "<b>🔸 WELCOME MSG :</b>\n" +
    "— Customize dynamic greeting texts, media headers, and interactive buttons for welcoming new group members.\n\n" +
    "<b>🔹 RULES TEXT :</b>\n" +
    "— Set and configure community rules that can be displayed anytime using the /rule command.\n\n" +
    "<b>🔸 WORD BLACKLIST :</b>\n" +
    "— Manage custom banned words and bad language filters to automatically purge filtered terms.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});

// Callback: Commands Guide Page (Utility & General)
helpHandler.callbackQuery("help_commands", async (ctx) => {
  const text = 
    "<b>📋 SHIELDGRAM UTILITY COMMANDS GUIDE</b>\n\n" +
    "<b>🔹 /start :</b>\n" +
    "— Opens the bot's main welcome dashboard and setup buttons in private chat.\n\n" +
    "<b>🔸 /config :</b>\n" +
    "— Opens the group configuration dashboard to toggle features and manage settings.\n\n" +
    "<b>🔹 /help :</b>\n" +
    "— Displays this interactive guide menu with feature explanations and command usages.\n\n" +
    "<b>🔸 /info :</b>\n" +
    "— Sub-commands for info: /infou (User info), /infog (Group info), /infoc (Channel info).\n\n" +
    "<b>🔹 /setgpp :</b>\n" +
    "— Configures or updates the group profile picture settings.\n\n" +
    "<b>🔸 /pin :</b>\n" +
    "— Pins a replied message to the top of the group chat.\n\n" +
    "<b>🔹 /unpinall :</b>\n" +
    "— Clears and unpins all pinned messages in the chat at once.\n\n" +
    "<b>🔸 /save :</b>\n" +
    "— Saves custom text, media, or notes for quick retrieval later.\n\n" +
    "<b>🔹 /rule :</b>\n" +
    "— Displays the community rules configured for the group.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});

// Callback: Mods Guide Page (Admin & Moderation)
helpHandler.callbackQuery("help_mods", async (ctx) => {
  const text = 
    "<b>🛡️ SHIELDGRAM MODERATION COMMANDS GUIDE</b>\n\n" +
    "<b>🔹 /purge :</b>\n" +
    "— Bulk deletes a large number of messages quickly from a replied message onward to clean up the chat.\n\n" +
    "<b>🔸 /warn [reply/@id] [reason] :</b>\n" +
    "— Issues a warning strike to a user. Reaching 3 strikes triggers an automatic mute.\n\n" +
    "<b>🔹 /unwarn [reply/@id] :</b>\n" +
    "— Removes the latest warning strike from a user's record.\n\n" +
    "<b>🔸 /mute [reply/@id] [reason] :</b>\n" +
    "— Instantly restricts a user from sending messages, media, or links in the group.\n\n" +
    "<b>🔹 /unmute [reply/@id] :</b>\n" +
    "— Restores messaging privileges back to a muted user.\n\n" +
    "<b>🔸 /kick [reply/@id] [reason] :</b>\n" +
    "— Removes a user from the group immediately while allowing them to rejoin via link.\n\n" +
    "<b>🔹 /ban [reply/@id] [reason] :</b>\n" +
    "— Permanently bans a user from the group so they cannot rejoin.\n\n" +
    "<b>🔸 /unban [user_id] :</b>\n" +
    "— Lifts a permanent ban by user ID to allow them back into the group.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});
