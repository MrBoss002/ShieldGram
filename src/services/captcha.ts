import { Composer, InlineKeyboard } from "grammy";
import { GroupConfig } from "../models/GroupConfig";

export const captchaHandler = new Composer();

/**
 * Generates a clean PM Captcha verification keyboard.
 */
export const createCaptchaKeyboard = (groupId: number) => {
  return new InlineKeyboard().text(
    "✅ Verify I am Human",
    `verify_captcha_${groupId}`
  );
};

/**
 * Validates whether the user clicked the correct captcha button for the target group.
 */
export const verifyCaptchaPayload = (
  callbackData: string,
  targetGroupId: number
): boolean => {
  return callbackData === `verify_captcha_${targetGroupId}`;
};

// Handle Captcha Verification Callback
captchaHandler.callbackQuery(/^verify_captcha_(-?\d+)$/, async (ctx) => {
  const match = ctx.match;
  if (!match) return;

  const groupId = parseInt(match[1], 10);
  const userId = ctx.from.id;

  try {
    // 1. Fetch Group Config to ensure Captcha is enabled
    const config = await GroupConfig.findOne({ groupId });
    if (!config || !config.features.captcha.enabled) {
      await ctx.answerCallbackQuery({
        text: "❌ Captcha is currently disabled or group config was not found.",
        show_alert: true,
      });
      return;
    }

    // 2. Unrestrict user permissions in the group
    await ctx.api.restrictChatMember(groupId, userId, {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });

    await ctx.answerCallbackQuery({
      text: "✅ Captcha passed! You can now chat in the group.",
      show_alert: true,
    });

    // 3. Update PM message text
    await ctx.editMessageText(
      "🎉 **Verification Successful!**\n\nYou have passed the human check and can now participate in the group.",
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("[Captcha Handler Error]:", error);
    await ctx.answerCallbackQuery({
      text: "⚠️ Verification failed. Make sure the bot is an Admin in the group with Restrict Users permission!",
      show_alert: true,
    });
  }
});
