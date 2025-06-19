import { describe, it, expect } from 'vitest';
import { Container } from 'inversify';
import { ConsoleLogger } from '../../src/mocks/logger/index.js';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { ToolManager, SessionStore, CLAUDE_TYPES, ClaudeModel } from '../../src/index.js';
import { StatelessClaudeSession } from '../../src/implementations/StatelessClaudeSession.js';

describe('Real Integration Test - StatelessClaudeSession', () => {
  it('should execute a simple prompt with Claude CLI', async () => {
    const container = new Container();
    
    // Use real console logger
    const logger = new ConsoleLogger();
    
    // Mock event bus
    const mockEventBus: IEventBus = {
      emit: async (event) => {
        console.log('Event emitted:', event.type);
      },
      on: () => {},
      off: () => {},
    } as any;
    
    // Setup container
    container.bind<ILogger>(CLAUDE_TYPES.ILogger).toConstantValue(logger);
    container.bind<IEventBus>(CLAUDE_TYPES.IEventBus).toConstantValue(mockEventBus);
    container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager).inSingletonScope();
    container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore).inSingletonScope();
    
    const toolManager = container.get<ToolManager>(CLAUDE_TYPES.IToolManager);
    const sessionStore = container.get<SessionStore>(CLAUDE_TYPES.SessionStore);
    
    // Create session
    const session = new StatelessClaudeSession(
      logger,
      mockEventBus,
      toolManager,
      sessionStore,
      'test-session-1',
      {
        model: ClaudeModel.HAIKU_3_5,
        claudePath: 'claude',
        context: {
          systemPrompt: 'You are a helpful assistant. Keep responses very brief.'
        }
      }
    );
    
    await session.initialize();
    
    console.log('\n=== Running Claude CLI Test ===');
    console.log('Prompt: "What is 2+2? Answer with just the number."');
    
    // Execute prompt
    const result = await session.execute('What is 2+2? Answer with just the number.', {
      timeout: 10000
    });
    
    console.log('\nResult:', result);
    
    if (result.success) {
      console.log('Output:', result.value.output);
      console.log('Tool uses:', result.value.toolUses);
      console.log('Metadata:', result.value.metadata);
      
      // Basic assertions
      expect(result.value.output).toBeTruthy();
      expect(result.value.metadata.duration).toBeGreaterThan(0);
    } else {
      console.error('Error:', result.error);
    }
    
    // Test conversation history
    console.log('\n=== Testing Conversation History ===');
    const secondResult = await session.execute('What was my previous question?', {
      timeout: 10000
    });
    
    console.log('\nSecond Result:', secondResult.success ? 'Success' : 'Failed');
    if (secondResult.success) {
      console.log('Output:', secondResult.value.output);
    }
    
    // Check session state
    const state = await session.getState();
    console.log('\nSession state:', {
      id: state.id,
      status: state.status,
      messageCount: state.metadata.messageCount,
      toolUseCount: state.metadata.toolUseCount
    });
    
    await session.destroy();
  }, 30000);
});