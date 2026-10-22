import { Context, NextFunction } from "grammy";

export async function groupPrefixMiddleware(ctx: Context, next: NextFunction) {
  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

  if (isGroup && ctx.message?.text) {
    const text = ctx.message.text.trim();
    const prefixes = [".", "?", "$", "~"];

    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        // Change prefix internally to '/'
        ctx.message.text = "/" + text.slice(prefix.length);

        // Update command entity length so grammY parses the command properly
        if (ctx.message.entities && ctx.message.entities.length > 0) {
          const firstEntity = ctx.message.entities[0];
          if (firstEntity.type === "bot_command" && firstEntity.offset === 0) {
            ctx.message.entities[0].length = ctx.message.text.split(" ")[0].length;
          }
        }
        break;
      }
    }
  }

  await next();
}
