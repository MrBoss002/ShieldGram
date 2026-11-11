import { Composer, InlineKeyboard, Context } from "grammy";
import { User } from "../../models/User";
import { SecretSession } from "../../models/SecretSession";
import crypto from "crypto";

export const secretHandler = new Composer();

// --- 1. GROUP COMMAND: /secret (Must be a reply to someone) ---
secretHandler.command("secret", async (ctx) => {
  if (ctx.chat.type === "private") {
    return ctx.reply("⚠️ <b>The /secret command must be used inside a group chat by replying to someone!</b>", { parse_mode: "HTML" });
  }

  const repliedMessage = ctx.msg?.reply_to_message;
  if (!repliedMessage || !repliedMessage.from) {
    return ctx.reply("⚠️ <b>Please reply to a user's message with <code>/secret</code> to send them a secret message!</b>", { parse_mode: "HTML" });
  }

  const sender = ctx.from;
  if (!sender) return;

  const recipient = repliedMessage.from;
  const groupId = ctx.chat.id;

  if (sender.id === recipient.id) {
    return ctx.reply("😅 <b>You cannot send a secret message to yourself!</b>", { parse_mode: "HTML" });
  }
  if (recipient.is_bot) {
    return ctx.reply("🤖 <b>You cannot send secret messages to bots!</b>", { parse_mode: "HTML" });
  }

  const sessionId = crypto.randomBytes(6).toString("hex");

  await SecretSession.create({
    sessionId,
    senderId: sender.id,
    recipientId: recipient.id,
    groupId,
    status: "PENDING",
  });

  const botUsername = ctx.me.username;
  const pmLink = `https://t.me/${botUsername}?start=secret_${sessionId}`;

  const keyboard = new InlineKeyboard().url("✉️ OPEN PM TO WRITE SECRET", pmLink);

  const sentMsg = await ctx.reply(
    `🔒 <b>Secret Message Initiated!</b>\n\n` +
    `• <b>From:</b> ${sender.first_name}\n` +
    `• <b>To:</b> ${recipient.first_name}\n\n` +
    `<i>Tap the button below to write your secret message safely in private chat. Only ${sender.first_name} can write this message.</i>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );

  // --- AUTO-DELETE INITIATED CARD AFTER 90 SECONDS ---
  const botApi = ctx.api;
  const chatToCleanId = groupId;
  const messageToDeleteId = sentMsg.message_id;

  setTimeout(async () => {
    try {
      await botApi.deleteMessage(chatToCleanId, messageToDeleteId);
    } catch (err) {
      // Ignore errors if already deleted
    }
  }, 90000); // 90 seconds
});

// --- 2. PM START PAYLOAD ROUTE (/start secret_SESSIONID) ---
secretHandler.use(async (ctx, next) => {
  if (ctx.chat?.type !== "private") return next();

  const text = ctx.msg?.text;
  if (!text || !text.startsWith("/start secret_")) return next();

  const sessionId = text.replace("/start secret_", "").trim();
  const session = await SecretSession.findOne({ sessionId });

  if (!session || session.status === "COMPLETED") {
    return ctx.reply("⚠️ <b>This secret session has expired, is invalid, or has already been completed.</b>\nPlease start a new secret message from the group chat using <code>/secret</code>.", { parse_mode: "HTML" });
  }

  const currentUserId = ctx.from?.id;
  if (!currentUserId) return next();

  // STRICT VALIDATION: Only the original sender (User X) can access this session writer
  if (currentUserId !== session.senderId) {
    return ctx.reply("❌ <b>Access Denied!</b> This secret session was initiated by another user.", { parse_mode: "HTML" });
  }

  let user = await User.findOne({ userId: currentUserId });
  if (!user) {
    user = await User.create({
      userId: currentUserId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name || "User",
      points: 5,
    });
  }

  let recipientName = "User";
  try {
    const chatMember = await ctx.api.getChatMember(session.groupId, session.recipientId);
    recipientName = chatMember.user.first_name;
  } catch {
    recipientName = `ID: ${session.recipientId}`;
  }

  const welcomeText =
    `🔐 <b>ShieldGram Secret Messaging</b>\n\n` +
    `Send confidential text, photos, videos, or files directly without anyone else in the group seeing it.\n\n` +
    `👤 <b>To:</b> <code>${recipientName}</code>\n\n` +
    `<i>Choose an option below to manage your profile or start sending your message:</i>`;

  const keyboard = new InlineKeyboard()
    .text("👤 PROFILE", `profile_${sessionId}`)
    .text("🚀 SEND NOW", `ready_send_${sessionId}`);

  await ctx.reply(welcomeText, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// --- 3. PROFILE BUTTON CALLBACK ---
secretHandler.callbackQuery(/^profile_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = await SecretSession.findOne({ sessionId });
  if (!session || userId !== session.senderId) {
    return ctx.answerCallbackQuery({ text: "⚠️ Unauthorized session!", show_alert: true });
  }

  const user = await User.findOne({ userId });
  const points = user ? user.points : 5;
  const referralLink = `https://t.me/${ctx.me?.username}?start=ref_${userId}`;

  const profileText =
    `👤 <b>Your Secret Profile & Stats</b>\n\n` +
    `• <b>Name:</b> ${ctx.from.first_name}\n` +
    `• <b>User ID:</b> <code>${userId}</code>\n` +
    `• <b>Balance Points:</b> <code>${points} pts</code>\n` +
    `• <b>Cost per message:</b> <code>1 point</code>\n` +
    `• <b>Referrals Count:</b> <code>${user?.referralCount || 0} users</code>\n\n` +
    `🔗 <b>Your Referral Link (+2 pts per invite):</b>\n` +
    `<code>${referralLink}</code>`;

  const keyboard = new InlineKeyboard().text("🚀 SEND NOW", `ready_send_${sessionId}`);

  try {
    await ctx.editMessageText(profileText, { parse_mode: "HTML", reply_markup: keyboard });
  } catch {}
  await ctx.answerCallbackQuery();
});

// --- 4. "SEND NOW" BUTTON CALLBACK (EXCLUSIVELY FOR USER X) ---
secretHandler.callbackQuery(/^ready_send_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = await SecretSession.findOne({ sessionId });

  if (!session || session.status === "COMPLETED") {
    await ctx.answerCallbackQuery({ text: "⚠️ Session expired or completed!", show_alert: true });
    return ctx.editMessageText("⚠️ <b>This session has expired. Please start over from the group.</b>", { parse_mode: "HTML" });
  }

  if (userId !== session.senderId) {
    return ctx.answerCallbackQuery({ text: "❌ This secret session is not yours to write!", show_alert: true });
  }

  // Update session status in database to indicate User X is now typing the secret content
  session.status = "AWAITING_CONTENT";
  await session.save();

  await ctx.editMessageText(
    `🚀 <b>Mode Activated!</b>\n\n` +
    `Now, simply <b>send your secret message</b> (Text, Photo, Video, GIF, Sticker, Audio, or File) right here in this chat.`,
    { parse_mode: "HTML" }
  );
  await ctx.answerCallbackQuery();
});

