import { Bot } from "grammy";
import { env } from "../config/env";
import { forceSubMiddleware, forceSubHandler } from "./middlewares/forceSub";
import { systemCleanMiddleware } from "./middlewares/systemClean";
import { startHandler } from "./handlers/start";
import { adminHandler } from "./handlers/admin";
import { welcomeHandler } from "./handlers/welcome";
import { joinReqHandler } from "./handlers/joinReq";
import { rulesHandler } from "./handlers/rules";
import { moderationHandler } from "./handlers/moderation";

// Instantiate the gramY Bot
export const bot = new Bot(env.BOT_TOKEN);

// 1. Register Callback Handlers First (processes button clicks like "🔄 I Have Joined")
bot.use(forceSubHandler);

// 2. Register Middlewares (Group Message Interceptors)
bot.use(systemCleanMiddleware);
bot.use(moderationHandler); // Intercepts anti-link, anti-weblink & anti-forward early
bot.use(forceSubMiddleware);

// 3. Register Handlers & Composers
bot.use(startHandler);
bot.use(adminHandler);
bot.use(welcomeHandler);
bot.use(joinReqHandler);
bot.use(rulesHandler);

// 4. Global Error Handler
bot.catch((err) => {
  console.error(`[ShieldGram Bot Error] [${err.ctx.update.update_id}]:`, err.error);
});
