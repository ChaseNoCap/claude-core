import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { SpawnOptions } from '../types/options.js';

export class ProcessUtils {
  static spawn(command: string, args: string[], options: SpawnOptions): ChildProcess {
    const spawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'],
    };

    return spawn(command, args, spawnOptions);
  }

  static async waitForExit(process: ChildProcess): Promise<number> {
    return new Promise((resolve, reject) => {
      process.once('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`Process terminated by signal: ${signal}`));
        } else {
          resolve(code ?? 0);
        }
      });

      process.once('error', reject);
    });
  }

  static killProcess(process: ChildProcess, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    if (!process.killed) {
      return process.kill(signal);
    }
    return false;
  }

  static isProcessAlive(process: ChildProcess): boolean {
    return !process.killed && process.exitCode === null;
  }

  static createTimeoutKiller(
    process: ChildProcess,
    timeout: number,
  ): { timer: NodeJS.Timeout; cancel: () => void } {
    const timer = setTimeout(() => {
      if (ProcessUtils.isProcessAlive(process)) {
        ProcessUtils.killProcess(process, 'SIGKILL');
      }
    }, timeout);

    return {
      timer,
      cancel: () => clearTimeout(timer),
    };
  }

  static async collectOutput(
    process: ChildProcess,
    maxBuffer: number = 10 * 1024 * 1024,
  ): Promise<{ stdout: string; stderr: string }> {
    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > maxBuffer) {
        stdout = stdout.slice(-maxBuffer);
      }
    });

    process.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > maxBuffer) {
        stderr = stderr.slice(-maxBuffer);
      }
    });

    await ProcessUtils.waitForExit(process);

    return { stdout, stderr };
  }
}

export class ProcessEventEmitter extends EventEmitter {
  emitWithTimeout<T>(event: string, data: T, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event '${event}' listener timeout`));
      }, timeout);

      this.emit(event, data);
      clearTimeout(timer);
      resolve();
    });
  }
}
