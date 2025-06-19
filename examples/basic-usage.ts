import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, CLAUDE_TYPES } from '../src/index.js';
import type { IClaude, ClaudeOptions } from '../src/index.js';
import { ClaudeModel } from '../src/types/models.js';

async function main(): Promise<void> {
  const container = new Container();

  // Mock logger for example
  const mockLogger: ILogger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  } as any;

  // Mock event bus for example
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
    defaultModel: ClaudeModel.OPUS_4,
    maxConcurrentSessions: 5,
  });
  container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  // Get Claude instance
  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  try {
    // Create a session
    const sessionResult = await claude.createSession({
      model: ClaudeModel.OPUS_4,
      context: {
        systemPrompt: 'You are a helpful coding assistant.',
      },
    });

    if (!sessionResult.success) {
      console.error('Failed to create session:', sessionResult.error);
      return;
    }

    const session = sessionResult.value;
    console.log('Created session:', session.id);

    // Execute a prompt
    const executeResult = await session.execute('Write a simple hello world function in TypeScript');

    if (!executeResult.success) {
      console.error('Failed to execute prompt:', executeResult.error);
      return;
    }

    console.log('Response:', executeResult.value.output);
    console.log('Tool uses:', executeResult.value.toolUses);
    console.log('Metadata:', executeResult.value.metadata);

    // Clean up
    await claude.destroySession(session.id);
    await claude.cleanup();
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);