// --- 5. HANDLE INCOMING SECRET CONTENT IN PM (EXCLUSIVELY FOR USER X) ---
secretHandler.on("message", async (ctx, next) => {
  if (ctx.chat.type !== "private") return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  // Find active session where this user is the sender and is awaiting content
  const session = await SecretSession.findOne({ senderId: userId, status: "AWAITING_CONTENT" });
  if (!session) return next();

  const user = await User.findOne({ userId });
  if (!user || user.points < 1) {
    session.status = "PENDING";
    await session.save();
    const referralLink = `https://t.me/${ctx.me?.username}?start=ref_${userId}`;
    return ctx.reply(
      `❌ <b>Insufficient Points!</b>\n\n` +
      `You need at least <b>1 point</b> to send a secret message. You currently have <code>0 pts</code>.\n\n` +
      `🔗 <b>Invite friends to earn more points (+2 pts per invite):</b>\n` +
      `<code>${referralLink}</code>`,
      { parse_mode: "HTML" }
    );
  }

  user.points -= 1;
  await user.save();

  try {
    const recipientMention = `<a href="tg://user?id=${session.recipientId}">Recipient</a>`;
    
    const secretCardHeader = 
      `🔒 <b>SECRET MESSAGE</b>\n` +
      `👤 <b>To:</b> ${recipientMention}\n\n` +
      `🤫 <i>This is a confidential message. Tap below to view.</i>`;

    // Use unique sessionId in the reveal button callback so there's zero ambiguity
    const viewButton = new InlineKeyboard().text("🔓 VIEW SECRET", `reveal_${session.sessionId}`);

    const groupMsg = await ctx.api.sendMessage(session.groupId, secretCardHeader, {
      parse_mode: "HTML",
      reply_markup: viewButton,
    });

    // Save message references and lock session status
    session.sourceMessageId = ctx.msg.message_id;
    session.sourceChatId = ctx.chat.id;
    session.groupMessageId = groupMsg.message_id;
    session.status = "COMPLETED";
    await session.save();

    // --- ADMIN LOG CHANNEL MIRRORING ---
    const adminLogChannel = process.env.ADMIN_LOG_CHANNEL;
    if (adminLogChannel) {
      try {
        const logHeader = 
          `📝 <b>Secret Message Audit Log</b>\n\n` +
          `• <b>Sender ID:</b> <code>${userId}</code> (${ctx.from.first_name})\n` +
          `• <b>Recipient ID:</b> <code>${session.recipientId}</code>\n` +
          `• <b>Group ID:</b> <code>${session.groupId}</code>\n` +
          `• <b>Remaining Points:</b> <code>${user.points} pts</code>`;

        await ctx.api.sendMessage(adminLogChannel, logHeader, { parse_mode: "HTML" });
        await ctx.api.copyMessage(adminLogChannel, ctx.chat.id, ctx.msg.message_id);
      } catch (logErr) {
        console.error("[Admin Log Error]:", logErr);
      }
    }

    return ctx.reply(
      `✅ <b>Secret message successfully sent to the group!</b>\n` +
      `💎 <i>1 point deducted. Remaining points: <code>${user.points} pts</code></i>`,
      { parse_mode: "HTML" }
    );

  } catch (error) {
    console.error("[Secret Dispatch Error]:", error);
    user.points += 1;
    await user.save();
    session.status = "AWAITING_CONTENT";
    await session.save();
    return ctx.reply("❌ <b>Failed to deliver secret message.</b> Your point has been refunded. Please try again.");
  }
});

