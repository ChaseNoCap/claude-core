import { inject, injectable } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import type { IResult } from '@chasenocap/di-framework';
import { Result } from '@chasenocap/di-framework';
import type { IClaude } from '../interfaces/IClaude.js';
import type { IClaudeSession } from '../interfaces/IClaudeSession.js';
import type { ISubprocess } from '../interfaces/ISubprocess.js';
import type { IToolManager } from '../interfaces/IToolManager.js';
import type {
  SessionOptions,
  SpawnOptions,
  ToolConfiguration,
  ClaudeOptions,
} from '../types/options.js';
import { CLAUDE_TYPES } from '../types/injection-tokens.js';
import { ClaudeEventType } from '../types/events.js';
import { StatelessClaudeSession } from './StatelessClaudeSession.js';
import { Subprocess } from './Subprocess.js';
import { ProcessUtils } from '../utils/process-utils.js';
import { SessionStore } from './SessionStore.js';

@injectable()
export class Claude implements IClaude {
  private sessions: Map<string, IClaudeSession> = new Map();
  private sessionIdCounter = 0;

  constructor(
    @inject(CLAUDE_TYPES.ILogger) private logger: ILogger,
    @inject(CLAUDE_TYPES.IEventBus) private eventBus: IEventBus,
    @inject(CLAUDE_TYPES.IToolManager) private toolManager: IToolManager,
    @inject(CLAUDE_TYPES.ClaudeOptions) private options: ClaudeOptions,
    @inject(CLAUDE_TYPES.SessionStore) private sessionStore: SessionStore,
  ) {
    this.setupCleanupHandlers();
  }

  private cleanupHandler = () => void this.cleanup();

  private setupCleanupHandlers(): void {
    // Store the handler so we can remove it later
    process.on('SIGINT', this.cleanupHandler);
    process.on('SIGTERM', this.cleanupHandler);
    process.on('exit', this.cleanupHandler);
  }

  async createSession(options: SessionOptions): Promise<IResult<IClaudeSession>> {
    try {
      const sessionId = this.generateSessionId();

      // Use StatelessClaudeSession instead of trying to maintain a subprocess
      const session = new StatelessClaudeSession(
        this.logger,
        this.eventBus,
        this.toolManager,
        this.sessionStore,
        sessionId,
        {
          ...options,
          claudePath: this.options.claudePath,
        },
      );

      if (options.tools) {
        this.toolManager.applyRestrictions(options.tools);
      }

      await session.initialize();
      this.sessions.set(sessionId, session);

      this.logger.info(`Created stateless session ${sessionId}`);
      return Result.success(session);
    } catch (error) {
      this.logger.error('Failed to create session:', error);
      return Result.fail(error as Error);
    }
  }

  async destroySession(id: string): Promise<IResult<void>> {
    try {
      const session = this.sessions.get(id);
      if (!session) {
        return Result.fail(new Error(`Session ${id} not found`));
      }

      await session.destroy();
      this.sessions.delete(id);

      this.logger.info(`Destroyed session ${id}`);
      return Result.success(undefined);
    } catch (error) {
      this.logger.error(`Failed to destroy session ${id}:`, error);
      return Result.fail(error as Error);
    }
  }

  async restoreSession(id: string): Promise<IResult<IClaudeSession>> {
    try {
      const session = this.sessions.get(id);
      if (!session) {
        return Result.fail(new Error(`Session ${id} not found`));
      }

      const state = await session.getState();
      if (state.status === 'terminated' || state.status === 'error') {
        return Result.fail(new Error(`Session ${id} is not active`));
      }

      return Result.success(session);
    } catch (error) {
      this.logger.error(`Failed to restore session ${id}:`, error);
      return Result.fail(error as Error);
    }
  }

  registerTools(tools: ToolConfiguration): void {
    for (const tool of tools.tools) {
      this.toolManager.registerTool(tool);
    }

    if (tools.restrictions) {
      this.toolManager.applyRestrictions(tools.restrictions);
    }
  }

  async spawn(options: SpawnOptions): Promise<IResult<ISubprocess>> {
    try {
      const retryOptions = this.options.retryOptions || {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
      };

      let lastError: Error | null = null;
      let attempt = 0;

      while (attempt < retryOptions.maxAttempts) {
        try {
          const process = ProcessUtils.spawn(options.command, options.args || [], options);
          const subprocess = new Subprocess(process, options.maxBuffer);

          await this.eventBus.emit({
            type: ClaudeEventType.ProcessSpawned,
            timestamp: new Date(),
            data: {
              pid: subprocess.pid,
              command: options.command,
              args: options.args || [],
            },
          });

          return Result.success(subprocess);
        } catch (error) {
          lastError = error as Error;
          attempt++;

          if (attempt < retryOptions.maxAttempts) {
            const delay = Math.min(
              retryOptions.initialDelay * Math.pow(retryOptions.backoffFactor, attempt - 1),
              retryOptions.maxDelay,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error('Failed to spawn process');
    } catch (error) {
      this.logger.error('Failed to spawn process:', error);
      return Result.fail(error as Error);
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Claude instance...');

    const destroyPromises = Array.from(this.sessions.keys()).map((id) =>
      this.destroySession(id).catch((error) =>
        this.logger.error(`Failed to destroy session ${id} during cleanup:`, error),
      ),
    );

    await Promise.all(destroyPromises);
    this.sessions.clear();

    // Remove event listeners to prevent memory leaks
    process.removeListener('SIGINT', this.cleanupHandler);
    process.removeListener('SIGTERM', this.cleanupHandler);
    process.removeListener('exit', this.cleanupHandler);

    this.logger.info('Claude cleanup complete');
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${++this.sessionIdCounter}`;
  }
}
