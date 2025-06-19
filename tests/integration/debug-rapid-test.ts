import { Container } from 'inversify';
import { ConsoleLogger } from '../../src/mocks/logger/index.js';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES, ClaudeModel } from '../../src/index.js';
import type { IClaude, ClaudeOptions } from '../../src/index.js';

async function main() {
  const container = new Container();
  
  // Use console logger for debugging
  const logger = new ConsoleLogger();
  
  const mockEventBus: IEventBus = {
    emit: async (event) => {
      console.log('Event:', event.type);
    },
    on: () => {},
    off: () => {},
  } as any;
  
  // Configure DI container
  container.bind<ILogger>(CLAUDE_TYPES.ILogger).toConstantValue(logger);
  container.bind<IEventBus>(CLAUDE_TYPES.IEventBus).toConstantValue(mockEventBus);
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  container.bind<ClaudeOptions>(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: ClaudeModel.HAIKU_3_5,
  });
  container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();
  
  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);
  
  console.log('Creating test session...');
  const sessionResult = await claude.createSession({
    model: ClaudeModel.HAIKU_3_5,
    context: {
      systemPrompt: 'You are a test assistant. Always respond with "Test response: " followed by a brief answer.',
    },
  });
  
  if (!sessionResult.success) {
    console.error('Failed to create session');
    return;
  }
  
  const session = sessionResult.value;
  console.log('Session created:', session.id);
  
  // Test single request
  console.log('\n1. Testing single request...');
  const result1 = await session.execute('Say hello', { timeout: 30000 });
  console.log('Result 1:', result1.success);
  if (result1.success) {
    console.log('Output 1:', result1.value.output);
  } else {
    console.error('Error 1:', result1.error);
  }
  
  // Test rapid sequential requests
  console.log('\n2. Testing rapid sequential requests...');
  const result2 = await session.execute('Count to 3', { timeout: 30000 });
  console.log('Result 2:', result2.success);
  if (result2.success) {
    console.log('Output 2:', result2.value.output);
  } else {
    console.error('Error 2:', result2.error);
  }
  
  // Check conversation history
  console.log('\n3. Checking conversation history...');
  const state = await session.getState();
  console.log('Message count:', state.metadata.messageCount);
  console.log('Messages:');
  state.context.history?.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
  });
  
  await claude.cleanup();
  console.log('\nTest complete');
}

main().catch(console.error);