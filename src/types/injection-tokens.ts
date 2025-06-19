export const CLAUDE_TYPES = {
  IClaude: Symbol.for('IClaude'),
  IClaudeSession: Symbol.for('IClaudeSession'),
  IToolManager: Symbol.for('IToolManager'),
  ISubprocess: Symbol.for('ISubprocess'),
  ILogger: Symbol.for('ILogger'),
  IEventBus: Symbol.for('IEventBus'),
  ISessionManager: Symbol.for('ISessionManager'),
  IContextManager: Symbol.for('IContextManager'),
  ClaudeOptions: Symbol.for('ClaudeOptions'),
  SessionStore: Symbol.for('SessionStore'),
  ProcessFactory: Symbol.for('ProcessFactory'),
} as const;
