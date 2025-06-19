export enum ClaudeEventType {
  SessionCreated = 'session.created',
  SessionDestroyed = 'session.destroyed',
  SessionError = 'session.error',
  ToolUsed = 'tool.used',
  ToolError = 'tool.error',
  OutputReceived = 'output.received',
  ProcessSpawned = 'process.spawned',
  ProcessExited = 'process.exited',
  ProcessError = 'process.error',
}

export interface ClaudeEvent<T = unknown> {
  type: ClaudeEventType;
  sessionId?: string;
  timestamp: Date;
  data: T;
}

export interface SessionCreatedEvent {
  sessionId: string;
  options: Record<string, unknown>;
}

export interface SessionDestroyedEvent {
  sessionId: string;
  reason?: string;
}

export interface SessionErrorEvent {
  sessionId: string;
  error: Error;
}

export interface ToolUsedEvent {
  sessionId: string;
  toolName: string;
  parameters: unknown;
  result?: unknown;
}

export interface OutputReceivedEvent {
  sessionId: string;
  output: string;
  stream: 'stdout' | 'stderr';
}

export interface ProcessSpawnedEvent {
  pid: number;
  command: string;
  args: string[];
}

export interface ProcessExitedEvent {
  pid: number;
  exitCode: number;
  signal?: string;
}
