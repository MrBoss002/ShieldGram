import { Api } from "grammy";

export const handleAutoApprove = async (
  api: Api,
  ctx: any,
  sendWelcomePm: boolean
): Promise<void> => {
  try {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    // Approve the chat join request natively
    await api.approveChatJoinRequest(groupId, userId);

    if (sendWelcomePm) {
      await api
        .sendMessage(
          userId,
          `✅ Your request to join **${ctx.chat.title}** has been approved! Welcome to the community!`,
          { parse_mode: "Markdown" }
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error("[AutoApprove Service Error]:", error);
  }
};
