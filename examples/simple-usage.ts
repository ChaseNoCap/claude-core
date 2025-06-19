#!/usr/bin/env node
import { Container } from 'inversify';
import { ConsoleLogger } from '../mocks/logger/index.js';
import { EventBus } from '../mocks/event-system/index.js';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from '../src/index.js';
import type { IClaude, ISessionManager, ClaudeOptions } from '../src/index.js';

// Simple mock session manager for the example
class MockSessionManager {
  async createSession(options: any) {
    return { success: true, value: null };
  }
  async compactHistory() {
    return { success: true, value: null };
  }
}

async function main() {
  // Set up minimal DI container
  const container = new Container();
  
  container.bind(CLAUDE_TYPES.ILogger).toConstantValue(new ConsoleLogger());
  container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(new EventBus());
  container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
  container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
  container.bind(CLAUDE_TYPES.ISessionManager).toConstantValue(new MockSessionManager());
  container.bind<ClaudeOptions>(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
    claudePath: 'claude', // Assumes 'claude' is in PATH
    defaultModel: 'claude-3-opus-20240229',
  });
  container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

  const claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);

  try {
    // Create a session
    console.log('Creating Claude session...');
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
    console.log(`✓ Created session: ${session.id}`);

    // Use the fluent API
    console.log('\nAsking about TypeScript...');
    const result = await session
      .execute('What is TypeScript in one sentence?')
      .then(async (fluent) => {
        console.log('\nClaude:', fluent.getResponse());
        
        // Continue the conversation
        return fluent.then('What are its main benefits?');
      })
      .then(async (fluent) => {
        console.log('\nClaude:', fluent.getResponse());
        
        // Branch the conversation
        return fluent.branch('How does it compare to JavaScript?');
      });

    console.log('\nBranched conversation - Claude:', result.getResponse());

    // Fork the session
    console.log('\n\nForking session...');
    const forkedSession = await session.fork();
    console.log(`✓ Created fork: ${forkedSession.id} (parent: ${forkedSession.parentId})`);

    // Continue with forked session
    const forkedResult = await forkedSession.execute('What about Python?');
    console.log('\nForked session - Claude:', forkedResult.getResponse());

    // Show session history
    console.log('\n\nSession History:');
    const history = await session.getHistory();
    history.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
    });

    // Clean up
    console.log('\n\nCleaning up...');
    await claude.destroySession(session.id);
    await claude.destroySession(forkedSession.id);
    await claude.cleanup();
    console.log('✓ Done');

  } catch (error) {
    console.error('Error:', error);
    await claude.cleanup();
  }
}

// Run the example
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}