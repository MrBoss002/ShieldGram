import { Bot } from "grammy";
import { env } from "../config/env";
import { setGppHandler } from "./handlers/setgpp";
import { groupPrefixMiddleware } from "./middlewares/prefix";
import { forceSubMiddleware, forceSubHandler } from "./middlewares/forceSub";
import { systemCleanMiddleware } from "./middlewares/systemClean";
import { startHandler } from "./handlers/start";
import { adminHandler } from "./handlers/admin";
import { welcomeHandler } from "./handlers/welcome"; // Handles welcome msgs, normal joins & join requests
import { joinReqHandler } from "./handlers/joinReq";
import { rulesHandler } from "./handlers/rules";
import { moderationHandler } from "./handlers/moderation";
import { commandCleanerHandler } from "./handlers/commandCleaner";

// Instantiate the gramY Bot
export const bot = new Bot(env.BOT_TOKEN);

// 0. Register Group Multi-Prefix Middleware First (rewrites ., ?, $, ~ to / inside groups)
bot.use(groupPrefixMiddleware);

// 1. Register Callback Handlers First (processes button clicks like "🔄 I Have Joined")
bot.use(forceSubHandler);

// 2. Register Middlewares (Group Message Interceptors)
bot.use(systemCleanMiddleware);
bot.use(moderationHandler); // Intercepts anti-link, anti-weblink & anti-forward early
bot.use(forceSubMiddleware);

// 3. Register Handlers & Composers
bot.use(joinReqHandler);
bot.use(startHandler);
bot.use(adminHandler);
bot.use(setGppHandler);
bot.use(welcomeHandler); // Handles both direct joins & approved join requests
bot.use(rulesHandler);
bot.use(commandCleanerHandler);

// 4. Global Error Handler
bot.catch((err) => {
  console.error(`[ShieldGram Bot Error] [${err.ctx.update.update_id}]:`, err.error);
});
