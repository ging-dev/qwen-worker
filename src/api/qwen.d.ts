import type { Tool } from "./ollama_zod";

declare module "qwen" {
  type Role = "assistant" | "user" | "system";

  type Message = {
    role: Role;
    content: string;
  };

  type CompletionArguments = {
    model: string;
    messages: Array<Message>;
    tools?: Array<Tool>;
    stream: boolean;
  };
}
