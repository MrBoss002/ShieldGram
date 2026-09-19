import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { handleAutoApprove } from "../../services/autoApprove";
import { createCaptchaKeyboard } from "./captcha";

export const joinReqHandler = new Composer();

// Handle incoming chat join requests natively
joinReqHandler.on("chat_join_request", async (ctx) => {
  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  try {
    const config = await GroupConfig.findOne({ groupId });

    // Handle Auto-Approve if enabled
    if (config && config.features.autoApprove.enabled) {
      await handleAutoApprove(
        ctx.api as any,
        ctx,
        config.features.autoApprove.sendWelcomePm
      );
    }

    // Handle Captcha triggering in PM if enabled
    if (config && config.features.captcha.enabled) {
      const captchaKeyboard = createCaptchaKeyboard(groupId);
      const chatTitle = ctx.chat.title.replace(/[*_`\[\]()]/g, "\\$&"); // Escape Markdown special characters

      await ctx.api
        .sendMessage(
          userId,
          `🛡️ **Verification Required**\n\nPlease click the button below to verify you are human before participating in **${chatTitle}**.`,
          {
            parse_mode: "Markdown",
            reply_markup: captchaKeyboard,
          }
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error("[JoinReq Handler Error]:", error);
  }
});
