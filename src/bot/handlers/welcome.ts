import { Composer, Context, InlineKeyboard } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const welcomeHandler = new Composer();

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

        if (
          cleanText &&
          (cleanUrl.startsWith("http://") ||
            cleanUrl.startsWith("https://") ||
            cleanUrl.startsWith("tg://"))
        ) {
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

// --- HELPER 1: SEND WELCOME TO GROUP (FOR NORMAL JOINS) ---
export async function sendWelcomeToGroup(
  ctx: Context,
  groupId: number,
  user: { id: number; first_name: string; username?: string }
) {
  try {
    const config = await GroupConfig.findOne({ groupId });
    if (!config || !config.features?.welcome?.enabled) return;

    const { message, mediaUrl, buttons } = config.features.welcome;
    const rawText = message || "👋 Welcome {MENTION} to <b>{GROUPNAME}</b>!";
    const groupTitle = ctx.chat?.title || "the group";

    const formattedText = rawText
      .replace(/{MENTION}/gi, `<a href="tg://user?id=${user.id}">${user.first_name}</a>`)
      .replace(/{(FIRSTNAME|NAME)}/gi, user.first_name)
      .replace(/{USERNAME}/gi, user.username ? `@${user.username}` : user.first_name)
      .replace(/{USERID}/gi, user.id.toString())
      .replace(/{(GROUPNAME|TITLE)}/gi, groupTitle);

    const keyboard = buttons ? parseCustomButtons(buttons) : undefined;

    if (mediaUrl) {
      await ctx.api.sendPhoto(groupId, mediaUrl, {
        caption: formattedText,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await ctx.api.sendMessage(groupId, formattedText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    console.error("[Group Welcome Error]:", err);
  }
}

// --- HELPER 2: SEND WELCOME TO PM WITH GROUP FALLBACK (FOR APPROVED JOINS) ---
export async function sendWelcomeToPM(
  ctx: Context,
  groupId: number,
  user: { id: number; first_name: string; username?: string }
) {
  try {
    const config = await GroupConfig.findOne({ groupId });
    if (!config || !config.features?.welcome?.enabled) return;

    const { message, mediaUrl, buttons } = config.features.welcome;
    const rawText = message || "👋 Welcome {MENTION} to <b>{GROUPNAME}</b>!";
    const groupTitle = ctx.chat?.title || "the group";

    const formattedText = rawText
      .replace(/{MENTION}/gi, `<a href="tg://user?id=${user.id}">${user.first_name}</a>`)
      .replace(/{(FIRSTNAME|NAME)}/gi, user.first_name)
      .replace(/{USERNAME}/gi, user.username ? `@${user.username}` : user.first_name)
      .replace(/{USERID}/gi, user.id.toString())
      .replace(/{(GROUPNAME|TITLE)}/gi, groupTitle);

    const keyboard = buttons ? parseCustomButtons(buttons) : undefined;

    // Try sending PM first
    try {
      if (mediaUrl) {
        await ctx.api.sendPhoto(user.id, mediaUrl, {
          caption: formattedText,
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
      } else {
        await ctx.api.sendMessage(user.id, formattedText, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
      }
    } catch (pmError) {
      // If PM fails, fallback to sending in the group
      await sendWelcomeToGroup(ctx, groupId, user);
    }
  } catch (err) {
    console.error("[PM Welcome Error]:", err);
  }
}

// --- EVENT 1: DIRECT / NORMAL JOINS ---
welcomeHandler.on("chat_member", async (ctx) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;

  const wasNotMember = ["left", "kicked"].includes(old_chat_member.status);
  const isNowMember = ["member", "restricted"].includes(new_chat_member.status);

  if (!wasNotMember || !isNowMember) return;
  if (new_chat_member.user.is_bot) return;

  // Sends to Group
  await sendWelcomeToGroup(ctx, ctx.chat.id, new_chat_member.user);
});

// --- EVENT 2: JOIN REQUEST APPROVALS ---
welcomeHandler.on("chat_join_request", async (ctx) => {
  const groupId = ctx.chat.id;
  const user = ctx.from;

  try {
    // Approve the join request
    await ctx.approveChatJoinRequest(user.id);

    // Sends to PM (Falls back to Group if PM fails)
    await sendWelcomeToPM(ctx, groupId, user);
  } catch (err) {
    console.error("[Auto-Approve Error]:", err);
  }
});
