import { Bot, Context } from "grammy";

/**
 * Handles incoming join requests automatically in real time.
 */
export const handleAutoApprove = async (
  bot: Bot,
  ctx: Context,
  sendWelcomePm: boolean
): Promise<void> => {
  if (!ctx.chatJoinRequest) return;

  const { chat, user } = ctx.chatJoinRequest;

  try {
    // Approve the join request natively via Bot API
    await bot.api.approveChatJoinRequest(chat.id, user.id);
    console.log(
      `[AutoApprove] Approved user ${user.first_name} (${user.id}) for group ${chat.title} (${chat.id})`
    );

    // Optional PM welcome message directly to the approved user
    if (sendWelcomePm) {
      await bot.api
        .sendMessage(
          user.id,
          `🎉 **Request Approved!**\n\nYour request to join **${chat.title}** has been approved. Welcome aboard!`,
          { parse_mode: "Markdown" }
        )
        .catch(() => {
          // User has not started PM with the bot yet; ignore safely
        });
    }
  } catch (error) {
    console.error(
      `[AutoApprove] Failed to approve user ${user.id} in group ${chat.id}:`,
      error
    );
  }
};
