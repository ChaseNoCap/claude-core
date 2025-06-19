export interface ClaudeOptions {
  claudePath?: string;
  defaultModel?: string;
  maxConcurrentSessions?: number;
  sessionTimeout?: number;
  retryOptions?: RetryOptions;
  resourceLimits?: ResourceLimits;
}

export interface SessionOptions {
  model?: string;
  tools?: ToolRestriction[];
  context?: SessionContext;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  workingDirectory?: string;
  env?: Record<string, string>;
  parentId?: string;
}

export interface SpawnOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
}

export interface ExecuteOptions {
  timeout?: number;
  stream?: boolean;
  tools?: string[];
}

export interface StreamOptions {
  bufferSize?: number;
  timeout?: number;
}

export interface ExecuteResult {
  output: string;
  toolUses: ToolUse[];
  metadata: ExecutionMetadata;
}

export interface SessionContext {
  systemPrompt?: string;
  history?: Message[];
  files?: string[];
  workingDirectory?: string;
}

export interface SessionState {
  id: string;
  status: 'active' | 'idle' | 'terminated' | 'error';
  context: SessionContext;
  metadata: SessionMetadata;
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  handler?: (params: unknown) => Promise<unknown>;
}

export interface ToolRestriction {
  type: 'allow' | 'deny';
  tools: string[];
}

export interface ToolConfiguration {
  tools: Tool[];
  restrictions?: ToolRestriction[];
}

export interface ToolUse {
  toolName: string;
  parameters: unknown;
  result?: unknown;
  error?: string;
  timestamp: Date;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ProcessOutput {
  stdout: string;
  stderr: string;
  combined: string;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface ResourceLimits {
  maxMemory?: number;
  maxCpu?: number;
  maxProcesses?: number;
}

export interface ExecutionMetadata {
  startTime: Date;
  endTime: Date;
  duration: number;
  tokensUsed?: number;
  model: string;
}

export interface SessionMetadata {
  createdAt: Date;
  lastUsedAt: Date;
  messageCount: number;
  toolUseCount: number;
}
