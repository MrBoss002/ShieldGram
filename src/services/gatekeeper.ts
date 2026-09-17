import { Bot } from "grammy";

/**
 * Checks if a user is a member/admin/creator in all specified required channels.
 * Returns an array of channels the user HAS NOT joined yet.
 */
export const checkChannelMemberships = async (
  bot: Bot,
  userId: number,
  channels: string[]
): Promise<string[]> => {
  const missingChannels: string[] = [];

  for (const channel of channels) {
    try {
      const member = await bot.api.getChatMember(channel, userId);
      const isMember = ["creator", "administrator", "member"].includes(
        member.status
      );

      if (!isMember) {
        missingChannels.push(channel);
      }
    } catch (error) {
      console.error(
        `[Gatekeeper] Error checking membership for ${channel}:`,
        error
      );
      // If the bot cannot check access (e.g. invalid username), treat as missing to enforce check
      missingChannels.push(channel);
    }
  }

  return missingChannels;
};
