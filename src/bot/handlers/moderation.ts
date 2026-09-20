import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig";

export const moderationHandler = new Composer();

// Helper to check if user is an admin or creator
async function isGroupAdmin(ctx: any): Promise<boolean> {
  if (!ctx.from) return false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

moderationHandler.on("message", async (ctx, next) => {
  // Only monitor messages in groups/supergroups
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") {
    return next();
  }

  // Fetch group security settings
  const config = await GroupConfig.findOne({ groupId: ctx.chat.id });
  if (!config) return next();

  const { features } = config;

  // Ignore admin messages from moderation filters
  const isAdmin = await isGroupAdmin(ctx);
  if (isAdmin) return next();

  const entities = ctx.message.entities || ctx.message.caption_entities || [];
  const hasLinkEntity = entities.some((e) =>
    ["url", "text_link"].includes(e.type)
  );

  // -------------------------------------------------------------
  // 1. ANTI-FORWARD ENFORCEMENT
  // -------------------------------------------------------------
  if (features.antiForward?.enabled && ctx.message.forward_origin) {
    try {
      await ctx.deleteMessage();
      return; // Stop processing further once deleted
    } catch (err) {
      console.error(`[Moderation] Failed to delete forwarded message in ${ctx.chat.id}:`, err);
    }
  }

  // -------------------------------------------------------------
  // 2. ANTI-LINK ENFORCEMENT (Deletes ALL Links)
  // -------------------------------------------------------------
  if (features.antiLink?.enabled && hasLinkEntity) {
    try {
      await ctx.deleteMessage();
      return;
    } catch (err) {
      console.error(`[Moderation] Failed to delete link in ${ctx.chat.id}:`, err);
    }
  }

  // -------------------------------------------------------------
  // 3. ANTI-WEBLINK ENFORCEMENT (Deletes Non-Telegram External Links)
  // -------------------------------------------------------------
  if (features.antiWeblink?.enabled && hasLinkEntity) {
    const text = ctx.message.text || ctx.message.caption || "";

    const hasExternalLink = entities.some((entity) => {
      if (entity.type === "url") {
        const urlText = text.substring(entity.offset, entity.offset + entity.length);
        // Delete if link DOES NOT contain t.me or telegram.me
        return !/t\.me|telegram\.me/i.test(urlText);
      }
      if (entity.type === "text_link" && entity.url) {
        return !/t\.me|telegram\.me/i.test(entity.url);
      }
      return false;
    });

    if (hasExternalLink) {
      try {
        await ctx.deleteMessage();
        return;
      } catch (err) {
        console.error(`[Moderation] Failed to delete web link in ${ctx.chat.id}:`, err);
      }
    }
  }

  return next();
});
