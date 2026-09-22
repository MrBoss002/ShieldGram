import { Composer, Context, InlineKeyboard } from "grammy";
import { GroupConfig } from "../models/GroupConfig";

export const captchaHandler = new Composer();

/**
 * Generates a PM Captcha verification keyboard.
 */
export const createCaptchaKeyboard = (groupId: number) => {
  return new InlineKeyboard().text(
    "✅ Verify I am Human",
    `verify_captcha_${groupId}`
  );
};

// 1. LISTEN FOR NEW MEMBERS & RESTRICT THEM
captchaHandler.on("chat_member", async (ctx, next) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;

  const wasNotMember = ["left", "kicked"].includes(old_chat_member.status);
  const isNowMember = ["member", "restricted"].includes(new_chat_member.status);

  if (!wasNotMember || !isNowMember) return next();
  if (new_chat_member.user.is_bot) return next();

  const groupId = ctx.chat.id;
  const user = new_chat_member.user;

  try {
    const config = await GroupConfig.findOne({ groupId });

    // Check if Captcha is enabled
    if (!config || !config.features?.captcha?.enabled) return next();

    // Restrict the user upon entry
    await ctx.api.restrictChatMember(groupId, user.id, {
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      },
    });

    // Send PM verification prompt to user
    const botUsername = ctx.me.username;
    const verifyUrl = `https://t.me/${botUsername}?start=captcha_${groupId}`;
    const keyboard = new InlineKeyboard().url("🔒 Complete Human Verification", verifyUrl);

    try {
      await ctx.api.sendMessage(
        user.id,
        `⚠️ <b>Security Check Required</b>\n\nYou have been muted in <b>${ctx.chat.title}</b> until you complete the verification. Click below to verify:`,
        { parse_mode: "HTML", reply_markup: createCaptchaKeyboard(groupId) }
      );
    } catch {
      // Fallback message in group if user PM is blocked
      await ctx.api.sendMessage(
        groupId,
        `👋 <a href="tg://user?id=${user.id}">${user.first_name}</a>, please click below to complete verification and unlock messaging permissions:`,
        { parse_mode: "HTML", reply_markup: keyboard }
      );
    }
  } catch (err) {
    console.error("[Captcha Restrict Error]:", err);
  }

  return next();
});

// 2. HANDLE CAPTCHA VERIFICATION BUTTON CLICK
captchaHandler.callbackQuery(/^verify_captcha_(-?\d+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;

  const groupId = parseInt(match[1], 10);
  const userId = ctx.from.id;

  try {
    const config = await GroupConfig.findOne({ groupId });
    if (!config || !config.features.captcha.enabled) {
      return ctx.answerCallbackQuery({
        text: "❌ Captcha is currently disabled or group configuration was not found.",
        show_alert: true,
      });
    }

    // Unrestrict user permissions in the group
    await ctx.api.restrictChatMember(groupId, userId, {
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
    });

    await ctx.answerCallbackQuery({
      text: "✅ Captcha passed! You can now participate in the group.",
      show_alert: true,
    });

    await ctx.editMessageText(
      "🎉 <b>Verification Successful!</b>\n\nYou have passed the security check and can now send messages in the group.",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("[Captcha Handler Error]:", error);
    await ctx.answerCallbackQuery({
      text: "⚠️ Verification failed. Ensure the bot is an Admin with 'Restrict Users' permissions!",
      show_alert: true,
    });
  }
});
