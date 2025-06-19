#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('Testing Claude CLI with -p flag...\n');

// Test with print flag
const claude = spawn('claude', ['-p', 'What is 2 + 2?'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
let error = '';

claude.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(data);
});

claude.stderr.on('data', (data) => {
  error += data.toString();
  process.stderr.write(data);
});

claude.on('error', (err) => {
  console.error('Failed to spawn Claude:', err.message);
});

claude.on('exit', (code) => {
  console.log(`\n\nClaude exited with code ${code}`);
  if (error) {
    console.log('Errors:', error);
  }
});