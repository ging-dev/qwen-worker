import type { CompletionArguments, Message } from "qwen";
import { events } from "fetch-event-stream";
import { Environment } from "nunjucks";

const nunjucks = new Environment(null, { autoescape: false });
const toolsPrompt = `
# Tools

You may call one or more functions to assist with the user query.

You are provided with function signatures within <tools></tools> XML tags:
<tools>
{% for tool in tools %}
    {{ tool | dump(2) }}
{% endfor %}
</tools>

For each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:
<tool_call>
{"name": <function-name>, "arguments": <args-json-object>}
</tool_call>
`;

async function completion<T extends CompletionArguments>(
  completionArgs: T,
  token: string,
): Promise<
  T["stream"] extends true
    ? ReadableStream<Message>
    : T["stream"] extends false
      ? Message
      : ReadableStream<Message> | Message
>;

async function completion(
  completionArgs: CompletionArguments,
  token: string,
): Promise<any> {
  if (completionArgs.tools) {
    const firstMessage = completionArgs.messages[0];
    const toolsRender = nunjucks.renderString(toolsPrompt, {
      tools: completionArgs.tools,
    });
    if (firstMessage.role === "system") {
      firstMessage.content += toolsRender;
    } else {
      completionArgs.messages.unshift({ role: "system", content: toolsRender });
    }
  }

  const response = await fetch("https://chat.qwen.ai/api/chat/completions", {
    headers: {
      accept: "*/*",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      cookie: "ssxmod_itna=GingTeam",
      "user-agent": "GingTeam"
    },
    body: JSON.stringify({
      ...completionArgs,
      chat_id: "local",
      incremental_output: true,
    }),
    method: "POST",
  });

  if (completionArgs.stream) {
    return new ReadableStream<Message>({
      async start(controller) {
        const stream = events(response);
        for await (const event of stream) {
          if (!event.data) continue;
          controller.enqueue(JSON.parse(event.data).choices[0].delta);
        }
        controller.close();
      },
    });
  }

  const message = JSON.parse(await response.text()).choices[0].message;
  const toolCalls = tryParseToolCalls(message.content);
  if (toolCalls) {
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
