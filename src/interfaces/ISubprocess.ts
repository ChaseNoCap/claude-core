import type { EventEmitter } from 'events';
import type { ProcessOutput } from '../types/options.js';

export interface ISubprocess extends EventEmitter {
  readonly pid: number;
  readonly exitCode: number | null;
  readonly killed: boolean;

  write(data: string): Promise<void>;
  kill(signal?: NodeJS.Signals): boolean;
  waitForExit(): Promise<number>;
  getOutput(): ProcessOutput;
  isAlive(): boolean;
}
