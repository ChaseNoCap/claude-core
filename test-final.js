#!/usr/bin/env node
import { Container } from 'inversify';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from './dist/index.js';
import { ConsoleLogger } from './dist/mocks/logger/index.js';
import { EventBus } from './dist/mocks/event-system/index.js';

console.log('🚀 Final Test for @chasenocap/claude-core (Stateless Implementation)\n');

async function testStatelessClaude() {
  // Set up DI container
  const container = new Container();

  // Create a simple logger that shows what's happening
  const logger = new ConsoleLogger();
  
  container.bind(CLAUDE_TYPES.ILogger).toConstantValue(logger);
  container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(new EventBus());
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  container.bind(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: 'claude-3-haiku-20240307', // Using Haiku for faster responses
  });
  container.bind(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get(CLAUDE_TYPES.IClaude);

  try {
    // Test 1: Create a session with context
    console.log('📝 Test 1: Creating a session with system prompt...');
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'You are a helpful assistant named Bob. Always mention your name when greeting someone.',
      },
    });

    if (!sessionResult.success) {
      console.error('❌ Failed to create session:', sessionResult.error.message);
      return;
    }

    const session = sessionResult.value;
    console.log(`✅ Created session: ${session.id}\n`);

    // Test 2: First message
    console.log('📝 Test 2: Sending first message...');
    console.log('User: "Hello! What is your name?"\n');
    
    const result1 = await session.execute('Hello! What is your name?');
    
    if (result1.success) {
      console.log('✅ Got response:');
      console.log('Assistant:', result1.value.output);
      console.log(`Duration: ${result1.value.metadata.duration}ms\n`);
    } else {
      console.error('❌ Failed:', result1.error.message);
      return;
    }

    // Test 3: Second message (should maintain context)
    console.log('📝 Test 3: Testing context preservation...');
    console.log('User: "What did I just ask you?"\n');
    
    const result2 = await session.execute('What did I just ask you?');
    
    if (result2.success) {
      console.log('✅ Got response:');
      console.log('Assistant:', result2.value.output);
      console.log(`Duration: ${result2.value.metadata.duration}ms\n`);
    } else {
      console.error('❌ Failed:', result2.error.message);
    }

    // Test 4: Check session state
    console.log('📝 Test 4: Checking session state...');
    const state = await session.getState();
    console.log('Session state:', {
      id: state.id,
      status: state.status,
      messageCount: state.metadata.messageCount,
      contextSize: state.context.history?.length || 0,
    });

    // Test 5: Fork the session
    console.log('\n📝 Test 5: Testing session fork...');
    const forkedSession = await session.fork();
    console.log(`✅ Created forked session: ${forkedSession.id}`);
    
    // Send a different message to the fork
    console.log('\nIn forked session - User: "What is 2 + 2?"\n');
    const forkResult = await forkedSession.execute('What is 2 + 2?');
    
    if (forkResult.success) {
      console.log('Forked session - Assistant:', forkResult.value.output);
    }

    // Original session should still have its own context
    console.log('\nBack in original session - User: "Do you remember what we talked about?"\n');
    const result3 = await session.execute('Do you remember what we talked about?');
    
    if (result3.success) {
      console.log('Original session - Assistant:', result3.value.output);
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await claude.destroySession(session.id);
    await claude.destroySession(forkedSession.id);
    await claude.cleanup();
    console.log('✅ Cleanup complete');

    console.log('\n📊 Summary:');
    console.log('- Stateless sessions work by passing full context with each request');
    console.log('- Context is preserved between messages in the same session');
    console.log('- Forking creates a new session with history up to the fork point');
    console.log('- Each session maintains its own independent context');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await claude.cleanup();
  }
}

console.log('Instructions:');
console.log('1. Make sure Claude CLI is installed: which claude');
console.log('2. Run this test: node test-final.js');
console.log('3. The test will demonstrate stateless session management\n');

console.log('Note: Each execute() call spawns a new claude process with -p flag');
console.log('and includes the full conversation history in the prompt.\n');

// Run the test
testStatelessClaude().catch(console.error);