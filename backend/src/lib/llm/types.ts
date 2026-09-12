export type Provider = "anthropic" | "google" | "openai" | "openai-compatible";
export type AiTask = "main" | "title" | "tabular";

export type ModelCapabilities = Readonly<{
  input: Readonly<{
    text: boolean;
    image: boolean;
    pdf: boolean;
  }>;
  output: Readonly<{
    text: boolean;
    structured: boolean;
    toolCalls: boolean;
  }>;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
}>;

export type AiModelRecord = Readonly<{
  id: string;
  provider: Provider;
  providerModelId: string;
  displayName: string;
  capabilities: ModelCapabilities;
  tasks: readonly AiTask[];
  connectionId?: string;
}>;

export type AiProviderConnection = Readonly<{
  id: string;
  provider: Provider;
  source: "server" | "user";
  name: string;
  credential: string;
  baseUrl?: string;
}>;

export type AiTarget = Readonly<{
  connectionId: string;
  modelId: string;
}>;

export type AiRuntimeContext = Readonly<{
  connections: readonly AiProviderConnection[];
  models: readonly AiModelRecord[];
  preferences?: Readonly<Partial<Record<AiTask, AiTarget>>>;
}>;

export type OpenAIToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type NormalizedToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type NormalizedToolResult = {
  tool_use_id: string;
  content: string;
};

export type StreamCallbacks = {
  onReasoningDelta?: (text: string) => void;
  onReasoningBlockEnd?: () => void;
  onContentDelta?: (text: string) => void;
  onToolCallStart?: (call: NormalizedToolCall) => void;
};

export type StreamChatParams = {
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  tools?: OpenAIToolSchema[];
  maxIterations?: number;
  callbacks?: StreamCallbacks;
  runTools?: (calls: NormalizedToolCall[]) => Promise<NormalizedToolResult[]>;
  runtime?: AiRuntimeContext;
  connectionId?: string;
  task?: AiTask;
  enableThinking?: boolean;
  signal?: AbortSignal;
};

export type StreamChatResult = {
  fullText: string;
};
