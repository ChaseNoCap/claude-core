import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { injectable } from 'inversify';
import type { ISubprocess } from '../interfaces/ISubprocess.js';
import type { ProcessOutput } from '../types/options.js';
import { ProcessUtils } from '../utils/process-utils.js';

@injectable()
export class Subprocess extends EventEmitter implements ISubprocess {
  private process: ChildProcess;
  private output: ProcessOutput = {
    stdout: '',
    stderr: '',
    combined: '',
  };
  private maxBuffer: number;

  constructor(process: ChildProcess, maxBuffer: number = 10 * 1024 * 1024) {
    super();
    this.process = process;
    this.maxBuffer = maxBuffer;
    this.setupListeners();
  }

  get pid(): number {
    return this.process.pid!;
  }

  get exitCode(): number | null {
    return this.process.exitCode;
  }

  get killed(): boolean {
    return this.process.killed;
  }

  private setupListeners(): void {
    this.process.stdout?.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      this.appendOutput('stdout', data);
      this.emit('stdout', data);
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const data = chunk.toString();
      this.appendOutput('stderr', data);
      this.emit('stderr', data);
    });

    this.process.on('exit', (code, signal) => {
      this.emit('exit', code, signal);
    });

    this.process.on('error', (error) => {
      this.emit('error', error);
    });
  }

  private appendOutput(stream: 'stdout' | 'stderr', data: string): void {
    this.output[stream] += data;
    this.output.combined += data;

    if (this.output[stream].length > this.maxBuffer) {
      this.output[stream] = this.output[stream].slice(-this.maxBuffer);
    }
    if (this.output.combined.length > this.maxBuffer) {
      this.output.combined = this.output.combined.slice(-this.maxBuffer);
    }
  }

  async write(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process.stdin) {
        reject(new Error('Process stdin is not available'));
        return;
      }

      this.process.stdin.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  kill(signal?: NodeJS.Signals): boolean {
    return ProcessUtils.killProcess(this.process, signal);
  }

  async waitForExit(): Promise<number> {
    return ProcessUtils.waitForExit(this.process);
  }

  getOutput(): ProcessOutput {
    return { ...this.output };
  }

  isAlive(): boolean {
    return ProcessUtils.isProcessAlive(this.process);
  }
}
