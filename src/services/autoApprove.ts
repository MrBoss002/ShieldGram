import { Api, InlineKeyboard } from "grammy";
import { GroupConfig } from "../models/GroupConfig";

// Helper function to parse custom buttons format: [Text](url) | [Text2](url)
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

export const handleAutoApprove = async (
  api: Api,
  ctx: any,
  sendWelcomePm: boolean
): Promise<void> => {
  try {
    // Robustly extract chat and user from either direct context or chatJoinRequest payload
    const chat = ctx.chat || ctx.chatJoinRequest?.chat;
    const user = ctx.from || ctx.chatJoinRequest?.from;

    if (!chat || !user) {
      console.error("[AutoApprove Error]: Chat or User object is missing in context.");
      return;
    }

    const groupId = chat.id;
    const userId = user.id;
    const firstName = user.first_name || "User";
    const username = user.username;
    const groupTitle = chat.title || "the group";

    // 1. CRITICAL: Approve the chat join request natively first
    if (typeof ctx.approveChatJoinRequest === "function") {
      await ctx.approveChatJoinRequest();
    } else {
      await api.approveChatJoinRequest(groupId, userId);
    }

    // 2. Process PM Welcome Message (Isolated so it never blocks approval)
    if (sendWelcomePm) {
      const config = await GroupConfig.findOne({ groupId });
      const welcomeConfig = config?.features?.welcome;

      let welcomeText = welcomeConfig?.message?.trim();

      if (welcomeText) {
        // Universal tag replacements
        welcomeText = welcomeText
          .replace(/{MENTION}/gi, `<a href="tg://user?id=${userId}">${firstName}</a>`)
          .replace(/{(FIRSTNAME|NAME|name)}/gi, firstName)
          .replace(/{USERNAME}/gi, username ? `@${username}` : firstName)
          .replace(/{USERID}/gi, userId.toString())
          .replace(/{(GROUPNAME|TITLE|title)}/gi, groupTitle);
      } else {
        // Fallback Default Message
        welcomeText = `👋 Hello <b>${firstName}</b>!\n\n😊 Your request to join <b>${groupTitle}</b> has been automatically approved! ✅\n\nWelcome to the community!\n\nIf you like, you can also use me in your group... Click /start and let's go 🤩`;
      }

      const keyboard = parseWelcomeButtons(welcomeConfig?.buttons);

      // Attempt PM delivery with silent failure catching
      try {
        if (welcomeConfig?.mediaUrl) {
          await api.sendPhoto(userId, welcomeConfig.mediaUrl, {
            caption: welcomeText,
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
        } else {
          await api.sendMessage(userId, welcomeText, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
        }
      } catch (pmError: any) {
        console.log(`[AutoApprove PM Skipped]: Could not message user ${userId} in PM (${pmError.message})`);
      }
    }
  } catch (error) {
    console.error("[AutoApprove Service Error]:", error);
  }
};
