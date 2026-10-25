import { Api, InlineKeyboard } from "grammy";
import { GroupConfig } from "../models/GroupConfig";

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
    console.log("[AutoApprove Debug]: Triggered for update");

    // Robustly extract chat and user from context or payload
    const chat = ctx.chat || ctx.chatJoinRequest?.chat;
    const user = ctx.from || ctx.chatJoinRequest?.from;

    if (!chat || !user) {
      console.error("[AutoApprove Error]: Missing chat or user object in context!", { 
        hasChat: !!chat, 
        hasUser: !!user, 
        keys: Object.keys(ctx) 
      });
      return;
    }

    const groupId = chat.id;
    const userId = user.id;
    const firstName = user.first_name || "User";
    const username = user.username;
    const groupTitle = chat.title || "the group";

    console.log(`[AutoApprove Debug]: Attempting to approve user ${userId} in group ${groupId}`);

    // 1. Approve the chat join request natively
    if (typeof ctx.approveChatJoinRequest === "function") {
      await ctx.approveChatJoinRequest();
    } else {
      await api.approveChatJoinRequest(groupId, userId);
    }

    console.log(`[AutoApprove Success]: Successfully approved user ${userId} in group ${groupId}`);

    // 2. Process PM Welcome Message if enabled
    if (sendWelcomePm) {
      console.log("[AutoApprove Debug]: Fetching group config for welcome PM...");
      const config = await GroupConfig.findOne({ groupId });
      const welcomeConfig = config?.features?.welcome;

      let welcomeText = welcomeConfig?.message?.trim();

      if (welcomeText) {
        welcomeText = welcomeText
          .replace(/{MENTION}/gi, `<a href="tg://user?id=${userId}">${firstName}</a>`)
          .replace(/{(FIRSTNAME|NAME|name)}/gi, firstName)
          .replace(/{USERNAME}/gi, username ? `@${username}` : firstName)
          .replace(/{USERID}/gi, userId.toString())
          .replace(/{(GROUPNAME|TITLE|title)}/gi, groupTitle);
      } else {
        welcomeText = `👋 Hello <b>${firstName}</b>!\n\n😊 Your request to join <b>${groupTitle}</b> has been automatically approved! ✅\n\nWelcome to the community!\n\nIf you like, you can also use me in your group... Click /start and let's go 🤩`;
      }

      const keyboard = parseWelcomeButtons(welcomeConfig?.buttons);

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
        console.log(`[AutoApprove Debug]: Welcome PM sent successfully to user ${userId}`);
      } catch (pmError: any) {
        console.log(`[AutoApprove PM Skipped]: Could not message user ${userId} in PM (${pmError.message})`);
      }
    }
  } catch (error) {
    console.error("[AutoApprove Service Fatal Error]:", error);
  }
};
