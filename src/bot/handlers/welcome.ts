import { Composer } from "grammy";
import { GroupConfig } from "../models/GroupConfig";

export const welcomeHandler = new Composer();

welcomeHandler.on("chat_member", async (ctx) => {
  const { old_chat_member, new_chat_member } = ctx.chatMember;

  // Trigger only when a user transitions from "left/kicked" to "member/restricted"
  const wasNotMember = ["left", "kicked"].includes(old_chat_member.status);
  const isNowMember = ["member", "restricted"].includes(new_chat_member.status);

  if (!wasNotMember || !isNowMember) return;

  const groupId = ctx.chat.id;
  const config = await GroupConfig.findOne({ groupId });

  if (!config || !config.features?.welcome?.enabled) return;

  const { message, mediaUrl, buttons } = config.features.welcome;
  const user = new_chat_member.user;

  // Format Dynamic Tags
  let formattedText = (message || "Welcome {MENTION} to {GROUPNAME}!")
    .replace(/{MENTION}/g, `<a href="tg://user?id=${user.id}">${user.first_name}</a>`)
    .replace(/{GROUPNAME}/g, ctx.chat.title);

  // Send Welcome Message (Photo or Text)
  if (mediaUrl) {
    await ctx.replyWithPhoto(mediaUrl, {
      caption: formattedText,
      parse_mode: "HTML",
    });
  } else {
    await ctx.reply(formattedText, { parse_mode: "HTML" });
  }
});
