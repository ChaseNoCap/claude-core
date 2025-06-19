#!/usr/bin/env node
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Minimal Claude wrapper without dependencies
class MinimalClaude {
  async createSession(prompt: string): Promise<ClaudeSession> {
    const session = new ClaudeSession();
    await session.initialize();
    return session;
  }
}

class ClaudeSession extends EventEmitter {
  private process: any;
  private output: string = '';

  async initialize() {
    // Spawn claude process
    this.process = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      this.output += chunk;
      this.emit('data', chunk);
    });

    this.process.stderr.on('data', (data: Buffer) => {
      console.error('Error:', data.toString());
    });

    this.process.on('error', (error: Error) => {
      console.error('Failed to start Claude:', error.message);
      throw error;
    });
  }

  async execute(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.output = '';
      
      // Write prompt to Claude
      this.process.stdin.write(prompt + '\n');

      // Wait for response
      const checkResponse = setInterval(() => {
        if (this.output.includes('Human:') || this.output.includes('Assistant:')) {
          clearInterval(checkResponse);
          resolve(this.output.trim());
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkResponse);
        reject(new Error('Response timeout'));
      }, 30000);
    });
  }

  destroy() {
    if (this.process) {
      this.process.kill();
    }
  }
}

// Example usage
async function main() {
  const claude = new MinimalClaude();
  
  try {
    console.log('Creating Claude session...');
    const session = await claude.createSession('You are a helpful assistant.');
    
    console.log('Asking Claude a question...\n');
    const response = await session.execute('What is TypeScript in one sentence?');
    console.log('Claude:', response);
    
    console.log('\nAsking a follow-up question...\n');
    const response2 = await session.execute('What are its main benefits?');
    console.log('Claude:', response2);
    
    session.destroy();
    console.log('\nSession closed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}