import 'reflect-metadata';

// Implementations
export { Claude } from './implementations/Claude.js';
export { StatelessClaudeSession } from './implementations/StatelessClaudeSession.js';
export { ToolManager } from './implementations/ToolManager.js';
export { Subprocess } from './implementations/Subprocess.js';
export { SessionStore } from './implementations/SessionStore.js';

// Interfaces
export type { IClaude } from './interfaces/IClaude.js';
export type { IClaudeSession } from './interfaces/IClaudeSession.js';
export type { IToolManager } from './interfaces/IToolManager.js';
export type { ISubprocess } from './interfaces/ISubprocess.js';
export type { IContextManager, CompactionStrategy } from './interfaces/IContextManager.js';
export type {
  ISessionManager,
  SessionLineage,
  ConversationHistory,
  MessageWithMetadata,
  ForkPoint,
  MessageReference,
  CachedResponse,
  CachePruneStrategy,
} from './interfaces/ISessionManager.js';

// Constants and Types
export { CLAUDE_TYPES } from './types/injection-tokens.js';
export { ClaudeEventType } from './types/events.js';
export { 
  ClaudeModel, 
  ClaudeModelAlias, 
  DEFAULT_CLAUDE_MODEL,
  ModelPricing,
  isValidClaudeModel,
  getModelDisplayName 
} from './types/models.js';

export type {
  ClaudeOptions,
  SessionOptions,
  SpawnOptions,
  ExecuteOptions,
  ExecuteResult,
  StreamOptions,
  SessionContext,
  SessionState,
  Tool,
  ToolRestriction,
  ToolConfiguration,
  ToolUse,
  Message,
  ProcessOutput,
  RetryOptions,
  ResourceLimits,
  ExecutionMetadata,
  SessionMetadata,
} from './types/options.js';

export type {
  ClaudeEvent,
  SessionCreatedEvent,
  SessionDestroyedEvent,
  SessionErrorEvent,
  ToolUsedEvent,
  OutputReceivedEvent,
  ProcessSpawnedEvent,
  ProcessExitedEvent,
} from './types/events.js';

// Utilities
export { OutputParser } from './utils/output-parser.js';
export { ProcessUtils, ProcessEventEmitter } from './utils/process-utils.js';
