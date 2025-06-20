import { injectable } from 'inversify';
import type { IResult } from '@chasenocap/di-framework';
import { Result } from '@chasenocap/di-framework';
import type { SessionContext, Message } from '../types/options.js';
import type {
  MessageWithMetadata,
  SessionLineage,
  ConversationHistory,
  ForkPoint,
  CachedResponse,
} from '../interfaces/ISessionManager.js';

interface StoredSession {
  id: string;
  parentId?: string;
  childIds: string[];
  context: SessionContext;
  messages: MessageWithMetadata[];
  forkPoints: ForkPoint[];
  createdAt: Date;
  lastAccessedAt: Date;
  checkpoints: Map<string, SessionSnapshot>;
}

interface SessionSnapshot {
  id: string;
  name?: string;
  sessionId: string;
  context: SessionContext;
  messages: MessageWithMetadata[];
  createdAt: Date;
}

@injectable()
export class SessionStore {
  private sessions = new Map<string, StoredSession>();
  private messageIndex = new Map<string, MessageWithMetadata>();
  private responseCache = new Map<string, CachedResponse[]>();
  private checkpoints = new Map<string, SessionSnapshot>();
  private messageIdCounter = 0;

  async saveSession(
    sessionId: string,
    parentId?: string,
    context?: SessionContext,
  ): Promise<IResult<void>> {
    try {
      const session: StoredSession = {
        id: sessionId,
        parentId,
        childIds: [],
        context: context || { history: [] },
        messages: [],
        forkPoints: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        checkpoints: new Map(),
      };

      this.sessions.set(sessionId, session);

      // Link parent-child relationship
      if (parentId) {
        const parent = this.sessions.get(parentId);
        if (parent) {
          parent.childIds.push(sessionId);
        }
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async addMessage(
    sessionId: string,
    message: Message,
    metadata?: Partial<MessageWithMetadata>,
  ): Promise<IResult<MessageWithMetadata>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return Result.fail(new Error(`Session ${sessionId} not found`));
      }

      const lastMessage = session.messages[session.messages.length - 1];
      const messageWithMeta: MessageWithMetadata = {
        ...message,
        id: `msg-${sessionId}-${++this.messageIdCounter}`,
        sessionId,
        parentMessageId: lastMessage?.id,
        childMessageIds: [],
        isForkPoint: false,
        metadata: {
          generatedAt: new Date(),
          cached: false,
          ...metadata?.metadata,
        },
      };

      // Update parent's child references
      if (lastMessage) {
        lastMessage.childMessageIds.push(messageWithMeta.id);
      }

      session.messages.push(messageWithMeta);
      session.lastAccessedAt = new Date();
      this.messageIndex.set(messageWithMeta.id, messageWithMeta);

      // Update context history
      if (!session.context.history) {
        session.context.history = [];
      }
      session.context.history.push(message);

      return Result.success(messageWithMeta);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async forkSession(
    fromSessionId: string,
    atMessageId?: string,
  ): Promise<IResult<{ newSessionId: string; context: SessionContext }>> {
    try {
      const sourceSession = this.sessions.get(fromSessionId);
      if (!sourceSession) {
        return Result.fail(new Error(`Session ${fromSessionId} not found`));
      }

      const newSessionId = `session-fork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Find fork point
      let forkIndex = sourceSession.messages.length;
      if (atMessageId) {
        forkIndex = sourceSession.messages.findIndex((m) => m.id === atMessageId) + 1;
        if (forkIndex === 0) {
          return Result.fail(new Error(`Message ${atMessageId} not found`));
        }
      }

      // Copy messages up to fork point
      const forkedMessages = sourceSession.messages.slice(0, forkIndex).map((msg) => ({
        ...msg,
        sessionId: newSessionId,
        id: `msg-${newSessionId}-${++this.messageIdCounter}`,
      }));

      // Create fork point record
      const forkPoint: ForkPoint = {
        messageId: atMessageId || sourceSession.messages[forkIndex - 1]?.id || '',
        originalSessionId: fromSessionId,
        forkedSessionIds: [newSessionId],
        timestamp: new Date(),
      };

      // Mark the message as a fork point
      if (forkPoint.messageId) {
        const originalMessage = this.messageIndex.get(forkPoint.messageId);
        if (originalMessage) {
          originalMessage.isForkPoint = true;
        }
      }

      // Create new context with history up to fork point
      const forkedContext: SessionContext = {
        ...sourceSession.context,
        history: sourceSession.context.history?.slice(0, forkIndex) || [],
      };

      // Save the new session
      await this.saveSession(newSessionId, fromSessionId, forkedContext);

      const newSession = this.sessions.get(newSessionId)!;
      newSession.messages = forkedMessages;
      newSession.forkPoints = [...sourceSession.forkPoints, forkPoint];
      
      // Update the message index with forked messages
      forkedMessages.forEach(msg => {
        this.messageIndex.set(msg.id, msg);
      });

      // Update source session's fork points
      sourceSession.forkPoints.push(forkPoint);

      return Result.success({
        newSessionId,
        context: forkedContext,
      });
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async getSessionLineage(sessionId: string): Promise<IResult<SessionLineage>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return Result.fail(new Error(`Session ${sessionId} not found`));
      }

      const lineage: SessionLineage = {
        sessionId,
        parentId: session.parentId,
        childIds: session.childIds,
        createdAt: session.createdAt,
        metadata: {
          messageCount: session.messages.length,
          forkCount: session.forkPoints.length,
          lastAccessed: session.lastAccessedAt,
        },
      };

      return Result.success(lineage);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async getConversationHistory(sessionId: string): Promise<IResult<ConversationHistory>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return Result.fail(new Error(`Session ${sessionId} not found`));
      }

      const lineageResult = await this.getSessionLineage(sessionId);
      if (!lineageResult.success) {
        return Result.fail(lineageResult.error);
      }

      const history: ConversationHistory = {
        sessionId,
        messages: session.messages,
        forkPoints: session.forkPoints,
        lineage: lineageResult.value,
        context: session.context,
      };

      return Result.success(history);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async cacheResponse(
    sessionId: string,
    prompt: string,
    response: string,
    messageId: string,
    ttl: number = 3600000, // 1 hour default
  ): Promise<IResult<void>> {
    try {
      const cached: CachedResponse = {
        prompt,
        response,
        messageId,
        timestamp: new Date(),
        ttl,
      };

      const sessionCache = this.responseCache.get(sessionId) || [];
      sessionCache.push(cached);
      this.responseCache.set(sessionId, sessionCache);

      return Result.success(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async getCachedResponse(
    sessionId: string,
    prompt: string,
  ): Promise<IResult<CachedResponse | null>> {
    try {
      const sessionCache = this.responseCache.get(sessionId) || [];
      const now = Date.now();

      // Find matching cached response that hasn't expired
      const cached = sessionCache.find(
        (c) => c.prompt === prompt && now - c.timestamp.getTime() < c.ttl,
      );

      return Result.success(cached || null);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async createCheckpoint(sessionId: string, name?: string): Promise<IResult<string>> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return Result.fail(new Error(`Session ${sessionId} not found`));
      }

      const checkpointId = `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const snapshot: SessionSnapshot = {
        id: checkpointId,
        name,
        sessionId,
        context: { ...session.context },
        messages: [...session.messages],
        createdAt: new Date(),
      };

      this.checkpoints.set(checkpointId, snapshot);
      session.checkpoints.set(checkpointId, snapshot);

      return Result.success(checkpointId);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async restoreCheckpoint(checkpointId: string): Promise<IResult<SessionSnapshot>> {
    try {
      const checkpoint = this.checkpoints.get(checkpointId);
      if (!checkpoint) {
        return Result.fail(new Error(`Checkpoint ${checkpointId} not found`));
      }

      return Result.success(checkpoint);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  async pruneCache(sessionId?: string): Promise<void> {
    const now = Date.now();

    if (sessionId) {
      const sessionCache = this.responseCache.get(sessionId) || [];
      const validCache = sessionCache.filter((c) => now - c.timestamp.getTime() < c.ttl);
      this.responseCache.set(sessionId, validCache);
    } else {
      // Prune all session caches
      for (const [sid, cache] of this.responseCache.entries()) {
        const validCache = cache.filter((c) => now - c.timestamp.getTime() < c.ttl);
        if (validCache.length > 0) {
          this.responseCache.set(sid, validCache);
        } else {
          this.responseCache.delete(sid);
        }
      }
    }
  }
}
