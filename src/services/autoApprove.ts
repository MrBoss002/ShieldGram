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
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || "User";
    const groupTitle = ctx.chat.title || "the group";

    // Approve the chat join request natively
    await api.approveChatJoinRequest(groupId, userId);

    if (sendWelcomePm) {
      // 1. Fetch Group Settings from Database
      const config = await GroupConfig.findOne({ groupId });
      const welcomeConfig = config?.features?.welcome;

      // 2. Prepare Welcome Text & Placeholders
      let welcomeText = welcomeConfig?.message?.trim();

      if (welcomeText) {
        // Dynamic placeholder replacements
        welcomeText = welcomeText
          .replace(/{name}/g, firstName)
          .replace(/{title}/g, groupTitle);
      } else {
        // Fallback Default Message
        welcomeText = `👋 Hello <b>${firstName}</b>!\n\n😊 Your request to join <b>${groupTitle}</b> has been automatically approved! ✅\n\n Welcome to the community!\n\nIf you like you can also use me in you'r group... Click the /start and let's Go 🤩`;
      }

      // 3. Parse Custom Buttons
      const keyboard = parseWelcomeButtons(welcomeConfig?.buttons);

      // 4. Send Image (if set) or Text Message
      if (welcomeConfig?.mediaUrl) {
        await api
          .sendPhoto(userId, welcomeConfig.mediaUrl, {
            caption: welcomeText,
            parse_mode: "HTML",
            reply_markup: keyboard,
          })
          .catch(() => {});
      } else {
        await api
          .sendMessage(userId, welcomeText, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          })
          .catch(() => {});
      }
    }
  } catch (error) {
    console.error("[AutoApprove Service Error]:", error);
  }
};
