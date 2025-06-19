import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from '../src/index.js';
import type { IClaude, ISessionManager, ClaudeOptions } from '../src/index.js';

async function fluentApiExample(): Promise<void> {
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
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  container.bind<ClaudeOptions>(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude',
    defaultModel: 'claude-3-opus-20240229',
  });
  container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  try {
    // Create initial session
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'You are a helpful coding assistant.',
      },
    });

    if (!sessionResult.success) {
      console.error('Failed to create session:', sessionResult.error);
      return;
    }

    const session = sessionResult.value;

    // Fluent API usage - chaining multiple prompts
    const result = await session
      .execute('What is TypeScript?')
      .then(fluent => {
        console.log('First response:', fluent.getResponse());
        return fluent.then('What are its main advantages over JavaScript?');
      })
      .then(fluent => {
        console.log('Second response:', fluent.getResponse());
        return fluent.withSystemPrompt('You are now a TypeScript expert. Be more technical.')
          .then('Explain TypeScript\'s type system in detail');
      });

    console.log('Final response:', result.getResponse());

    // Branching example - fork at any point
    const branchResult = await session
      .execute('Let\'s discuss React')
      .then(fluent => fluent.branch('What about Vue.js instead?'));

    console.log('Branch response:', branchResult.getResponse());

    // The original session continues unaffected
    const continueResult = await session.execute('Tell me more about React hooks');
    console.log('Original session continues:', continueResult.getResponse());

    // Fork from a specific message
    const history = await session.getHistory();
    const reactMessage = history.find(m => m.content.includes('React'));
    
    if (reactMessage) {
      const forkedSession = await session.fork(reactMessage.id);
      const forkedResult = await forkedSession.execute('What about Angular?');
      console.log('Forked session response:', forkedResult.getResponse());
    }

    // Checkpoint and restore
    const checkpointId = await session.checkpoint('before-advanced-topics');
    
    // Continue with advanced topics
    await session.execute('Explain advanced TypeScript patterns');
    
    // Later, restore from checkpoint
    // const restoredSession = await claude.restoreFromCheckpoint(checkpointId);

    // Compact history when it gets too long
    const compactedResult = await session
      .execute('Summarize our conversation')
      .then(fluent => fluent.compact());

    console.log('Session compacted, continuing with:', compactedResult.session.id);

    // Clean up
    await claude.cleanup();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example: Commit message generation with caching
async function commitMessageExample(): Promise<void> {
  const container = new Container();
  // ... setup container as above ...

  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  const sessionResult = await claude.createSession({
    context: {
      systemPrompt: 'Generate conventional commit messages for git diffs.',
    },
  });

  if (!sessionResult.success) return;

  const session = sessionResult.value;

  // First request - will hit Claude
  const diff1 = 'Added user authentication module';
  const result1 = await session.execute(`Generate commit message for: ${diff1}`);
  console.log('First commit message:', result1.getResponse());

  // Same request - will use cache
  const result2 = await session.execute(`Generate commit message for: ${diff1}`);
  console.log('Cached response:', result2.getResponse());
  console.log('Was cached:', result2.wasSuccessful());

  // Different request - will hit Claude again
  const diff2 = 'Fixed null pointer in user service';
  const result3 = await session.execute(`Generate commit message for: ${diff2}`);
  console.log('New commit message:', result3.getResponse());

  await claude.cleanup();
}

// Example: Error handling in fluent API
async function errorHandlingExample(): Promise<void> {
  const container = new Container();
  // ... setup container as above ...

  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  const sessionResult = await claude.createSession({
    context: {
      systemPrompt: 'You are a helpful assistant.',
    },
  });

  if (!sessionResult.success) return;

  const session = sessionResult.value;

  // Chain continues even with errors
  const result = await session
    .execute('This will work')
    .then(async fluent => {
      // Simulate session dying
      await session.destroy();
      return fluent.then('This will fail');
    })
    .then(fluent => {
      if (!fluent.wasSuccessful()) {
        console.error('Error occurred:', fluent.getError());
        // Can recover by forking or creating new session
      }
      return fluent;
    });

  console.log('Final result successful:', result.wasSuccessful());
}

// Run examples
fluentApiExample()
  .then(() => commitMessageExample())
  .then(() => errorHandlingExample())
  .catch(console.error);