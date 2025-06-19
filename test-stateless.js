#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('🧪 Testing Stateless Claude Session Pattern\n');
console.log('This test demonstrates how to maintain conversation context');
console.log('by passing the full history with each request.\n');

// Simulate a conversation with context
const messages = [];

async function executeClaude(prompt, includeContext = true) {
  return new Promise((resolve, reject) => {
    // Build contextual prompt
    let fullPrompt = prompt;
    
    if (includeContext && messages.length > 0) {
      const contextParts = ['Previous conversation:'];
      
      for (const msg of messages) {
        if (msg.role === 'user') {
          contextParts.push(`Human: ${msg.content}`);
        } else {
          contextParts.push(`Assistant: ${msg.content}`);
        }
      }
      
      contextParts.push(''); // Empty line
      contextParts.push(`Human: ${prompt}`);
      
      fullPrompt = contextParts.join('\n');
    }
    
    console.log('📤 Sending to Claude with context:');
    console.log('-'.repeat(50));
    console.log(fullPrompt);
    console.log('-'.repeat(50));
    
    const args = ['-p', fullPrompt];
    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    claude.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}: ${error}`));
      } else {
        resolve(output.trim());
      }
    });

    claude.on('error', (err) => {
      reject(err);
    });
  });
}

async function runConversation() {
  try {
    console.log('1️⃣ First message (no context)\n');
    const response1 = await executeClaude('My name is Alice. What is 2 + 2?', false);
    console.log('📥 Claude:', response1);
    
    // Add to history
    messages.push({ role: 'user', content: 'My name is Alice. What is 2 + 2?' });
    messages.push({ role: 'assistant', content: response1 });
    
    console.log('\n\n2️⃣ Second message (with context)\n');
    const response2 = await executeClaude('What is my name?', true);
    console.log('📥 Claude:', response2);
    
    // Add to history
    messages.push({ role: 'user', content: 'What is my name?' });
    messages.push({ role: 'assistant', content: response2 });
    
    console.log('\n\n3️⃣ Testing fork - same question without context\n');
    const response3 = await executeClaude('What is my name?', false);
    console.log('📥 Claude (no context):', response3);
    
    console.log('\n\n✅ Test complete!');
    console.log('\n📊 Summary:');
    console.log('- With context: Claude remembers the name "Alice"');
    console.log('- Without context: Claude cannot answer the question');
    console.log('- This demonstrates the stateless nature of Claude');
    console.log('- Context must be manually maintained and passed with each request');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure Claude CLI is installed and accessible');
  }
}

console.log('🚀 Starting conversation test...\n');
console.log('This will make 3 calls to Claude to demonstrate context management.\n');

runConversation();