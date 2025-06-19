import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import type { IResult } from '@chasenocap/di-framework';
import { Claude } from '../../src/implementations/Claude.js';
import { ToolManager } from '../../src/implementations/ToolManager.js';
import { SessionStore } from '../../src/implementations/SessionStore.js';
import { CLAUDE_TYPES } from '../../src/types/injection-tokens.js';
import { ClaudeEventType } from '../../src/types/events.js';
import type { ClaudeOptions, SessionOptions, ToolConfiguration } from '../../src/types/options.js';
import { ClaudeModel } from '../../src/types/models.js';

describe('Claude', () => {
  let container: Container;
  let claude: Claude;
  let mockLogger: ILogger;
  let mockEventBus: IEventBus;
  let toolManager: ToolManager;
  let sessionStore: SessionStore;

  beforeEach(() => {
    container = new Container();

    // Mock dependencies
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockEventBus = {
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Configure DI container
    container.bind<ILogger>(CLAUDE_TYPES.ILogger).toConstantValue(mockLogger);
    container.bind<IEventBus>(CLAUDE_TYPES.IEventBus).toConstantValue(mockEventBus);
    container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
    container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
    container.bind<ClaudeOptions>(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
      claudePath: 'claude',
      defaultModel: ClaudeModel.OPUS_4,
    });

    toolManager = container.get(CLAUDE_TYPES.IToolManager);
    sessionStore = container.get(CLAUDE_TYPES.SessionStore);

    claude = new Claude(
      mockLogger,
      mockEventBus,
      toolManager,
      container.get(CLAUDE_TYPES.ClaudeOptions),
      sessionStore
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const options: SessionOptions = {
        model: 'claude-3-opus-20240229',
        context: {
          systemPrompt: 'You are a helpful assistant.',
        },
      };

      const result = await claude.createSession(options);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toMatch(/^session-\d+-\d+$/);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created stateless session'));
    });

    it('should apply tool restrictions when provided', async () => {
      const options: SessionOptions = {
        model: 'claude-3-opus-20240229',
        tools: [
          { type: 'allow', tools: ['read_file', 'write_file'] }
        ],
      };

      const applyRestrictionsSpy = vi.spyOn(toolManager, 'applyRestrictions');
      const result = await claude.createSession(options);

      expect(result.success).toBe(true);
      expect(applyRestrictionsSpy).toHaveBeenCalledWith(options.tools);
    });

    it('should handle session creation errors', async () => {
      const options: SessionOptions = {
        model: 'claude-3-opus-20240229',
      };

      // Mock the StatelessClaudeSession to throw during initialize
      const StatelessClaudeSession = await import('../../src/implementations/StatelessClaudeSession.js');
      const initializeSpy = vi.spyOn(StatelessClaudeSession.StatelessClaudeSession.prototype, 'initialize');
      initializeSpy.mockRejectedValueOnce(new Error('Initialization failed'));

      const result = await claude.createSession(options);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create session:', expect.any(Error));
      
      initializeSpy.mockRestore();
    });
  });

  describe('destroySession', () => {
    it('should destroy an existing session', async () => {
      // First create a session
      const createResult = await claude.createSession({});
      expect(createResult.success).toBe(true);
      const sessionId = createResult.value!.id;

      // Then destroy it
      const destroyResult = await claude.destroySession(sessionId);

      expect(destroyResult.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(`Destroyed session ${sessionId}`);
    });

    it('should fail when destroying non-existent session', async () => {
      const result = await claude.destroySession('non-existent-session');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Session non-existent-session not found');
    });

    it('should handle destroy errors', async () => {
      const createResult = await claude.createSession({});
      const sessionId = createResult.value!.id;
      const session = createResult.value!;

      vi.spyOn(session, 'destroy').mockRejectedValueOnce(new Error('Destroy failed'));

      const result = await claude.destroySession(sessionId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Destroy failed');
      expect(mockLogger.error).toHaveBeenCalledWith(`Failed to destroy session ${sessionId}:`, expect.any(Error));
    });
  });

  describe('restoreSession', () => {
    it('should restore an active session', async () => {
      const createResult = await claude.createSession({});
      const sessionId = createResult.value!.id;

      const restoreResult = await claude.restoreSession(sessionId);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.value?.id).toBe(sessionId);
    });

    it('should fail when restoring non-existent session', async () => {
      const result = await claude.restoreSession('non-existent-session');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Session non-existent-session not found');
    });

    it('should fail when restoring terminated session', async () => {
      const createResult = await claude.createSession({});
      const sessionId = createResult.value!.id;
      const session = createResult.value!;

      // Mock getState to return terminated status
      vi.spyOn(session, 'getState').mockResolvedValueOnce({
        id: sessionId,
        status: 'terminated',
        context: {},
        metadata: {
          createdAt: new Date(),
          lastUsedAt: new Date(),
          messageCount: 0,
          toolUseCount: 0,
        },
      });

      const result = await claude.restoreSession(sessionId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Session session-');
      expect(result.error?.message).toContain('is not active');
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools', () => {
      const toolConfig: ToolConfiguration = {
        tools: [
          { name: 'tool1', description: 'First tool' },
          { name: 'tool2', description: 'Second tool' },
        ],
      };

      const registerSpy = vi.spyOn(toolManager, 'registerTool');
      claude.registerTools(toolConfig);

      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registerSpy).toHaveBeenCalledWith(toolConfig.tools[0]);
      expect(registerSpy).toHaveBeenCalledWith(toolConfig.tools[1]);
    });

    it('should apply restrictions when provided', () => {
      const toolConfig: ToolConfiguration = {
        tools: [{ name: 'tool1', description: 'First tool' }],
        restrictions: [{ type: 'deny', tools: ['dangerous_tool'] }],
      };

      const restrictionsSpy = vi.spyOn(toolManager, 'applyRestrictions');
      claude.registerTools(toolConfig);

      expect(restrictionsSpy).toHaveBeenCalledWith(toolConfig.restrictions);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all sessions', async () => {
      // Create multiple sessions
      const session1 = await claude.createSession({});
      const session2 = await claude.createSession({});
      const session3 = await claude.createSession({});

      expect(session1.success).toBe(true);
      expect(session2.success).toBe(true);
      expect(session3.success).toBe(true);

      // Perform cleanup
      await claude.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Cleaning up Claude instance...');
      expect(mockLogger.info).toHaveBeenCalledWith('Claude cleanup complete');

      // Verify sessions are no longer accessible
      const restore1 = await claude.restoreSession(session1.value!.id);
      const restore2 = await claude.restoreSession(session2.value!.id);
      const restore3 = await claude.restoreSession(session3.value!.id);

      expect(restore1.success).toBe(false);
      expect(restore2.success).toBe(false);
      expect(restore3.success).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      const session = await claude.createSession({});
      const sessionId = session.value!.id;

      // Mock destroy to throw an error
      vi.spyOn(session.value!, 'destroy').mockRejectedValueOnce(new Error('Cleanup error'));

      await claude.cleanup();

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to destroy session ${sessionId}:`,
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Claude cleanup complete');
    });
  });

  describe('spawn', () => {
    it('should spawn a process successfully', async () => {
      const options = {
        command: 'echo',
        args: ['hello'],
      };

      const result = await claude.spawn(options);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ClaudeEventType.ProcessSpawned,
          data: expect.objectContaining({
            command: 'echo',
            args: ['hello'],
          }),
        })
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      const ProcessUtils = await import('../../src/utils/process-utils.js');
      const spawnSpy = vi.spyOn(ProcessUtils.ProcessUtils, 'spawn');
      spawnSpy.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const options = {
        command: 'test-command',
        args: [],
      };

      const result = await claude.spawn(options);

      expect(result.success).toBe(false);
      expect(spawnSpy).toHaveBeenCalledTimes(3); // Default retry attempts
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to spawn process:', expect.any(Error));
      
      spawnSpy.mockRestore();
    });
  });

  describe('process lifecycle events', () => {
    it('should setup cleanup handlers on construction', () => {
      const processOnSpy = vi.spyOn(process, 'on');

      new Claude(mockLogger, mockEventBus, toolManager, { claudePath: 'claude' }, sessionStore);

      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('exit', expect.any(Function));
    });
  });
});