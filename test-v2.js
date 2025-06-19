#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🧪 Testing Claude CLI with -p flag (non-interactive mode)\n');

// First, let's verify Claude is installed
console.log('1️⃣ Checking if Claude is installed...');
const checkClaude = spawn('which', ['claude']);

checkClaude.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Claude CLI not found in PATH');
    process.exit(1);
  }
  
  console.log('✅ Claude CLI found\n');
  
  // Test 1: Simple prompt with -p flag
  console.log('2️⃣ Testing simple prompt with -p flag...');
  console.log('Command: claude -p "What is 2 + 2? Answer in exactly one line."\n');
  
  const claude = spawn('claude', ['-p', 'What is 2 + 2? Answer in exactly one line.'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let output = '';
  let error = '';
  const startTime = Date.now();

  claude.stdout.on('data', (data) => {
    output += data.toString();
    process.stdout.write('Claude: ' + data);
  });

  claude.stderr.on('data', (data) => {
    error += data.toString();
    process.stderr.write('Error: ' + data);
  });

  claude.on('error', (err) => {
    console.error('❌ Failed to spawn Claude:', err.message);
  });

  claude.on('exit', (code) => {
    const duration = Date.now() - startTime;
    console.log(`\n✅ Claude exited with code ${code}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    
    if (code === 0) {
      console.log('\n3️⃣ Testing with model flag...');
      console.log('Command: claude -p --model claude-3-haiku-20240307 "What is the capital of France? One word answer."\n');
      
      const claude2 = spawn('claude', [
        '-p',
        '--model', 'claude-3-haiku-20240307',
        'What is the capital of France? One word answer.'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      claude2.stdout.on('data', (data) => {
        process.stdout.write('Claude: ' + data);
      });

      claude2.on('exit', (code2) => {
        console.log(`\n✅ Second test exited with code ${code2}`);
        
        console.log('\n📊 Summary:');
        console.log('- Claude CLI is working in non-interactive mode with -p flag');
        console.log('- Responses are returned directly to stdout');
        console.log('- The package should use this approach for execute() method');
        
        console.log('\n💡 Recommendations:');
        console.log('1. Update ClaudeSession to use spawn with -p flag');
        console.log('2. For streaming, consider using --output-format stream-json');
        console.log('3. Handle system prompts by prepending to the user prompt');
      });
    }
  });
});