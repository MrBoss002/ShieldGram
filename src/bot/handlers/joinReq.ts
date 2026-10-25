import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";
import { handleAutoApprove } from "../../services/autoApprove";

export const joinReqHandler = new Composer();

// Handle incoming chat join requests natively
joinReqHandler.on("chat_join_request", async (ctx) => {
  const groupId = ctx.chat.id;
  const userId = ctx.from.id;

  try {
    const config = await GroupConfig.findOne({ groupId });

    // Safely check if auto-approve is enabled using optional chaining
    if (config?.features?.autoApprove?.enabled) {
      await handleAutoApprove(
        ctx.api as any,
        ctx,
        config.features.autoApprove.sendWelcomePm
      );
    } else {
      // Fallback: Approve natively using the required userId argument
      console.log(`[JoinReq]: No config found or autoApprove disabled for group ${groupId}. Approving natively.`);
      await ctx.approveChatJoinRequest(userId);
    }
  } catch (error) {
    console.error("[JoinReq Handler Error]:", error);
  }
});
