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
      // Fallback: If no config or autoApprove is disabled, approve the request anyway 
      // so users aren't left hanging, or you can manage it based on your preference.
      console.log(`[JoinReq]: No config found or autoApprove disabled for group ${groupId}. Approving natively.`);
      await ctx.approveChatJoinRequest();
    }
  } catch (error) {
    console.error("[JoinReq Handler Error]:", error);
  }
});
