import { inject, injectable } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import type { IResult } from '@chasenocap/di-framework';
import { Result } from '@chasenocap/di-framework';
import { spawn } from 'child_process';
import type { IClaudeSession } from '../interfaces/IClaudeSession.js';
import type { IToolManager } from '../interfaces/IToolManager.js';
import type { MessageWithMetadata } from '../interfaces/ISessionManager.js';
import type {
  ExecuteOptions,
  ExecuteResult,
  SessionContext,
  SessionState,
  StreamOptions,
  SessionOptions,
  ExecutionMetadata,
  SessionMetadata,
  Message,
  ClaudeOptions,
} from '../types/options.js';
import { CLAUDE_TYPES } from '../types/injection-tokens.js';
import { ClaudeEventType } from '../types/events.js';
import { OutputParser } from '../utils/output-parser.js';
import { SessionStore } from './SessionStore.js';
import { DEFAULT_CLAUDE_MODEL } from '../types/models.js';
import { DEFAULT_TIMEOUTS, OPERATION_TIMEOUTS } from '../constants/defaults.js';

/**
 * Stateless Claude session implementation that follows the pattern from the documentation.
 * Each execute() call passes the complete conversation history to Claude using the -p flag.
 */
@injectable()
export class StatelessClaudeSession implements IClaudeSession {
  readonly id: string;
  readonly parentId?: string;
  readonly createdAt: Date;

  private context: SessionContext;
  private metadata: SessionMetadata;
  private status: 'active' | 'idle' | 'terminated' | 'error' = 'active';
  private claudePath: string;
  private model: string;
  private messages: Message[] = [];
  private defaultTimeout: number;

  constructor(
    @inject(CLAUDE_TYPES.ILogger) private logger: ILogger,
    @inject(CLAUDE_TYPES.IEventBus) private eventBus: IEventBus,
    @inject(CLAUDE_TYPES.IToolManager) private toolManager: IToolManager,
    @inject(CLAUDE_TYPES.SessionStore) private sessionStore: SessionStore,
    id: string,
    options: SessionOptions & { claudePath?: string; defaultTimeout?: number },
  ) {
    this.id = id;
    this.parentId = options.parentId;
    this.createdAt = new Date();
    this.context = options.context || {};
    this.metadata = {
      createdAt: this.createdAt,
      lastUsedAt: new Date(),
      messageCount: 0,
      toolUseCount: 0,
    };

    this.claudePath = options.claudePath || 'claude';
    this.model = options.model || DEFAULT_CLAUDE_MODEL;
    this.defaultTimeout = options.defaultTimeout || DEFAULT_TIMEOUTS.STANDARD_REQUEST;

    // Initialize with context history if provided
    if (this.context.history) {
      this.messages = [...this.context.history];
      this.metadata.messageCount = this.messages.length;
    }

    // Save session to store
    void this.sessionStore.saveSession(id, options.parentId, this.context);
    
    // Also add existing messages to the store so getHistory() works properly
    if (this.messages.length > 0) {
      this.messages.forEach(msg => {
        void this.sessionStore.addMessage(id, msg);
      });
    }
  }

  async initialize(): Promise<void> {
    // No subprocess to initialize in stateless mode
    await this.eventBus.emit({
      type: ClaudeEventType.SessionCreated,
      timestamp: new Date(),
      data: { sessionId: this.id, options: {} },
    });
  }

