#!/usr/bin/env node
import { Container } from 'inversify';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from './dist/index.js';
import { ConsoleLogger } from './dist/mocks/logger/index.js';
import { EventBus } from './dist/mocks/event-system/index.js';

async function testClaude() {
  console.log('🚀 Testing @chasenocap/claude-core...\n');

  // Set up DI container
  const container = new Container();

  // Bind dependencies
  container.bind(CLAUDE_TYPES.ILogger).toConstantValue(new ConsoleLogger());
  container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(new EventBus());
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  
  // Mock session manager for now
  container.bind(CLAUDE_TYPES.ISessionManager).toConstantValue({
    createSession: async () => ({ success: true, value: null }),
    compactHistory: async () => ({ success: true, value: null }),
  });
  
  container.bind(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude', // Assumes 'claude' is in PATH
    defaultModel: 'claude-3-opus-20240229',
  });
  
  container.bind(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  // Get Claude instance
  const claude = container.get(CLAUDE_TYPES.IClaude);

  try {
    // Test 1: Create a session
    console.log('📝 Test 1: Creating a Claude session...');
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'You are a helpful assistant. Keep responses concise.',
      },
    });

    if (!sessionResult.success) {
      console.error('❌ Failed to create session:', sessionResult.error);
      return;
    }

    const session = sessionResult.value;
    console.log(`✅ Created session: ${session.id}\n`);

    // Test 2: Execute a simple prompt
    console.log('📝 Test 2: Executing a simple prompt...');
    const result = await session.execute('What is 2 + 2?');
    
    if (result.success) {
      console.log('Response:', result.value.output);
      console.log('Metadata:', {
        duration: `${result.value.metadata.duration}ms`,
        model: result.value.metadata.model,
      });
    } else {
      console.error('❌ Failed to execute prompt:', result.error);
    }

    // Test 3: Stream a response
    console.log('\n📝 Test 3: Streaming a response...');
    console.log('Prompt: "Count from 1 to 5 slowly"\n');
    console.log('Streaming response:');
    
    try {
      for await (const chunk of session.stream('Count from 1 to 5 slowly, one number per line')) {
        process.stdout.write(chunk);
      }
      console.log('\n✅ Streaming completed\n');
    } catch (error) {
      console.error('❌ Streaming error:', error);
    }

    // Test 4: Tool restrictions
    console.log('📝 Test 4: Testing tool restrictions...');
    claude.registerTools({
      tools: [
        { name: 'calculator', description: 'Perform calculations' },
        { name: 'web_search', description: 'Search the web' },
      ],
      restrictions: [
        { type: 'deny', tools: ['web_search'] },
      ],
    });
    
    const toolManager = container.get(CLAUDE_TYPES.IToolManager);
    const availableTools = toolManager.getAvailableTools();
    console.log('Available tools:', availableTools.map(t => t.name));
    console.log('CLI flags:', toolManager.getCliFlags());

    // Test 5: Session state
    console.log('\n📝 Test 5: Getting session state...');
    const state = await session.getState();
    console.log('Session state:', {
      id: state.id,
      status: state.status,
      messageCount: state.metadata.messageCount,
      toolUseCount: state.metadata.toolUseCount,
    });

    // Test 6: History
    console.log('\n📝 Test 6: Checking session history...');
    const history = await session.getHistory();
    console.log(`History contains ${history.length} messages`);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await claude.destroySession(session.id);
    await claude.cleanup();
    console.log('✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await claude.cleanup();
  }
}

// Interactive mode
async function interactiveMode() {
  console.log('\n💬 Interactive Mode\n');
  console.log('Commands:');
  console.log('  /exit - Exit the program');
  console.log('  /clear - Clear the context');
  console.log('  /stream - Toggle streaming mode');
  console.log('  Any other text will be sent to Claude\n');

  const container = new Container();
  
  // Set up container (same as above)
  container.bind(CLAUDE_TYPES.ILogger).toConstantValue(new ConsoleLogger());
  container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(new EventBus());
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  container.bind(CLAUDE_TYPES.ISessionManager).toConstantValue({
    createSession: async () => ({ success: true, value: null }),
    compactHistory: async () => ({ success: true, value: null }),
  });
  container.bind(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: 'claude-3-opus-20240229',
  });
  container.bind(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get(CLAUDE_TYPES.IClaude);
  
  const sessionResult = await claude.createSession({
    context: {
      systemPrompt: 'You are a helpful assistant in an interactive chat.',
    },
  });

  if (!sessionResult.success) {
    console.error('Failed to create session:', sessionResult.error);
    return;
  }

  const session = sessionResult.value;
  let streaming = false;

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    line = line.trim();

    if (line === '/exit') {
      console.log('Goodbye!');
      await claude.cleanup();
      rl.close();
      return;
    }

    if (line === '/clear') {
      await session.updateContext({ history: [] });
      console.log('Context cleared.');
      rl.prompt();
      return;
    }

    if (line === '/stream') {
      streaming = !streaming;
      console.log(`Streaming mode: ${streaming ? 'ON' : 'OFF'}`);
      rl.prompt();
      return;
    }

    if (line) {
      console.log('');
      
      if (streaming) {
        try {
          for await (const chunk of session.stream(line)) {
            process.stdout.write(chunk);
          }
          console.log('\n');
        } catch (error) {
          console.error('Error:', error.message);
        }
      } else {
        const result = await session.execute(line);
        if (result.success) {
          console.log(result.value.output);
          console.log('');
        } else {
          console.error('Error:', result.error.message);
        }
      }
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    await claude.cleanup();
    process.exit(0);
  });
}

// Main entry point
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
  interactiveMode().catch(console.error);
} else {
  testClaude().catch(console.error);
}