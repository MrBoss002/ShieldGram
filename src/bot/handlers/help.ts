import { Composer, InlineKeyboard } from "grammy";

export const helpHandler = new Composer();

// --- KEYBOARD BUILDERS ---

// 1. Main Help Landing Page Keyboard
const mainHelpKeyboard = new InlineKeyboard()
  .text("⚙️ VIEW TOGGLES", "help_toggles")
  .text("📋 VIEW COMMANDS", "help_commands")
  .row()
  .text("🔙 BACK TO SETUP GUIDE", "help_back_to_guide");

// 2. Back to Help Menu Keyboard
const backToHelpKeyboard = new InlineKeyboard()
  .text("🔙 BACK TO HELP", "help_main");

// --- HANDLERS ---

// Command handler for /help (PM Only)
helpHandler.command("help", async (ctx) => {
  if (ctx.chat.type !== "private") {
    return ctx.reply("ℹ️ Please use the /help command in private chat with me.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }

  const text = 
    "🤖 **ShieldGram Help & Documentation Center**\n\n" +
    "Welcome to the official ShieldGram command and feature guide! Use the interactive buttons below to explore our detailed feature toggles or look up command usages and descriptions.\n\n" +
    "🔹 **Toggle Guide:** Explains all protection switches and management toggles.\n" +
    "🔹 **Command Guide:** Lists utility and moderation commands with their proper syntax.";

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: mainHelpKeyboard,
  });
});

// Callback: Main Help Menu
helpHandler.callbackQuery("help_main", async (ctx) => {
  const text = 
    "🤖 **ShieldGram Help & Documentation Center**\n\n" +
    "Welcome to the official ShieldGram command and feature guide! Use the interactive buttons below to explore our detailed feature toggles or look up command usages and descriptions.\n\n" +
    "🔹 **Toggle Guide:** Explains all protection switches and management toggles.\n" +
    "🔹 **Command Guide:** Lists utility and moderation commands with their proper syntax.";

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
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
    "— If you set a channel using the FSUB CHANNELS button below, users must subscribe to it before sending messages.\n\n" +
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
    "— Triggers emergency lockdown and slow-mode during sudden member join surges to stop raid attacks.\n\n" +
    "📁 <b>MANAGEMENT SUB-MENUS:</b>\n" +
    "• <b>FSUB CHANNELS</b> — Manage forced subscription channel links.\n" +
    "• <b>WELCOME MSG</b> — Customize greeting texts for new members.\n" +
    "• <b>RULES TEXT</b> — Set and display group community rules.\n" +
    "• <b>WORD BLACKLIST</b> — Manage banned words and filtered terms.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});

// Callback: Commands Guide Page
helpHandler.callbackQuery("help_commands", async (ctx) => {
  const text = 
    "<b>📋 SHIELDGRAM COMMANDS GUIDE</b>\n\n" +
    "<b>🛠️ General & Utility Commands:</b>\n\n" +
    "<b>🔹 /start :</b>\n" +
    "— Opens the bot's main welcome dashboard and setup buttons in private chat.\n\n" +
    "<b>🔸 /config :</b>\n" +
    "— Opens the group configuration dashboard to toggle features and manage settings.\n\n" +
    "<b>🔹 /help :</b>\n" +
    "— Displays this interactive guide menu with feature explanations and command usages.\n\n" +
    "<b>🔸 /infou, /infog, /infoc :</b>\n" +
    "— Sub-commands for info: /infou (User info), /infog (Group info), /infoc (Channel info).\n\n" +
    "<b>🔹 /setgpp :</b>\n" +
    "— Configures or updates the group profile picture settings.\n\n" +
    "<b>🔸 /purge :</b>\n" +
    "— Bulk deletes a large number of messages quickly to clean up the chat.\n\n" +
    "<b>🔹 /pin :</b>\n" +
    "— Pins a replied message to the top of the group chat.\n\n" +
    "<b>🔸 /unpinall :</b>\n" +
    "— Clears and unpins all pinned messages in the chat at once.\n\n" +
    "<b>🔹 /save :</b>\n" +
    "— Saves custom text, media, or notes for quick retrieval later.\n\n" +
    "<b>🔸 /rule :</b>\n" +
    "— Displays the community rules configured for the group.\n\n\n" +
    "<b>⚖️ Moderation Commands:</b>\n\n" +
    "<b>🔹 /warn [reply/@id] [reason] :</b>\n" +
    "— Issues a warning strike to a user. Reaching 3 strikes triggers an automatic mute.\n\n" +
    "<b>🔸 /unwarn [reply/@id] :</b>\n" +
    "— Removes the latest warning strike from a user's record.\n\n" +
    "<b>🔹 /mute [reply/@id] [reason] :</b>\n" +
    "— Instantly restricts a user from sending messages, media, or links in the group.\n\n" +
    "<b>🔸 /unmute [reply/@id] :</b>\n" +
    "— Restores messaging privileges back to a muted user.\n\n" +
    "<b>🔹 /kick [reply/@id] [reason] :</b>\n" +
    "— Removes a user from the group immediately while allowing them to rejoin via link.\n\n" +
    "<b>🔸 /ban [reply/@id] [reason] :</b>\n" +
    "— Permanently bans a user from the group so they cannot rejoin.\n\n" +
    "<b>🔹 /unban [user_id] :</b>\n" +
    "— Lifts a permanent ban by user ID to allow them back into the group.";

  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: backToHelpKeyboard,
  });
  await ctx.answerCallbackQuery();
});
