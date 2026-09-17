import { InlineKeyboard } from "grammy";

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
