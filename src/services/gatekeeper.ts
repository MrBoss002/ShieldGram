import { Api } from "grammy";

/**
 * Checks if a user is a member/admin/creator in all specified required channels.
 * Returns an array of channels the user HAS NOT joined yet.
 */
export const checkChannelMemberships = async (
  api: Api,
  userId: number,
  channels: string[]
): Promise<string[]> => {
  const missingChannels: string[] = [];

  for (const rawChannel of channels) {
    const channel = rawChannel.trim();
    if (!channel) continue;

    try {
      const member = await api.getChatMember(channel, userId);
      const isMember = ["creator", "administrator", "member", "restricted"].includes(
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
      // If the bot cannot check access (e.g., bot was removed from channel), treat as missing to enforce check
      missingChannels.push(channel);
    }
  }

  return missingChannels;
};