  /**
   * Build a contextual prompt that includes the full conversation history
   */
  private buildContextualPrompt(userMessage: string): string {
    const parts: string[] = [];

    // Add system prompt if present
    if (this.context.systemPrompt) {
      parts.push(`System: ${this.context.systemPrompt}`);
      parts.push(''); // Empty line
    }

    // Add conversation history
    for (const msg of this.messages) {
      if (msg.role === 'user') {
        parts.push(`Human: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        parts.push(`Assistant: ${msg.content}`);
      }
      parts.push(''); // Empty line between messages
    }

    // Add the new user message
    parts.push(`Human: ${userMessage}`);
    
    // Add explicit instruction to only respond to the current question
    parts.push('');
    parts.push('Assistant:');

    return parts.join('\n');
  }

  /**
   * Determines the appropriate timeout for a request based on options and prompt content
   */
  private determineTimeout(prompt: string, options?: ExecuteOptions): number {
    // 1. If explicit timeout is provided, use it
    if (options?.timeout !== undefined) {
      return options.timeout;
    }

    // 2. If operation type hint is provided, use the corresponding timeout
    if (options?.operationType) {
      switch (options.operationType) {
        case 'quick':
          return OPERATION_TIMEOUTS.QUICK_RESPONSE;
        case 'text':
          return OPERATION_TIMEOUTS.TEXT_GENERATION;
        case 'code':
          return OPERATION_TIMEOUTS.CODE_GENERATION;
        case 'file':
          return OPERATION_TIMEOUTS.FILE_OPERATIONS;
        case 'system':
          return OPERATION_TIMEOUTS.SYSTEM_COMMANDS;
      }
    }

    // 3. Try to infer operation type from prompt content
    const lowerPrompt = prompt.toLowerCase();
    
    // Quick responses (only for very specific patterns, not just short prompts)
    if (
      lowerPrompt.includes('yes or no') ||
      lowerPrompt.includes('true or false') ||
      lowerPrompt.includes('single word')
    ) {
      return OPERATION_TIMEOUTS.QUICK_RESPONSE;
    }

    // Code generation
    if (
      lowerPrompt.includes('write code') ||
      lowerPrompt.includes('implement') ||
      lowerPrompt.includes('function') ||
      lowerPrompt.includes('class') ||
      lowerPrompt.includes('debug')
    ) {
      return OPERATION_TIMEOUTS.CODE_GENERATION;
    }

    // File operations
    if (
      lowerPrompt.includes('edit') ||
      lowerPrompt.includes('create file') ||
      lowerPrompt.includes('modify') ||
      lowerPrompt.includes('write to')
    ) {
      return OPERATION_TIMEOUTS.FILE_OPERATIONS;
    }

    // System commands
    if (
      lowerPrompt.includes('run') ||
      lowerPrompt.includes('execute') ||
      lowerPrompt.includes('bash') ||
      lowerPrompt.includes('command')
    ) {
      return OPERATION_TIMEOUTS.SYSTEM_COMMANDS;
    }

    // 4. Check if tools are being used
    if (options?.tools && options.tools.length > 0) {
      // If tools are specified, likely a longer operation
      return DEFAULT_TIMEOUTS.COMPLEX_REQUEST;
    }

    // 5. Fall back to default timeout
    return this.defaultTimeout;
  }

  async execute(prompt: string, options?: ExecuteOptions): Promise<IResult<ExecuteResult>> {
    try {
      this.metadata.lastUsedAt = new Date();

      const startTime = new Date();

      // Build the full contextual prompt
      const contextualPrompt = this.buildContextualPrompt(prompt);

      // Log the prompt for debugging
      this.logger.debug(`Executing with context (${this.messages.length} previous messages)`);
      
      // Additional debug for test issues
      if (prompt.includes('last question') || prompt.includes('capitals')) {
        this.logger.debug(`Session ${this.id} - Building prompt with ${this.messages.length} messages`);
        this.logger.debug(`Messages:`);
        this.messages.forEach((msg, i) => {
          this.logger.debug(`  ${i}: [${msg.role}] ${msg.content.substring(0, 50)}...`);
        });
        this.logger.debug(`Full prompt:\n${contextualPrompt}`);
      }

      // Execute Claude with -p flag for non-interactive output
      const args = ['-p', '--model', this.model];

      // Add tool restrictions if any
      const toolFlags = this.toolManager.getCliFlags();
      args.push(...toolFlags);


      return new Promise((resolve) => {
        let claude;
        try {
          claude = spawn(this.claudePath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env },
          });
        } catch (error) {
          this.logger.error(`Failed to spawn Claude process: ${error}`);
          resolve(Result.fail(error as Error));
          return;
        }

        // Determine and set timeout
        const timeout = this.determineTimeout(prompt, options);
        let timeoutHandle: NodeJS.Timeout | undefined;
        let killTimeoutHandle: NodeJS.Timeout | undefined;
        let isTimedOut = false;

        this.logger.debug(`Session ${this.id} - Using timeout of ${timeout}ms for this request`);

        // Only set timeout if it's greater than 0
        if (timeout > 0) {
          timeoutHandle = setTimeout(() => {
            isTimedOut = true;
            this.logger.warn(`Session ${this.id} - Request timed out after ${timeout}ms, sending SIGTERM`);
            
            // First try graceful termination with SIGTERM
            claude.kill('SIGTERM');
            
            // Set a grace period before forceful termination
            killTimeoutHandle = setTimeout(() => {
              if (claude.killed) return;
              this.logger.error(`Session ${this.id} - Process did not terminate gracefully, sending SIGKILL`);
              claude.kill('SIGKILL');
            }, DEFAULT_TIMEOUTS.KILL_GRACE_PERIOD);
          }, timeout);
        }

        // Write the prompt to stdin
        claude.stdin.write(contextualPrompt);
        claude.stdin.end();

        let output = '';
        let error = '';

        claude.stdout.on('data', (data) => {
          output += data.toString();
        });

        claude.stderr.on('data', (data) => {
          const stderr = data.toString();
          error += stderr;
          this.logger.warn(`Claude stderr: ${stderr}`);
        });

        claude.on('error', (err) => {
          // Clear timeouts
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (killTimeoutHandle) clearTimeout(killTimeoutHandle);
          
          this.logger.error(`Failed to spawn Claude: ${err.message}`);
          this.status = 'error';
          resolve(Result.fail(err));
        });

        claude.on('exit', (code, signal) => {
          const endTime = new Date();
          
          // Clear timeouts
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (killTimeoutHandle) clearTimeout(killTimeoutHandle);

          // Handle timeout case
          if (isTimedOut) {
            const timeoutError = new Error(
              `Claude request timed out after ${timeout}ms. ` +
              `The operation was terminated with signal: ${signal || 'SIGTERM'}`
            );
            this.logger.error(`Session ${this.id} - ${timeoutError.message}`);
            this.status = 'error';
            resolve(Result.fail(timeoutError));
            return;
          }

          if (code !== 0) {
            const errorMsg = error || 'No error output captured';
            this.logger.error(`Claude exited with code ${code}: ${errorMsg}`);
            this.logger.error(`Command was: ${this.claudePath} ${args.join(' ')}`);
            this.logger.error(`First 500 chars of prompt: ${contextualPrompt.substring(0, 500)}`);
            this.status = 'error';
            resolve(Result.fail(new Error(`Claude exited with code ${code}: ${errorMsg}`)));
            return;
          }

          // Parse the output
          const parser = new OutputParser();
          parser.append(output);

          let cleanOutput = parser.extractContent();
          const toolUses = parser.parseToolUses();
          
          // If the output is suspiciously long and contains conversation markers, 
          // it might be echoing the conversation history
          if (cleanOutput.length > 1000 && (cleanOutput.includes('\n\nH:') || cleanOutput.includes('\n\nA:') || cleanOutput.includes('\nH:') || cleanOutput.includes('\nA:'))) {
            // Find the first occurrence of a conversation marker and truncate there
            const markers = ['\n\nH:', '\n\nHuman:', '\n\nA:', '\n\nAssistant:', '\nH:', '\nHuman:', '\nA:', '\nAssistant:'];
            let earliestIndex = cleanOutput.length;
            
            for (const marker of markers) {
              const index = cleanOutput.indexOf(marker);
              if (index > 0 && index < earliestIndex) {
                earliestIndex = index;
              }
            }
            
            if (earliestIndex < cleanOutput.length) {
              cleanOutput = cleanOutput.substring(0, earliestIndex).trim();
              this.logger.warn(`Session ${this.id} - Truncated extremely long output with conversation history from ${output.length} to ${cleanOutput.length} chars`);
            }
          }
          
          // Debug logging for output cleaning
          if (cleanOutput.includes('\n\n') || cleanOutput.includes('Human:') || cleanOutput.includes('Assistant:')) {
            this.logger.debug(`Session ${this.id} - Raw output may contain conversation markers`);
            this.logger.debug(`Raw output length: ${output.length}`);
            this.logger.debug(`Clean output length: ${cleanOutput.length}`);
            if (cleanOutput.length > 100) {
              this.logger.debug(`First 100 chars: "${cleanOutput.substring(0, 100)}"...`);
              this.logger.debug(`Last 100 chars: ..."${cleanOutput.substring(cleanOutput.length - 100)}"`);
            } else {
              this.logger.debug(`Full clean output: "${cleanOutput}"`);
            }
          }
          
          // Debug log for empty or error outputs
          if (!cleanOutput || cleanOutput.toLowerCase().includes('error')) {
            this.logger.warn(`Suspicious output for session ${this.id}: "${cleanOutput}"`);
            this.logger.debug(`Raw output was: "${output}"`);
          }

          // Add messages to history
          const userMessage: Message = {
            role: 'user',
            content: prompt,
            timestamp: new Date(),
          };

          // Clean the output to remove any accidental conversation history
          let finalOutput = cleanOutput;
          
          // More aggressive cleanup - remove everything after conversation markers
          // Check for both single and double newline patterns
          const conversationMarkers = [
            '\n\nH:', '\n\nHuman:', '\n\nA:', '\n\nAssistant:', 
            '\n\nh:', '\n\na:', '\nH:', '\nHuman:', '\nA:', '\nAssistant:',
            '\n\nQ:', '\n\nQuestion:', '\n\nq:'
          ];
          
          for (const marker of conversationMarkers) {
            const markerIndex = finalOutput.indexOf(marker);
            if (markerIndex > 0) {
              finalOutput = finalOutput.substring(0, markerIndex).trim();
              break;
            }
          }
          
          // Also check if the output itself starts with a role prefix that shouldn't be there
          const rolePrefixes = [
            'Assistant:', 'Human:', 'A:', 'H:', 
            'assistant:', 'human:', 'a:', 'h:',
            'Assistant: ', 'Human: ', 'A: ', 'H: ',
            "I'll respond only to your current question."
          ];
          for (const prefix of rolePrefixes) {
            if (finalOutput.startsWith(prefix)) {
              finalOutput = finalOutput.substring(prefix.length).trim();
              break;
            }
          }
          
          // Final cleanup - ensure no trailing conversation markers
          finalOutput = finalOutput.trim();
          
          // Log if we had to clean anything
          if (finalOutput !== cleanOutput) {
            this.logger.debug(`Session ${this.id} - Cleaned output from "${cleanOutput}" to "${finalOutput}"`);
          }
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: finalOutput,
            timestamp: new Date(),
          };

          this.messages.push(userMessage);
          this.messages.push(assistantMessage);
          this.metadata.messageCount = this.messages.length;
          this.metadata.toolUseCount += toolUses.length;

          // Save messages to store
          void this.sessionStore.addMessage(this.id, userMessage);
          void this.sessionStore.addMessage(this.id, assistantMessage);

          const metadata: ExecutionMetadata = {
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
            model: this.model,
          };

          // Emit events
          void this.eventBus.emit({
            type: ClaudeEventType.OutputReceived,
            sessionId: this.id,
            timestamp: new Date(),
            data: { sessionId: this.id, output: cleanOutput, stream: 'stdout' },
          });

          resolve(
            Result.success({
              output: cleanOutput,
              toolUses,
              metadata,
            }),
          );
        });
      });
    } catch (error) {
      this.logger.error(`Failed to execute prompt in session ${this.id}:`, error);
      return Result.fail(error as Error);
    }
  }

  async *stream(prompt: string, options?: StreamOptions): AsyncIterable<string> {
    // For now, just execute and yield the result
    // Could be enhanced to use --output-format stream-json
    const result = await this.execute(prompt, options);

    if (result.success) {
      yield result.value.output;
    } else {
      throw result.error;
    }
  }

  async updateContext(context: Partial<SessionContext>): Promise<IClaudeSession> {
    this.context = { ...this.context, ...context };
    this.metadata.lastUsedAt = new Date();

    // Update message history if provided
    if (context.history) {
      this.messages = [...context.history];
      this.metadata.messageCount = this.messages.length;
    }

    return this;
  }

  async getContext(): Promise<SessionContext> {
    return {
      ...this.context,
      history: [...this.messages],
    };
  }

  async getState(): Promise<SessionState> {
    return {
      id: this.id,
      status: this.status,
      context: await this.getContext(),
      metadata: { ...this.metadata },
    };
  }

  async getHistory(): Promise<MessageWithMetadata[]> {
    const historyResult = await this.sessionStore.getConversationHistory(this.id);
    if (!historyResult.success) {
      return [];
    }
    return historyResult.value.messages;
  }

  async getLastMessage(): Promise<MessageWithMetadata | null> {
    const history = await this.getHistory();
    return history[history.length - 1] || null;
  }

  async getMessageById(messageId: string): Promise<MessageWithMetadata | null> {
    const history = await this.getHistory();
    return history.find((m) => m.id === messageId) || null;
  }

  async fork(atMessageId?: string): Promise<IClaudeSession> {
    // Fork by creating a new session with history up to the specified point
    const forkResult = await this.sessionStore.forkSession(this.id, atMessageId);
    if (!forkResult.success) {
      throw forkResult.error;
    }

    // Create new session with forked context
    const forkedSession = new StatelessClaudeSession(
      this.logger,
      this.eventBus,
      this.toolManager,
      this.sessionStore,
      forkResult.value.newSessionId,
      {
        parentId: this.id,
        context: forkResult.value.context,
        claudePath: this.claudePath,
        model: this.model,
      },
    );

    await forkedSession.initialize();
    return forkedSession;
  }

  async checkpoint(name?: string): Promise<string> {
    const checkpointResult = await this.sessionStore.createCheckpoint(this.id, name);
    if (!checkpointResult.success) {
      throw checkpointResult.error;
    }
    return checkpointResult.value;
  }

  async compact(strategy: 'smart' | 'summarize' | 'truncate' = 'smart'): Promise<IClaudeSession> {
    // Implementation varies based on strategy
    switch (strategy) {
      case 'truncate':
        // Simple truncation to last 10 messages
        if (this.messages.length > 10) {
          this.messages = this.messages.slice(-10);
          this.metadata.messageCount = this.messages.length;
        }
        break;
        
      case 'summarize':
        // Summarize older messages (placeholder for future implementation)
        if (this.messages.length > 10) {
          const summary = `[Previous ${this.messages.length - 10} messages summarized]`;
          this.messages = [
            { role: 'system', content: summary, timestamp: new Date() },
            ...this.messages.slice(-10),
          ];
          this.metadata.messageCount = this.messages.length;
        }
        break;
        
      case 'smart':
      default:
        // Smart compaction: keep system messages and recent context
        if (this.messages.length > 10) {
          const systemMessages = this.messages.filter(m => m.role === 'system');
          const recentMessages = this.messages.slice(-10);
          this.messages = [...systemMessages, ...recentMessages];
          this.metadata.messageCount = this.messages.length;
        }
        break;
    }
    
    return this;
  }

  async destroy(): Promise<void> {
    this.status = 'terminated';

    await this.eventBus.emit({
      type: ClaudeEventType.SessionDestroyed,
      timestamp: new Date(),
      data: { sessionId: this.id },
    });
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}
