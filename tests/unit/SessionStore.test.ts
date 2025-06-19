import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../../src/implementations/SessionStore.js';
import type { SessionContext, Message } from '../../src/types/options.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  describe('Session Management', () => {
    it('should save and retrieve session', async () => {
      const sessionId = 'test-session-1';
      const context: SessionContext = {
        systemPrompt: 'Test prompt',
        history: [],
      };

      const saveResult = await store.saveSession(sessionId, undefined, context);
      expect(saveResult.success).toBe(true);

      const historyResult = await store.getConversationHistory(sessionId);
      expect(historyResult.success).toBe(true);
      expect(historyResult.value.sessionId).toBe(sessionId);
      expect(historyResult.value.context).toEqual(context);
    });

    it('should handle parent-child relationships', async () => {
      const parentId = 'parent-session';
      const childId = 'child-session';

      await store.saveSession(parentId);
      await store.saveSession(childId, parentId);

      const parentLineage = await store.getSessionLineage(parentId);
      const childLineage = await store.getSessionLineage(childId);

      expect(parentLineage.success).toBe(true);
      expect(parentLineage.value.childIds).toContain(childId);

      expect(childLineage.success).toBe(true);
      expect(childLineage.value.parentId).toBe(parentId);
    });
  });

  describe('Message Management', () => {
    it('should add messages to session', async () => {
      const sessionId = 'test-session-2';
      await store.saveSession(sessionId);

      const message1: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      const message2: Message = {
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
      };

      const result1 = await store.addMessage(sessionId, message1);
      const result2 = await store.addMessage(sessionId, message2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const history = await store.getConversationHistory(sessionId);
      expect(history.success).toBe(true);
      expect(history.value.messages).toHaveLength(2);
      expect(history.value.messages[0]?.content).toBe('Hello');
      expect(history.value.messages[1]?.content).toBe('Hi there!');
    });

    it('should link messages with parent-child relationships', async () => {
      const sessionId = 'test-session-3';
      await store.saveSession(sessionId);

      const message1: Message = {
        role: 'user',
        content: 'First',
        timestamp: new Date(),
      };

      const message2: Message = {
        role: 'assistant',
        content: 'Second',
        timestamp: new Date(),
      };

      const result1 = await store.addMessage(sessionId, message1);
      const result2 = await store.addMessage(sessionId, message2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const msg1 = result1.value;
      const msg2 = result2.value;

      expect(msg2.parentMessageId).toBe(msg1.id);
      expect(msg1.childMessageIds).toContain(msg2.id);
    });
  });

  describe('Session Forking', () => {
    it('should fork session at latest message', async () => {
      const originalId = 'original-session';
      await store.saveSession(originalId);

      // Add some messages
      await store.addMessage(originalId, {
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
      });

      await store.addMessage(originalId, {
        role: 'assistant',
        content: 'Response 1',
        timestamp: new Date(),
      });

      const forkResult = await store.forkSession(originalId);
      expect(forkResult.success).toBe(true);

      const forkedId = forkResult.value.newSessionId;
      const forkedHistory = await store.getConversationHistory(forkedId);

      expect(forkedHistory.success).toBe(true);
      expect(forkedHistory.value.messages).toHaveLength(2);
      expect(forkedHistory.value.lineage.parentId).toBe(originalId);
    });

    it('should fork session at specific message', async () => {
      const originalId = 'original-session-2';
      await store.saveSession(originalId);

      const msg1 = await store.addMessage(originalId, {
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
      });

      const msg2 = await store.addMessage(originalId, {
        role: 'assistant',
        content: 'Response 1',
        timestamp: new Date(),
      });

      const msg3 = await store.addMessage(originalId, {
        role: 'user',
        content: 'Message 2',
        timestamp: new Date(),
      });

      // Fork at message 1
      const forkResult = await store.forkSession(originalId, msg1.value.id);
      expect(forkResult.success).toBe(true);

      const forkedHistory = await store.getConversationHistory(forkResult.value.newSessionId);
      expect(forkedHistory.success).toBe(true);
      expect(forkedHistory.value.messages).toHaveLength(1);
      expect(forkedHistory.value.messages[0]?.content).toBe('Message 1');
    });

    it('should mark fork points', async () => {
      const originalId = 'original-session-3';
      await store.saveSession(originalId);

      const msg1 = await store.addMessage(originalId, {
        role: 'user',
        content: 'Fork point',
        timestamp: new Date(),
      });

      const forkResult = await store.forkSession(originalId);
      expect(forkResult.success).toBe(true);

      const originalHistory = await store.getConversationHistory(originalId);
      expect(originalHistory.success).toBe(true);
      expect(originalHistory.value.forkPoints).toHaveLength(1);
      expect(originalHistory.value.forkPoints[0]?.originalSessionId).toBe(originalId);
    });
  });

  describe('Response Caching', () => {
    it('should cache and retrieve responses', async () => {
      const sessionId = 'cache-session';
      await store.saveSession(sessionId);

      const prompt = 'What is TypeScript?';
      const response = 'TypeScript is a typed superset of JavaScript.';
      const messageId = 'msg-123';

      await store.cacheResponse(sessionId, prompt, response, messageId);

      const cachedResult = await store.getCachedResponse(sessionId, prompt);
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.value).not.toBeNull();
      expect(cachedResult.value?.response).toBe(response);
      expect(cachedResult.value?.messageId).toBe(messageId);
    });

    it('should return null for uncached prompts', async () => {
      const sessionId = 'cache-session-2';
      await store.saveSession(sessionId);

      const cachedResult = await store.getCachedResponse(sessionId, 'uncached prompt');
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.value).toBeNull();
    });

    it('should handle cache expiration', async () => {
      const sessionId = 'cache-session-3';
      await store.saveSession(sessionId);

      const prompt = 'Expired prompt';
      const response = 'This will expire';
      const messageId = 'msg-456';

      // Cache with 1ms TTL
      await store.cacheResponse(sessionId, prompt, response, messageId, 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 5));

      const cachedResult = await store.getCachedResponse(sessionId, prompt);
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.value).toBeNull();
    });

    it('should prune expired cache entries', async () => {
      const sessionId = 'cache-session-4';
      await store.saveSession(sessionId);

      // Add multiple cache entries with different TTLs
      await store.cacheResponse(sessionId, 'prompt1', 'response1', 'msg1', 1);
      await store.cacheResponse(sessionId, 'prompt2', 'response2', 'msg2', 10000);

      // Wait for first to expire
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Prune cache
      await store.pruneCache(sessionId);

      // Check results
      const cached1 = await store.getCachedResponse(sessionId, 'prompt1');
      const cached2 = await store.getCachedResponse(sessionId, 'prompt2');

      expect(cached1.value).toBeNull();
      expect(cached2.value).not.toBeNull();
    });
  });

  describe('Checkpoints', () => {
    it('should create and restore checkpoints', async () => {
      const sessionId = 'checkpoint-session';
      await store.saveSession(sessionId);

      // Add some messages
      await store.addMessage(sessionId, {
        role: 'user',
        content: 'Before checkpoint',
        timestamp: new Date(),
      });

      // Create checkpoint
      const checkpointResult = await store.createCheckpoint(sessionId, 'test-checkpoint');
      expect(checkpointResult.success).toBe(true);

      const checkpointId = checkpointResult.value;

      // Add more messages
      await store.addMessage(sessionId, {
        role: 'user',
        content: 'After checkpoint',
        timestamp: new Date(),
      });

      // Restore checkpoint
      const restored = await store.restoreCheckpoint(checkpointId);
      expect(restored.success).toBe(true);
      expect(restored.value.messages).toHaveLength(1);
      expect(restored.value.messages[0]?.content).toBe('Before checkpoint');
      expect(restored.value.name).toBe('test-checkpoint');
    });

    it('should handle non-existent checkpoints', async () => {
      const result = await store.restoreCheckpoint('non-existent');
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle adding message to non-existent session', async () => {
      const result = await store.addMessage('non-existent', {
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not found');
    });

    it('should handle forking non-existent session', async () => {
      const result = await store.forkSession('non-existent');
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not found');
    });

    it('should handle invalid message ID in fork', async () => {
      const sessionId = 'error-session';
      await store.saveSession(sessionId);

      const result = await store.forkSession(sessionId, 'invalid-message-id');
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('not found');
    });
  });
});
