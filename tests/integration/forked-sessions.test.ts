import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Container } from 'inversify';
import { ConsoleLogger } from '../../src/mocks/logger/index.js';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES, ClaudeModel } from '../../src/index.js';
import type { IClaude, ClaudeOptions, IClaudeSession } from '../../src/index.js';

describe('Forked Sessions Integration Test', () => {
  let container: Container;
  let claude: IClaude;

  beforeAll(() => {
    container = new Container();

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
      defaultModel: ClaudeModel.HAIKU_3_5, // Use fast model for tests
    });
    container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

    claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);
  });

  afterAll(async () => {
    await claude.cleanup();
  });

  it('should fork session and maintain independent contexts', async () => {
    console.log('\n=== Testing Basic Session Forking ===\n');

    // Create original session
    const originalSessionResult = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
    });

    expect(originalSessionResult.success).toBe(true);
    const originalSession = originalSessionResult.value!;
    console.log('Created original session:', originalSession.id);

    // Execute first code-related task
    const result1 = await originalSession.execute('What is the time complexity of bubble sort?', { timeout: 30000 });
    expect(result1.success).toBe(true);
    console.log('Original session - bubble sort response:', result1.value?.output);

    // Fork the session after first interaction
    console.log('\nForking session...');
    const forkedSession = await originalSession.fork();
    console.log('Created forked session:', forkedSession.id);
    console.log('Fork parent ID:', forkedSession.parentId);
    expect(forkedSession.parentId).toBe(originalSession.id);

    // Continue with original session - different algorithm
    const result2 = await originalSession.execute('What is the time complexity of merge sort?', { timeout: 30000 });
    expect(result2.success).toBe(true);
    console.log('\nOriginal session - merge sort response:', result2.value?.output);

    // Ask about history in original session
    const result3 = await originalSession.execute('What sorting algorithms have we discussed? List just the algorithm names.', { timeout: 30000 });
    expect(result3.success).toBe(true);
    console.log('Original session - history check:', result3.value?.output);
    
    // Should know about both bubble and merge sort
    const originalHistory = result3.value?.output.toLowerCase() || '';
    expect(originalHistory).toContain('bubble');
    expect(originalHistory).toContain('merge');

    // Now work with forked session - it should have bubble sort but not merge sort
    console.log('\n--- Testing Forked Session Context ---');
    const forkResult1 = await forkedSession.execute('What sorting algorithms have we discussed? List just the algorithm names.', { timeout: 30000 });
    expect(forkResult1.success).toBe(true);
    console.log('Forked session - history check:', forkResult1.value?.output);
    
    // Forked session should remember bubble but not know about merge
    const forkHistory = forkResult1.value?.output.toLowerCase() || '';
    expect(forkHistory).toContain('bubble');
    expect(forkHistory).not.toContain('merge');

    // Ask different algorithm in forked session
    const forkResult2 = await forkedSession.execute('What is the time complexity of quick sort?', { timeout: 30000 });
    expect(forkResult2.success).toBe(true);
    console.log('Forked session - quick sort response:', forkResult2.value?.output);

    // Verify original session doesn't know about quick sort
    console.log('\n--- Verifying Context Isolation ---');
    const isolationCheck = await originalSession.execute(
      'Have we discussed quick sort? Just answer yes or no.', 
      { timeout: 30000 }
    );
    expect(isolationCheck.success).toBe(true);
    console.log('Original session - quick sort check:', isolationCheck.value?.output);
    
    // Original session should say no
    const isolationResponse = isolationCheck.value?.output.toLowerCase() || '';
    expect(isolationResponse).toContain('no');

    // Check message counts
    const originalState = await originalSession.getState();
    const forkedState = await forkedSession.getState();
    
    console.log('\nMessage counts:');
    console.log('Original session:', originalState.metadata.messageCount);
    console.log('Forked session:', forkedState.metadata.messageCount);

    // Original should have more messages (add, multiply, history question, isolation check)
    expect(originalState.metadata.messageCount).toBe(8); // 4 user + 4 assistant
    // Forked should have fewer (add from history, history check, divide)
    expect(forkedState.metadata.messageCount).toBe(6); // 3 user + 3 assistant

    // Clean up
    await claude.destroySession(originalSession.id);
    await claude.destroySession(forkedSession.id);
  }, 120000); // 2 minute timeout

  it('should support multiple forks at different points', async () => {
    console.log('\n=== Testing Multiple Fork Points ===\n');

    // Create base session
    const baseResult = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
    });

    expect(baseResult.success).toBe(true);
    const baseSession = baseResult.value!;

    // Build up code refactoring session
    console.log('Building refactoring session...');
    await baseSession.execute('I have a JavaScript function that needs refactoring. Here it is: function getData() { return fetch("/api/data").then(r => r.json()) }', { timeout: 30000 });
    await baseSession.execute('Can you convert this to use async/await?', { timeout: 30000 });
    
    // Fork at this point (after 2 interactions)
    console.log('\nCreating fork1 after 2 interactions...');
    const fork1 = await baseSession.fork();
    
    // Continue base session with error handling
    await baseSession.execute('Now add error handling to the function', { timeout: 30000 });
    
    // Fork again at different point (after 3 interactions)
    console.log('Creating fork2 after 3 interactions...');
    const fork2 = await baseSession.fork();

    // Each fork should have different context
    console.log('\n--- Testing Fork Contexts ---');
    
    // Fork1 shouldn't know about the error handling
    const fork1Check = await fork1.execute('Have we discussed error handling for this function? Answer yes or no.', { timeout: 30000 });
    expect(fork1Check.success).toBe(true);
    console.log('Fork1 error handling check:', fork1Check.value?.output);
    const fork1Response = fork1Check.value?.output.toLowerCase() || '';
    expect(fork1Response).toContain('no');

    // Fork2 should know about the error handling
    const fork2Check = await fork2.execute('Have we discussed error handling for this function? Answer yes or no.', { timeout: 30000 });
    expect(fork2Check.success).toBe(true);
    console.log('Fork2 error handling check:', fork2Check.value?.output);
    const fork2Response = fork2Check.value?.output.toLowerCase() || '';
    expect(fork2Response).toContain('yes');

    // Create different modifications in each fork
    const fork1Mod = await fork1.execute('Add TypeScript types to the function', { timeout: 30000 });
    const fork2Mod = await fork2.execute('Add retry logic to the function', { timeout: 30000 });

    expect(fork1Mod.success).toBe(true);
    expect(fork2Mod.success).toBe(true);

    // Verify base session doesn't know about either modification
    const baseCheck = await baseSession.execute(
      'Have I asked you to add TypeScript types or retry logic? Answer yes or no.', 
      { timeout: 30000 }
    );
    expect(baseCheck.success).toBe(true);
    console.log('\nBase session modifications check:', baseCheck.value?.output);
    const baseResponse = baseCheck.value?.output.toLowerCase() || '';
    expect(baseResponse).toContain('no');

    // Clean up
    await claude.destroySession(baseSession.id);
    await claude.destroySession(fork1.id);
    await claude.destroySession(fork2.id);
  }, 180000); // 3 minute timeout

  it('should fork from a specific message in history', async () => {
    console.log('\n=== Testing Fork from Specific Message ===\n');

    // Create session with some history
    const sessionResult = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
    });

    expect(sessionResult.success).toBe(true);
    const session = sessionResult.value!;

    // Build conversation history with code-related tasks
    console.log('Building conversation history...');
    const tasks = [
      'Write a function to reverse a string in Python',
      'Write a function to check if a number is prime in Python',
      'Write a function to find the factorial of a number in Python',
    ];

    for (const task of tasks) {
      const result = await session.execute(task, { timeout: 30000 });
      expect(result.success).toBe(true);
      console.log(`Task: ${task}`);
      console.log(`Response received\n`);
    }

    // Get history to find message IDs
    const history = await session.getHistory();
    console.log('Total messages in history:', history.length);
    
    // Log the history for debugging
    console.log('\nHistory:');
    history.forEach((msg: any, i: number) => {
      console.log(`${i}: [${msg.role}] ${msg.content.substring(0, 50)}... (ID: ${msg.id})`);
    });

    // Fork from after the prime check question (should be message index 3 - 2nd assistant response)
    // This means the fork should know about reverse string and prime check but not factorial
    const messageIdAfterPrime = history[3]?.id; // 0=reverse Q, 1=reverse A, 2=prime Q, 3=prime A
    console.log('\nForking from message ID:', messageIdAfterPrime);

    const forkedSession = await session.fork(messageIdAfterPrime);
    
    // Test fork knowledge
    const forkTest1 = await forkedSession.execute(
      'What Python functions have I asked you to write? List just the function purposes, not the code.', 
      { timeout: 30000 }
    );
    expect(forkTest1.success).toBe(true);
    console.log('Fork functions check:', forkTest1.value?.output);

    const forkResponse = forkTest1.value?.output.toLowerCase() || '';
    // Clean up any residual conversation markers
    const cleanedResponse = forkResponse.split('\n')[0].trim();
    
    // Should know about reverse string and prime check
    expect(cleanedResponse).toContain('reverse');
    expect(cleanedResponse).toContain('prime');
    // Should NOT know about factorial
    expect(cleanedResponse).not.toContain('factorial');

    // Original session should still know about all three
    const originalTest = await session.execute(
      'How many different Python functions have I asked you to write? Just give me the number.', 
      { timeout: 30000 }
    );
    expect(originalTest.success).toBe(true);
    console.log('\nOriginal session count:', originalTest.value?.output);
    const originalCount = originalTest.value?.output || '';
    expect(originalCount).toContain('3');

    // Clean up
    await claude.destroySession(session.id);
    await claude.destroySession(forkedSession.id);
  }, 120000); // 2 minute timeout

  it('should handle rapid forking without context bleed', async () => {
    console.log('\n=== Testing Rapid Forking ===\n');

    const baseResult = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
    });

    expect(baseResult.success).toBe(true);
    const baseSession = baseResult.value!;

    // Give base session a task
    await baseSession.execute('I have a JavaScript project. Let\'s call it "base-project".', { timeout: 30000 });

    // Rapidly create multiple forks
    console.log('Creating multiple forks rapidly...');
    const forks: IClaudeSession[] = [];
    for (let i = 0; i < 3; i++) {
      const fork = await baseSession.fork();
      forks.push(fork);
      console.log(`Created fork ${i + 1}:`, fork.id);
    }

    // Give each fork a different project feature
    const forkFeatures = ['authentication', 'database', 'api'];
    console.log('\nGiving each fork a different feature to discuss...');
    for (let i = 0; i < forks.length; i++) {
      const result = await forks[i].execute(
        `Let's add ${forkFeatures[i]} to the project. What would be a good approach?`, 
        { timeout: 30000 }
      );
      expect(result.success).toBe(true);
      console.log(`Fork ${i + 1} discussed:`, forkFeatures[i]);
    }

    // Verify each fork only knows its own feature and the base project
    console.log('\nVerifying fork isolation...');
    for (let i = 0; i < forks.length; i++) {
      const result = await forks[i].execute(
        'What features have we discussed for this project so far? Just list the feature names.', 
        { timeout: 30000 }
      );
      expect(result.success).toBe(true);
      
      const response = result.value?.output.toLowerCase() || '';
      console.log(`Fork ${i + 1} response:`, response);
      
      // Should know about its own feature
      expect(response).toContain(forkFeatures[i]);
      
      // Should NOT know about other fork features
      for (let j = 0; j < forkFeatures.length; j++) {
        if (i !== j) {
          expect(response).not.toContain(forkFeatures[j]);
        }
      }
    }

    // Verify base session only knows about the base project
    const baseCheck = await baseSession.execute('What features have we discussed for this project? Just list any feature names.', { timeout: 30000 });
    expect(baseCheck.success).toBe(true);
    console.log('\nBase session response:', baseCheck.value?.output);
    
    const baseResponse = baseCheck.value?.output.toLowerCase() || '';
    // Base shouldn't know about any of the fork features
    expect(baseResponse).not.toContain('authentication');
    expect(baseResponse).not.toContain('database');
    expect(baseResponse).not.toContain('api');

    // Clean up
    await claude.destroySession(baseSession.id);
    for (const fork of forks) {
      await claude.destroySession(fork.id);
    }
  }, 180000); // 3 minute timeout
});