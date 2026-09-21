import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const welcomeHandler = new Composer();

/**
 * Helper to parse custom button strings into a gramY InlineKeyboard object.
 *
 * Supported formats:
 * - Single button: [Google](https://google.com)
 * - Multiple buttons in one row (separated by |): [Google](https://google.com) | [Support](https://t.me/support)
 * - Multiple rows (separated by newlines):
 *   [Google](https://google.com) | [Support](https://t.me/support)
 *   [Channel](https://t.me/mychannel)
 */
export function parseCustomButtons(buttonString: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  if (!buttonString || !buttonString.trim()) return keyboard;

  const rows = buttonString.split("\n");

  rows.forEach((row) => {
    const buttons = row.split("|");
    let hasAddedButtonInRow = false;

    buttons.forEach((btn) => {
      const match = btn.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, text, url] = match;
        const cleanText = text.trim();
        const cleanUrl = url.trim();

        if (cleanText && (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("tg://"))) {
          keyboard.url(cleanText, cleanUrl);
          hasAddedButtonInRow = true;
        }
      }
    });

    if (hasAddedButtonInRow) {
      keyboard.row();
    }
  });

  return keyboard;
}

// --- WELCOME EVENT LISTENER ---
welcomeHandler.on("chat_member", async (ctx) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;

  // Trigger strictly when a user joins (transitions from "left/kicked" to "member/restricted")
  const wasNotMember = ["left", "kicked"].includes(old_chat_member.status);
  const isNowMember = ["member", "restricted"].includes(new_chat_member.status);

  if (!wasNotMember || !isNowMember) return;

  // Ignore bots joining
  if (new_chat_member.user.is_bot) return;

  const groupId = ctx.chat.id;

  try {
    const config = await GroupConfig.findOne({ groupId });

    // Check if welcome feature is explicitly enabled
    if (!config || !config.features?.welcome?.enabled) return;

    const { message, mediaUrl, buttons } = config.features.welcome;
    const user = new_chat_member.user;

    // Default message fallback if text hasn't been configured yet
    const rawText = message || "👋 Welcome {MENTION} to <b>{GROUPNAME}</b>!";

    // Dynamic tag replacements
    const formattedText = rawText
      .replace(/{MENTION}/g, `<a href="tg://user?id=${user.id}">${user.first_name}</a>`)
      .replace(/{FIRSTNAME}/g, user.first_name)
      .replace(/{USERNAME}/g, user.username ? `@${user.username}` : user.first_name)
      .replace(/{USERID}/g, user.id.toString())
      .replace(/{GROUPNAME}/g, ctx.chat.title || "the group");

    // Parse inline custom buttons
    const keyboard = buttons ? parseCustomButtons(buttons) : new InlineKeyboard();

    // Send photo message with caption if image file_id exists
    if (mediaUrl) {
      await ctx.replyWithPhoto(mediaUrl, {
        caption: formattedText,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      // Send standard text message
      await ctx.reply(formattedText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  } catch (error) {
    console.error("[Welcome Handler Error]:", error);
  }
});
