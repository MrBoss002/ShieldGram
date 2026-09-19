import { Api } from "grammy";

export const handleAutoApprove = async (
  api: Api,
  ctx: any,
  sendWelcomePm: boolean
): Promise<void> => {
  try {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || "User";

    // Approve the chat join request natively
    await api.approveChatJoinRequest(groupId, userId);

    if (sendWelcomePm) {
      const cleanTitle = (ctx.chat.title || "the group").replace(/[*_`\[\]()]/g, "\\$&");

      await api
        .sendMessage(
          userId,
          `👋 Hello **${firstName}**!\n\n✅ Your request to join **${cleanTitle}** has been automatically approved! Welcome to the community!`,
          { parse_mode: "Markdown" }
        )
        .catch(() => {});
    }
  } catch (error) {
    console.error("[AutoApprove Service Error]:", error);
  }
};
