import { z } from "zod";

// Options schema
export const OptionsSchema = z.object({
  numa: z.boolean(),
  num_ctx: z.number(),
  num_batch: z.number(),
  num_gpu: z.number(),
  main_gpu: z.number(),
  low_vram: z.boolean(),
  f16_kv: z.boolean(),
  logits_all: z.boolean(),
  vocab_only: z.boolean(),
  use_mmap: z.boolean(),
  use_mlock: z.boolean(),
  embedding_only: z.boolean(),
  num_thread: z.number(),

  // Runtime options
  num_keep: z.number(),
  seed: z.number(),
  num_predict: z.number(),
  top_k: z.number(),
  top_p: z.number(),
  tfs_z: z.number(),
  typical_p: z.number(),
  repeat_last_n: z.number(),
  temperature: z.number(),
  repeat_penalty: z.number(),
  presence_penalty: z.number(),
  frequency_penalty: z.number(),
  mirostat: z.number(),
  mirostat_tau: z.number(),
  mirostat_eta: z.number(),
  penalize_newline: z.boolean(),
  stop: z.array(z.string()),
});

// Tool and Message related schemas
export const ToolCallFunctionSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.any()),
});

export const ToolCallSchema = z.object({
  function: ToolCallFunctionSchema,
});

export const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
  images: z.array(z.union([z.instanceof(Uint8Array), z.string()])).optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
});

export const ToolFunctionParametersSchema = z.object({
  type: z.string(),
  required: z.optional(z.array(z.string())),
  properties: z.record(
    z.string(),
    z.object({
      type: z.string(),
      description: z.string(),
      enum: z.array(z.string()).optional(),
    }),
  ),
});

export const ToolFunctionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: ToolFunctionParametersSchema,
});

export const ToolSchema = z.object({
  type: z.string(),
  function: ToolFunctionSchema,
});

// Main request schemas
export const GenerateRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  suffix: z.string().optional(),
  system: z.string().optional(),
  template: z.string().optional(),
  context: z.array(z.number()).optional(),
  stream: z.boolean().optional(),
  raw: z.boolean().optional(),
  format: z.union([z.string(), z.record(z.any())]).optional(),
  images: z.array(z.union([z.instanceof(Uint8Array), z.string()])).optional(),
  keep_alive: z.union([z.string(), z.number()]).optional(),
  options: z.optional(OptionsSchema.partial()),
});

export const ChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema),
  stream: z.boolean().optional(),
  format: z.union([z.string(), z.record(z.any())]).optional(),
  keep_alive: z.union([z.string(), z.number()]).optional(),
  tools: z.array(ToolSchema).optional(),
  options: z.optional(OptionsSchema.partial()),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type Options = z.infer<typeof OptionsSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
