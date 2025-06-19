import type { IResult } from '@chasenocap/di-framework';
import type { IClaudeSession } from './IClaudeSession.js';
import type { ISubprocess } from './ISubprocess.js';
import type { SessionOptions, SpawnOptions, ToolConfiguration } from '../types/options.js';

export interface IClaude {
  createSession(options: SessionOptions): Promise<IResult<IClaudeSession>>;
  destroySession(id: string): Promise<IResult<void>>;
  restoreSession(id: string): Promise<IResult<IClaudeSession>>;
  registerTools(tools: ToolConfiguration): void;
  spawn(options: SpawnOptions): Promise<IResult<ISubprocess>>;
  cleanup(): Promise<void>;
}
