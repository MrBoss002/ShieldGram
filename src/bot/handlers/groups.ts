import { Composer } from "grammy";
import { GroupConfig } from "../../models/GroupConfig"; // Adjust path if your models folder is located elsewhere

export const groupsCommandHandler = new Composer();

// Gatekeeper: Strictly locks this command file to your OWNER_ID environment variable
const isOwner = groupsCommandHandler.filter((ctx) => {
  const ownerId = Number(process.env.OWNER_ID);
  return Boolean(ownerId && ctx.from?.id === ownerId);
});

isOwner.command("groups", async (ctx) => {
  try {
    // Fetch all registered groups from MongoDB
    const groups = await GroupConfig.find({}).sort({ updatedAt: -1 }).lean();

    if (!groups || groups.length === 0) {
      return await ctx.reply("📂 No groups found in the database.");
    }

    let response = `📊 <b>Live Groups Deployment Report</b> (Total: ${groups.length})\n\n`;

    // Loop through groups and fetch live telemetry from Telegram API in real time
    for (const [index, g] of groups.entries()) {
      const chatId = g.groupId;
      let groupName = g.groupName || "Private Group";
      let memberCount = "Unknown";
      let inviteLink = "No Link";

      try {
        const chat = await ctx.api.getChat(chatId);
        const count = await ctx.api.getChatMemberCount(chatId);

        if ("title" in chat) groupName = chat.title;
        memberCount = count.toString();

        if ("username" in chat && chat.username) {
          inviteLink = `<a href="https://t.me/${chat.username}">t.me/${chat.username}</a>`;
        } else if (chat.invite_link) {
          inviteLink = `<a href="${chat.invite_link}">Group Link</a>`;
        }
      } catch (err) {
        groupName += " <i>(Bot removed or restricted)</i>";
      }

      response += `${index + 1}. <b>${groupName}</b>\n`;
      response += `   • ID: <code>${chatId}</code>\n`;
      response += `   • Members: <b>${memberCount}</b>\n`;
      response += `   • Link: ${inviteLink}\n\n`;
    }

    await ctx.reply(response, { 
      parse_opp: true, 
      parse_mode: "HTML", 
      link_preview_options: { is_disabled: true } 
    } as any);
  } catch (error) {
    console.error("[Groups Command Error]:", error);
    await ctx.reply("❌ Failed to fetch live group telemetry.");
  }
});
