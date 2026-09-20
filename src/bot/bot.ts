import { Bot } from "grammy";
import { env } from "../config/env";
import { forceSubMiddleware } from "./middlewares/forceSub";
import { systemCleanMiddleware } from "./middlewares/systemClean";
import { startHandler } from "./handlers/start";
import { adminHandler } from "./handlers/admin";
import { joinReqHandler } from "./handlers/joinReq";
import { rulesHandler } from "./handlers/rules";
import { moderationHandler } from "./handlers/moderation";

// Instantiate the gramY Bot
export const bot = new Bot(env.BOT_TOKEN);

// 1. Register Middlewares (Group Message Interceptors)
bot.use(systemCleanMiddleware);
bot.use(moderationHandler); // Intercepts anti-link, anti-weblink & anti-forward early
bot.use(forceSubMiddleware);

// 2. Register Handlers & Composers
bot.use(startHandler);
bot.use(adminHandler);
bot.use(joinReqHandler);
bot.use(rulesHandler);

// 3. Global Error Handler
bot.catch((err) => {
  console.error(`[ShieldGram Bot Error] [${err.ctx.update.update_id}]:`, err.error);
});
