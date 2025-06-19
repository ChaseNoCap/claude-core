import type { IResult } from '@chasenocap/di-framework';
import type { Message, SessionContext } from '../types/options.js';

export interface IContextManager {
  saveContext(sessionId: string, context: SessionContext): Promise<IResult<void>>;
  loadContext(sessionId: string): Promise<IResult<SessionContext>>;
  appendMessage(sessionId: string, message: Message): Promise<IResult<void>>;
  getHistory(sessionId: string): Promise<IResult<Message[]>>;
  compactHistory(sessionId: string, strategy: CompactionStrategy): Promise<IResult<SessionContext>>;
  clearHistory(sessionId: string): Promise<IResult<void>>;
  exportHistory(sessionId: string): Promise<IResult<string>>;
  importHistory(sessionId: string, data: string): Promise<IResult<void>>;
}

export type CompactionStrategy =
  | { type: 'summarize'; maxMessages?: number }
  | { type: 'truncate'; keepLast: number }
  | { type: 'claude-compact'; prompt?: string }
  | { type: 'smart'; tokensLimit: number };
