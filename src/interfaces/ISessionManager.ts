import type { IResult } from '@chasenocap/di-framework';
import type { IClaudeSession } from './IClaudeSession.js';
import type { SessionOptions, Message, SessionContext } from '../types/options.js';

export interface ISessionManager {
  // Session lifecycle
  createSession(options: SessionOptions): Promise<IResult<IClaudeSession>>;
  forkSession(fromSessionId: string, atMessageId?: string): Promise<IResult<IClaudeSession>>;
  linkSessions(parentId: string, childId: string): Promise<IResult<void>>;
  destroySession(sessionId: string, preserveHistory?: boolean): Promise<IResult<void>>;

  // Session retrieval
  getSession(sessionId: string): Promise<IResult<IClaudeSession>>;
  getActiveSessions(): Promise<IClaudeSession[]>;
  getSessionLineage(sessionId: string): Promise<IResult<SessionLineage>>;

  // History management
  getFullHistory(sessionId: string): Promise<IResult<ConversationHistory>>;
  getHistoryBetween(
    sessionId: string,
    fromMessageId: string,
    toMessageId: string,
  ): Promise<IResult<Message[]>>;
  compactHistory(sessionId: string, strategy: CompactionStrategy): Promise<IResult<void>>;

  // Context management
  saveCheckpoint(sessionId: string, name?: string): Promise<IResult<string>>;
  restoreFromCheckpoint(checkpointId: string): Promise<IResult<IClaudeSession>>;
  mergeContexts(sessionIds: string[]): Promise<IResult<SessionContext>>;

  // Cache management
  getCachedResponse(sessionId: string, prompt: string): Promise<IResult<CachedResponse | null>>;
  invalidateCache(sessionId: string): Promise<IResult<void>>;
  pruneCache(strategy: CachePruneStrategy): Promise<IResult<number>>;
}

export interface SessionLineage {
  sessionId: string;
  parentId?: string;
  childIds: string[];
  forkPoint?: MessageReference;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface ConversationHistory {
  sessionId: string;
  messages: MessageWithMetadata[];
  forkPoints: ForkPoint[];
  lineage: SessionLineage;
  context: SessionContext;
}

export interface MessageWithMetadata extends Message {
  id: string;
  sessionId: string;
  parentMessageId?: string;
  childMessageIds: string[];
  isForkPoint: boolean;
  metadata: {
    tokensUsed?: number;
    generatedAt: Date;
    cached: boolean;
  };
}

export interface ForkPoint {
  messageId: string;
  originalSessionId: string;
  forkedSessionIds: string[];
  timestamp: Date;
}

export interface MessageReference {
  messageId: string;
  sessionId: string;
  index: number;
}

export interface CachedResponse {
  prompt: string;
  response: string;
  messageId: string;
  timestamp: Date;
  ttl: number;
}

export type CompactionStrategy =
  | { type: 'summarize'; maxTokens?: number; preserveForks?: boolean }
  | { type: 'truncate'; keepLast: number; preserveForks?: boolean }
  | { type: 'claude-compact'; instruction?: string }
  | { type: 'smart'; targetTokens: number; importance?: 'recent' | 'forked' | 'tooluse' };

export type CachePruneStrategy =
  | { type: 'age'; olderThan: Date }
  | { type: 'size'; maxSize: number }
  | { type: 'lru'; keep: number }
  | { type: 'unused'; inactiveDays: number };
