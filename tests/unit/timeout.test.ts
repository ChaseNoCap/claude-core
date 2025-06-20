import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Container } from 'inversify';
import { StatelessClaudeSession } from '../../src/implementations/StatelessClaudeSession.js';
import { CLAUDE_TYPES } from '../../src/types/injection-tokens.js';
import { ClaudeModel } from '../../src/types/models.js';
import { DEFAULT_TIMEOUTS, OPERATION_TIMEOUTS } from '../../src/constants/defaults.js';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import type { IToolManager } from '../../src/interfaces/IToolManager.js';
import type { SessionStore } from '../../src/implementations/SessionStore.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('Timeout Implementation', () => {
  let container: Container;
  let mockLogger: ILogger;
  let mockEventBus: IEventBus;
  let mockToolManager: IToolManager;
  let mockSessionStore: SessionStore;
  let mockProcess: any;

  beforeEach(() => {
    container = new Container();
    
    // Create mocks
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    mockToolManager = {
      getCliFlags: vi.fn(() => []),
      registerTool: vi.fn(),
      applyRestrictions: vi.fn(),
      canUseTool: vi.fn(() => true),
    } as any;

    mockSessionStore = {
      saveSession: vi.fn(),
      addMessage: vi.fn(),
      getHistory: vi.fn(() => ({ success: true, value: [] })),
    } as any;

    // Create mock process
    mockProcess = new EventEmitter();
    mockProcess.stdin = { write: vi.fn(), end: vi.fn() };
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = vi.fn();
    mockProcess.killed = false;

    // Setup spawn mock
    (spawn as any).mockReturnValue(mockProcess);

    // Bind mocks to container
    container.bind(CLAUDE_TYPES.ILogger).toConstantValue(mockLogger);
    container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(mockEventBus);
    container.bind(CLAUDE_TYPES.IToolManager).toConstantValue(mockToolManager);
    container.bind(CLAUDE_TYPES.SessionStore).toConstantValue(mockSessionStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Timeout Configuration', () => {
    it('should use default timeout when no options provided', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const executePromise = session.execute('Hello');

      // Wait a bit for the timeout to be set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Using timeout of ${DEFAULT_TIMEOUTS.STANDARD_REQUEST}ms`)
      );

      // Clean up by emitting exit
      mockProcess.emit('exit', 0);
      await executePromise;
    });

    it('should use custom timeout when provided in options', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { 
          model: ClaudeModel.OPUS_4,
          defaultTimeout: 5000 
        }
      );

      const executePromise = session.execute('Hello', { timeout: 3000 });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Using timeout of 3000ms')
      );

      // Clean up
      mockProcess.emit('exit', 0);
      await executePromise;
    });

    it('should use operation-specific timeout for quick operations', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const executePromise = session.execute('Yes or no?', { operationType: 'quick' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Using timeout of ${OPERATION_TIMEOUTS.QUICK_RESPONSE}ms`)
      );

      // Clean up
      mockProcess.emit('exit', 0);
      await executePromise;
    });

    it('should infer timeout from prompt content', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      // Test code generation inference
      const executePromise = session.execute('Write code to implement a binary search');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Using timeout of ${OPERATION_TIMEOUTS.CODE_GENERATION}ms`)
      );

      // Clean up
      mockProcess.emit('exit', 0);
      await executePromise;
    });
  });

  describe('Timeout Behavior', () => {
    it('should terminate process when timeout is reached', async () => {
      vi.useFakeTimers();
      
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const executePromise = session.execute('Hello', { timeout: 1000 });

      // Advance time to trigger timeout
      vi.advanceTimersByTime(1001);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request timed out after 1000ms')
      );

      // Simulate process exit after SIGTERM
      mockProcess.emit('exit', null, 'SIGTERM');

      const result = await executePromise;
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out after 1000ms');

      vi.useRealTimers();
    });

    it('should send SIGKILL if process does not terminate gracefully', async () => {
      vi.useFakeTimers();
      
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const executePromise = session.execute('Hello', { timeout: 1000 });

      // Trigger timeout
      vi.advanceTimersByTime(1001);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');

      // Advance time to trigger SIGKILL
      vi.advanceTimersByTime(DEFAULT_TIMEOUTS.KILL_GRACE_PERIOD + 1);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');

      // Simulate forced exit
      mockProcess.emit('exit', null, 'SIGKILL');

      const result = await executePromise;
      expect(result.success).toBe(false);

      vi.useRealTimers();
    });

    it('should clear timeouts when process exits normally', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const executePromise = session.execute('Hello', { timeout: 5000 });

      // Simulate successful response
      await new Promise(resolve => setTimeout(resolve, 10));
      mockProcess.stdout.emit('data', 'Response from Claude');
      mockProcess.emit('exit', 0);

      const result = await executePromise;
      expect(result.success).toBe(true);
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should handle process spawn errors gracefully', async () => {
      const spawnError = new Error('Failed to spawn process');
      (spawn as any).mockImplementationOnce(() => {
        throw spawnError;
      });

      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const result = await session.execute('Hello');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to spawn process');
    });
  });

  describe('Different Operation Types', () => {
    it('should use appropriate timeout for each operation type', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const operationTypes = [
        { type: 'quick', expected: OPERATION_TIMEOUTS.QUICK_RESPONSE },
        { type: 'text', expected: OPERATION_TIMEOUTS.TEXT_GENERATION },
        { type: 'code', expected: OPERATION_TIMEOUTS.CODE_GENERATION },
        { type: 'file', expected: OPERATION_TIMEOUTS.FILE_OPERATIONS },
        { type: 'system', expected: OPERATION_TIMEOUTS.SYSTEM_COMMANDS },
      ];

      for (const { type, expected } of operationTypes) {
        vi.clearAllMocks();
        
        const executePromise = session.execute('Test prompt', { 
          operationType: type as any 
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining(`Using timeout of ${expected}ms`)
        );

        // Clean up
        mockProcess.emit('exit', 0);
        await executePromise;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero timeout gracefully', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      // Zero timeout means no timeout
      const executePromise = session.execute('Hello', { timeout: 0 });

      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Emit data and exit in correct order
      mockProcess.stdout.emit('data', 'This is a response from Claude');
      mockProcess.emit('exit', 0);

      const result = await executePromise;
      expect(result.success).toBe(true);
      expect(result.value.output).toContain('This is a response from Claude');
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should handle very large timeouts', async () => {
      const session = new StatelessClaudeSession(
        mockLogger,
        mockEventBus,
        mockToolManager,
        mockSessionStore,
        'test-session',
        { model: ClaudeModel.OPUS_4 }
      );

      const largeTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const executePromise = session.execute('Hello', { timeout: largeTimeout });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Using timeout of ${largeTimeout}ms`)
      );

      // Clean up
      mockProcess.emit('exit', 0);
      await executePromise;
    });
  });
});