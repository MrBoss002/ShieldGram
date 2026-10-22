import { Context, NextFunction } from "grammy";

export async function groupPrefixMiddleware(ctx: Context, next: NextFunction) {
  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

  if (isGroup && ctx.message?.text) {
    const text = ctx.message.text.trim();
    const prefixes = [".", "?", "$", "~"];

    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        // 1. Rewrite text to start with '/'
        ctx.message.text = "/" + text.slice(prefix.length);

        // 2. Extract command name (e.g. '/warn')
        const commandName = ctx.message.text.split(/\s+/)[0];

        // 3. Force-create bot_command entity so grammY sees it as a real command
        ctx.message.entities = [
          {
            type: "bot_command",
            offset: 0,
            length: commandName.length,
          },
          ...(ctx.message.entities || []),
        ];

        break;
      }
    }
  }

  await next();
}
