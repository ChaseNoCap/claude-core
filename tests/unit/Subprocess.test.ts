import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { Subprocess } from '../../src/implementations/Subprocess.js';
import { ProcessUtils } from '../../src/utils/process-utils.js';

vi.mock('../../src/utils/process-utils.js');

describe('Subprocess', () => {
  let mockProcess: any;
  let subprocess: Subprocess;

  beforeEach(() => {
    // Create a mock process that extends EventEmitter
    mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: vi.fn((data, callback) => callback()),
    };
    mockProcess.pid = 12345;
    mockProcess.exitCode = null;
    mockProcess.killed = false;
    mockProcess.kill = vi.fn().mockReturnValue(true);

    subprocess = new Subprocess(mockProcess);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('properties', () => {
    it('should return process pid', () => {
      expect(subprocess.pid).toBe(12345);
    });

    it('should return exit code', () => {
      expect(subprocess.exitCode).toBe(null);
      
      mockProcess.exitCode = 0;
      expect(subprocess.exitCode).toBe(0);
      
      mockProcess.exitCode = 1;
      expect(subprocess.exitCode).toBe(1);
    });

    it('should return killed status', () => {
      expect(subprocess.killed).toBe(false);
      
      mockProcess.killed = true;
      expect(subprocess.killed).toBe(true);
    });
  });

  describe('output handling', () => {
    it('should collect stdout data', () => {
      mockProcess.stdout.emit('data', Buffer.from('Hello '));
      mockProcess.stdout.emit('data', Buffer.from('World'));

      const output = subprocess.getOutput();
      expect(output.stdout).toBe('Hello World');
      expect(output.combined).toBe('Hello World');
    });

    it('should collect stderr data', () => {
      mockProcess.stderr.emit('data', Buffer.from('Error: '));
      mockProcess.stderr.emit('data', Buffer.from('Something failed'));

      const output = subprocess.getOutput();
      expect(output.stderr).toBe('Error: Something failed');
      expect(output.combined).toBe('Error: Something failed');
    });

    it('should combine stdout and stderr in order', () => {
      mockProcess.stdout.emit('data', Buffer.from('stdout1\n'));
      mockProcess.stderr.emit('data', Buffer.from('stderr1\n'));
      mockProcess.stdout.emit('data', Buffer.from('stdout2\n'));

      const output = subprocess.getOutput();
      expect(output.combined).toBe('stdout1\nstderr1\nstdout2\n');
    });

    it('should respect maxBuffer for stdout', () => {
      const smallSubprocess = new Subprocess(mockProcess, 10);
      
      mockProcess.stdout.emit('data', Buffer.from('1234567890ABCDEF'));

      const output = smallSubprocess.getOutput();
      expect(output.stdout).toBe('7890ABCDEF');
      expect(output.stdout.length).toBe(10);
    });

    it('should respect maxBuffer for stderr', () => {
      const smallSubprocess = new Subprocess(mockProcess, 10);
      
      mockProcess.stderr.emit('data', Buffer.from('abcdefghijklmnop'));

      const output = smallSubprocess.getOutput();
      expect(output.stderr).toBe('ghijklmnop');
      expect(output.stderr.length).toBe(10);
    });

    it('should respect maxBuffer for combined output', () => {
      const smallSubprocess = new Subprocess(mockProcess, 10);
      
      mockProcess.stdout.emit('data', Buffer.from('12345'));
      mockProcess.stderr.emit('data', Buffer.from('67890ABCDEF'));

      const output = smallSubprocess.getOutput();
      expect(output.combined).toBe('7890ABCDEF'); // Last 10 chars
      expect(output.combined.length).toBe(10);
    });

    it('should handle missing stdout/stderr', () => {
      mockProcess.stdout = null;
      mockProcess.stderr = null;
      const subprocess2 = new Subprocess(mockProcess);

      // Should not throw
      expect(() => subprocess2.getOutput()).not.toThrow();
    });
  });

  describe('event emission', () => {
    it('should emit stdout events', () => {
      const listener = vi.fn();
      subprocess.on('stdout', listener);

      mockProcess.stdout.emit('data', Buffer.from('test output'));

      expect(listener).toHaveBeenCalledWith('test output');
    });

    it('should emit stderr events', () => {
      const listener = vi.fn();
      subprocess.on('stderr', listener);

      mockProcess.stderr.emit('data', Buffer.from('test error'));

      expect(listener).toHaveBeenCalledWith('test error');
    });

    it('should emit exit events', () => {
      const listener = vi.fn();
      subprocess.on('exit', listener);

      mockProcess.emit('exit', 0, null);

      expect(listener).toHaveBeenCalledWith(0, null);
    });

    it('should emit error events', () => {
      const listener = vi.fn();
      subprocess.on('error', listener);

      const error = new Error('Process error');
      mockProcess.emit('error', error);

      expect(listener).toHaveBeenCalledWith(error);
    });
  });

  describe('write', () => {
    it('should write data to stdin', async () => {
      await subprocess.write('input data');

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        'input data',
        expect.any(Function)
      );
    });

    it('should reject when stdin is not available', async () => {
      mockProcess.stdin = null;

      await expect(subprocess.write('data')).rejects.toThrow(
        'Process stdin is not available'
      );
    });

    it('should reject when write fails', async () => {
      const writeError = new Error('Write failed');
      mockProcess.stdin.write = vi.fn((data, callback) => callback(writeError));

      await expect(subprocess.write('data')).rejects.toThrow('Write failed');
    });
  });

  describe('kill', () => {
    it('should kill process with default signal', () => {
      vi.mocked(ProcessUtils.killProcess).mockReturnValue(true);

      const result = subprocess.kill();

      expect(ProcessUtils.killProcess).toHaveBeenCalledWith(mockProcess, undefined);
      expect(result).toBe(true);
    });

    it('should kill process with custom signal', () => {
      vi.mocked(ProcessUtils.killProcess).mockReturnValue(true);

      const result = subprocess.kill('SIGKILL');

      expect(ProcessUtils.killProcess).toHaveBeenCalledWith(mockProcess, 'SIGKILL');
      expect(result).toBe(true);
    });

    it('should return false when kill fails', () => {
      vi.mocked(ProcessUtils.killProcess).mockReturnValue(false);

      const result = subprocess.kill();

      expect(result).toBe(false);
    });
  });

  describe('waitForExit', () => {
    it('should wait for process exit', async () => {
      vi.mocked(ProcessUtils.waitForExit).mockResolvedValue(0);

      const result = await subprocess.waitForExit();

      expect(ProcessUtils.waitForExit).toHaveBeenCalledWith(mockProcess);
      expect(result).toBe(0);
    });

    it('should propagate waitForExit errors', async () => {
      vi.mocked(ProcessUtils.waitForExit).mockRejectedValue(
        new Error('Exit failed')
      );

      await expect(subprocess.waitForExit()).rejects.toThrow('Exit failed');
    });
  });

  describe('isAlive', () => {
    it('should check if process is alive', () => {
      vi.mocked(ProcessUtils.isProcessAlive).mockReturnValue(true);

      const result = subprocess.isAlive();

      expect(ProcessUtils.isProcessAlive).toHaveBeenCalledWith(mockProcess);
      expect(result).toBe(true);
    });

    it('should return false for dead process', () => {
      vi.mocked(ProcessUtils.isProcessAlive).mockReturnValue(false);

      const result = subprocess.isAlive();

      expect(result).toBe(false);
    });
  });

  describe('getOutput', () => {
    it('should return a copy of output', () => {
      mockProcess.stdout.emit('data', Buffer.from('test'));

      const output1 = subprocess.getOutput();
      const output2 = subprocess.getOutput();

      expect(output1).not.toBe(output2); // Different objects
      expect(output1).toEqual(output2); // Same content
    });
  });
});