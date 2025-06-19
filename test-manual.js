#!/usr/bin/env node
import { Container } from 'inversify';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from './dist/index.js';
import { ConsoleLogger } from './dist/mocks/logger/index.js';
import { EventBus } from './dist/mocks/event-system/index.js';

console.log('🚀 Manual Test for @chasenocap/claude-core\n');
console.log('This test requires you to run it on your machine where Claude CLI is installed.\n');

async function runTest() {
  // Set up DI container
  const container = new Container();

  // Bind dependencies
  container.bind(CLAUDE_TYPES.ILogger).toConstantValue(new ConsoleLogger());
  container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(new EventBus());
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  
  // Mock session manager
  container.bind(CLAUDE_TYPES.ISessionManager).toConstantValue({
    createSession: async () => ({ success: true, value: null }),
    compactHistory: async () => ({ success: true, value: null }),
  });
  
  container.bind(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: 'claude-3-sonnet-20241022', // Using Sonnet as it's faster
  });
  
  container.bind(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get(CLAUDE_TYPES.IClaude);

  try {
    // Test creating a session
    console.log('📝 Creating a Claude session...');
    console.log('This will spawn: claude --model claude-3-sonnet-20241022\n');
    
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'You are a helpful assistant. Keep responses very brief.',
      },
    });

    if (!sessionResult.success) {
      console.error('❌ Failed to create session:', sessionResult.error.message);
      console.error('\nMake sure Claude CLI is installed and accessible in your PATH.');
      console.error('You can check with: which claude');
      return;
    }

    const session = sessionResult.value;
    console.log(`✅ Created session: ${session.id}`);
    console.log('\n⚠️  Note: The Claude subprocess is now running.');
    console.log('The package expects Claude to be in interactive mode.\n');

    // Test execute - this might not work with Claude Code's interactive mode
    console.log('📝 Attempting to execute a prompt...');
    console.log('Sending: "What is 2 + 2? Please answer in one line."\n');
    
    const executePromise = session.execute('What is 2 + 2? Please answer in one line.', {
      timeout: 10000, // 10 second timeout
    });

    console.log('Waiting for response (10 second timeout)...\n');

    const result = await executePromise;
    
    if (result.success) {
      console.log('✅ Got response!');
      console.log('Output:', result.value.output);
      console.log('Duration:', result.value.metadata.duration + 'ms');
    } else {
      console.error('❌ Failed to execute:', result.error.message);
      console.log('\nThis might be because Claude Code runs in interactive mode.');
      console.log('The package might need to be updated to use "claude -p" for non-interactive output.');
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await session.destroy();
    await claude.cleanup();
    console.log('✅ Done');

  } catch (error) {
    console.error('❌ Error:', error);
    await claude.cleanup();
  }
}

console.log('Instructions:');
console.log('1. Make sure Claude CLI is installed: which claude');
console.log('2. Run this test: node test-manual.js');
console.log('3. The test will try to spawn Claude and send it a prompt');
console.log('4. Watch for any errors or unexpected behavior\n');

console.log('Press Ctrl+C to exit if the test hangs.\n');

// Run the test
runTest().catch(console.error);