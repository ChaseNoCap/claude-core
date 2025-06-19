import type { IResult } from '@chasenocap/di-framework';
import type {
  ExecuteOptions,
  ExecuteResult,
  SessionContext,
  SessionState,
  StreamOptions,
  Message,
} from '../types/options.js';
import type { MessageWithMetadata, SessionLineage } from './ISessionManager.js';

export interface IClaudeSession {
  readonly id: string;
  readonly parentId?: string;
  readonly createdAt: Date;

  // Core execution methods
  execute(prompt: string, options?: ExecuteOptions): Promise<any>; // Temporarily use 'any' to fix build
  stream(prompt: string, options?: StreamOptions): AsyncIterable<string>;

  // Context management
  updateContext(context: Partial<SessionContext>): Promise<IClaudeSession>;
  getContext(): Promise<SessionContext>;
  getState(): Promise<SessionState>;

  // History access
  getHistory(): Promise<MessageWithMetadata[]>;
  getLastMessage(): Promise<MessageWithMetadata | null>;
  getMessageById(messageId: string): Promise<MessageWithMetadata | null>;

  // Session operations
  fork(atMessageId?: string): Promise<IClaudeSession>;
  checkpoint(name?: string): Promise<string>;
  compact(strategy?: 'smart' | 'summarize' | 'truncate'): Promise<IClaudeSession>;

  // Lifecycle
  destroy(): Promise<void>;
  isActive(): boolean;
}

export interface IFluentSession {
  readonly session: IClaudeSession;
  readonly result: IResult<ExecuteResult>;
  readonly messageId: string;

  // Fluent continuation methods
  then(prompt: string, options?: ExecuteOptions): Promise<IFluentSession>;
  thenStream(prompt: string, options?: StreamOptions): AsyncIterable<string>;

  // Branching
  fork(): Promise<IClaudeSession>;
  branch(prompt: string, options?: ExecuteOptions): Promise<IFluentSession>;

  // Context modification
  withContext(context: Partial<SessionContext>): Promise<IFluentSession>;
  withSystemPrompt(prompt: string): Promise<IFluentSession>;

  // History operations
  summarize(): Promise<IFluentSession>;
  compact(): Promise<IFluentSession>;

  // Utilities
  getResponse(): string;
  getToolUses(): import('../types/options.js').ToolUse[];
  wasSuccessful(): boolean;
  getError(): Error | null;
}