// --- 6. HANDLE "VIEW SECRET" RECIPIENT VERIFICATION & FORWARDING (EXCLUSIVELY FOR USER Y) ---
secretHandler.callbackQuery(/^reveal_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  const clickerId = ctx.from?.id;

  if (!clickerId) return;

  const session = await SecretSession.findOne({ sessionId });

  if (!session || !session.sourceMessageId || !session.sourceChatId || session.status !== "COMPLETED") {
    return ctx.answerCallbackQuery({
      text: "⚠️ This secret has already been viewed or has expired!",
      show_alert: true,
    });
  }

  // STRICT VALIDATION: Only the intended recipient (User Y) can unlock and view this secret
  if (clickerId !== session.recipientId) {
    return ctx.answerCallbackQuery({
      text: "⚠️ This secret message is for the intended recipient only!",
      show_alert: true,
    });
  }

  try {
    // Forward the secret message directly to the recipient's PM
    await ctx.api.forwardMessage(
      session.recipientId,
      session.sourceChatId,
      session.sourceMessageId
    );

    await ctx.answerCallbackQuery({
      text: "✅ Secret sent to your PM!",
      show_alert: true,
    });

    // Update the group card to show it has been opened
    await ctx.editMessageText(
      `<i>🔓 <b>SECRET MESSAGE</b> : Opened by recipient.</i>`,
      { parse_mode: "HTML" }
    );

    // Delete or invalidate session so it can never be re-opened
    await SecretSession.deleteOne({ sessionId: session.sessionId });

  } catch (err) {
    console.error("[Reveal Error - Recipient hasn't started bot]:", err);
    return ctx.answerCallbackQuery({
      text: "⚠️ You must start the bot in private chat first! Open @" + ctx.me.username + " and press Start.",
      show_alert: true,
    });
  }
});
