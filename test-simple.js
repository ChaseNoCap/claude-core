#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('Testing Claude CLI directly...\n');

// Test 1: Check Claude version
console.log('Test 1: Checking Claude version...');
const version = spawn('claude', ['--version'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

version.stdout.on('data', (data) => {
  console.log('Version:', data.toString().trim());
});

version.stderr.on('data', (data) => {
  console.error('Error:', data.toString().trim());
});

version.on('error', (error) => {
  console.error('Failed to spawn Claude:', error.message);
});

version.on('exit', (code) => {
  console.log(`Version check exited with code ${code}\n`);
  
  if (code === 0) {
    // Test 2: Try a simple prompt
    console.log('Test 2: Sending a simple prompt...');
    const claude = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    claude.stderr.on('data', (data) => {
      console.error('Claude stderr:', data.toString());
    });

    claude.on('error', (error) => {
      console.error('Failed to spawn Claude:', error.message);
    });

    claude.on('exit', (code) => {
      console.log(`\n\nClaude exited with code ${code}`);
      console.log('Total output length:', output.length);
    });

    // Send a prompt
    setTimeout(() => {
      console.log('\nSending prompt: "What is 2 + 2?"');
      claude.stdin.write('What is 2 + 2?\n');
      
      // Wait for response and then exit
      setTimeout(() => {
        console.log('\nSending exit command...');
        claude.stdin.write('/exit\n');
        
        setTimeout(() => {
          if (!claude.killed) {
            console.log('Force killing Claude...');
            claude.kill();
          }
        }, 2000);
      }, 5000);
    }, 1000);
  }
});