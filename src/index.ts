import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ChatRequestSchema } from "./api/ollama_zod";
import { completion } from "./api/qwen";
import { streamText } from "hono/streaming";

const app = new Hono<{ Bindings: CloudflareBindings }>().basePath("/api");

app.post("/chat", zValidator("json", ChatRequestSchema), async (c) => {
  const chatRequest = c.req.valid("json");
  const result = await completion(chatRequest, c.env.QWEN_TOKEN);

  if (result instanceof ReadableStream) {
    return streamText(c, async (stream) => {
      const reader = result.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await stream.writeln(
          JSON.stringify({
            message: value,
            done: false,
          }),
        );
      }
      await stream.write(JSON.stringify({ done: true }));
    });
  }

  return c.json({
    message: result,
    done: true,
  });
});

export default app;
