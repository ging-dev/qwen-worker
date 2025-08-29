import type { ChatRequest, Message } from "../zod/ollama";
import { events } from "fetch-event-stream";

async function completion<T extends ChatRequest>(
  chatRequest: T,
  token: string,
): Promise<
  T["stream"] extends true
    ? ReadableStream<Message>
    : T["stream"] extends false
      ? Message
      : ReadableStream<Message> | Message
>;

async function completion(
  chatRequest: ChatRequest,
  token: string,
): Promise<any> {
  const messages = chatRequest.messages.map((m) => {
    if (m.role === "tool") {
      m.role = "user";
      m.content = `<tool_response>${m.content}</tool_response>`;
    }
    return {
      role: m.role,
      content: m.content,
    };
  });
  if (chatRequest.tools) {
    const toolsPrompt = `
# Tools

You may call one or more functions to assist with the user query.

You are provided with function signatures within <tools></tools> XML tags:
<tools>
${chatRequest.tools.map((tool) => JSON.stringify(tool)).join("\n")}
</tools>

For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:
<tool_call>
{"name": <function-name>, "arguments": <args-json-object>}
</tool_call>
`;
    const firstMessage = messages[0];
    if (firstMessage.role === "system") {
      firstMessage.content += toolsPrompt;
    } else {
      messages.unshift({ role: "system", content: toolsPrompt });
    }
  }

  const response = await fetch("https://chat.qwen.ai/api/chat/completions", {
    headers: {
      accept: "*/*",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      cookie: "ssxmod_itna=GingTeam",
      "user-agent": "GingTeam",
    },
    body: JSON.stringify({
      model: chatRequest.model,
      messages: messages,
      stream: chatRequest.stream,
      chat_id: "local",
      incremental_output: true,
    }),
    method: "POST",
  });

  if (chatRequest.stream) {
    return new ReadableStream<Message>({
      async start(controller) {
        const stream = events(response);
        let buffer = "";
        let toolDetected = false;
        for await (const event of stream) {
          if (!event.data) continue;
          const delta = JSON.parse(event.data).choices[0].delta as Message;
          if (delta.content.startsWith("<tool_call>")) {
            toolDetected = true;
          }
          if (toolDetected) buffer += delta.content;
          if (delta.content.endsWith("</tool_call>")) {
            delta.content = "";
            delta.tool_calls = tryParseToolCalls(buffer);
            controller.enqueue(delta);
            buffer = "";
            toolDetected = false;
          }
          if (toolDetected) continue;
          controller.enqueue(delta);
        }
        controller.close();
      },
    });
  }

  const message = JSON.parse(await response.text()).choices[0]
    .message as Message;
  const toolCalls = tryParseToolCalls(message.content);
  if (toolCalls.length) {
    message.content = "";
    message.tool_calls = toolCalls;
  }

  return message;
}

function tryParseToolCalls(content: string) {
  const toolCalls = [];
  const regex = /<tool_call>\n(.+)?\n<\/tool_call>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      toolCalls.push({ function: JSON.parse(match[1]) });
    } catch (e) {
      console.error(
        `Failed to parse tool calls: the content is ${match[1]} and ${e}`,
      );
    }
  }

  return toolCalls;
}

export { completion };
