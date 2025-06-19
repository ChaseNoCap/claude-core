import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, CLAUDE_TYPES } from '../src/index.js';
import type { IClaude, ClaudeOptions } from '../src/index.js';

async function streamingExample(): Promise<void> {
  const container = new Container();

  // Mock dependencies
  const mockLogger: ILogger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  } as any;

  const mockEventBus: IEventBus = {
    emit: async () => {},
    on: () => {},
    off: () => {},
  } as any;

  // Configure DI container
  container.bind<ILogger>(CLAUDE_TYPES.ILogger).toConstantValue(mockLogger);
  container.bind<IEventBus>(CLAUDE_TYPES.IEventBus).toConstantValue(mockEventBus);
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind<ClaudeOptions>(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: 'claude-3-opus-20240229',
  });
  container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  try {
    // Create a session
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'You are a helpful assistant that explains concepts step by step.',
      },
    });

    if (!sessionResult.success) {
      console.error('Failed to create session:', sessionResult.error);
      return;
    }

    const session = sessionResult.value;
    console.log('Streaming response for session:', session.id);

    // Stream the response
    const prompt = 'Explain how async iterators work in TypeScript';
    console.log('\nPrompt:', prompt);
    console.log('\nStreaming response:');
    console.log('-'.repeat(50));

    for await (const chunk of session.stream(prompt)) {
      process.stdout.write(chunk);
    }

    console.log('\n' + '-'.repeat(50));

    // Clean up
    await claude.destroySession(session.id);
    await claude.cleanup();
  } catch (error) {
    console.error('Error:', error);
  }
}

streamingExample().catch(console.error);