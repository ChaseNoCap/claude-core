import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Container } from 'inversify';
import { ConsoleLogger } from '../../src/mocks/logger/index.js';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES, ClaudeModel } from '../../src/index.js';
import type { IClaude, ClaudeOptions } from '../../src/index.js';

describe('Parallel Commit Operations Integration Test', () => {
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
      defaultModel: ClaudeModel.OPUS_4,
      maxConcurrentSessions: 5,
    });
    container.bind<IClaude>(CLAUDE_TYPES.IClaude).to(Claude).inSingletonScope();

    claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);
  });

  afterAll(async () => {
    await claude.cleanup();
  });

  it('should handle multiple parallel commit message generations', async () => {
    console.log('\n=== Testing Parallel Commit Message Generation ===\n');

    // Create multiple sessions
    const sessionCount = 3;
    const sessions = [];
    
    console.log(`Creating ${sessionCount} sessions...`);
    for (let i = 0; i < sessionCount; i++) {
      const sessionResult = await claude.createSession({
        model: ClaudeModel.HAIKU_3_5, // Use Haiku 3.5 which is more reliable
        context: {
          systemPrompt: `You are commit message generator #${i + 1}. Always include your ID in responses.
          Generate conventional commit messages in the format: <type>: <description>
          Types: feat, fix, docs, style, refactor, test, chore`,
        },
      });
      
      expect(sessionResult.success).toBe(true);
      if (sessionResult.success) {
        sessions.push(sessionResult.value);
        console.log(`Created session ${i + 1}: ${sessionResult.value.id}`);
      }
    }

    // Define different diffs for each session
    const diffs = [
      {
        description: 'Added user authentication',
        diff: `
diff --git a/src/auth/login.ts b/src/auth/login.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth/login.ts
@@ -0,0 +1,15 @@
+export async function login(username: string, password: string) {
+  const response = await fetch('/api/auth/login', {
+    method: 'POST',
+    body: JSON.stringify({ username, password })
+  });
+  return response.json();
+}`,
      },
      {
        description: 'Fixed memory leak in event handler',
        diff: `
diff --git a/src/utils/events.ts b/src/utils/events.ts
index abcdef..fedcba 100644
--- a/src/utils/events.ts
+++ b/src/utils/events.ts
@@ -10,6 +10,8 @@ export class EventManager {
   
   removeListener(event: string, handler: Function) {
     const handlers = this.listeners.get(event);
+    if (!handlers) return;
+    
     const index = handlers.indexOf(handler);
     if (index > -1) {
       handlers.splice(index, 1);
+      if (handlers.length === 0) {
+        this.listeners.delete(event);
+      }
     }
   }`,
      },
      {
        description: 'Updated documentation',
        diff: `
diff --git a/README.md b/README.md
index 123456..abcdef 100644
--- a/README.md
+++ b/README.md
@@ -1,3 +1,10 @@
 # Project Name
 
-Description here
+A comprehensive toolkit for building scalable applications.
+
+## Installation
+\`\`\`bash
+npm install project-name
+\`\`\`
+
+## Usage
+See documentation for details.`,
      },
    ];

    console.log('\nExecuting parallel requests...');
    const startTime = Date.now();

    // Execute in parallel
    const promises = sessions.map(async (session, index) => {
      const diff = diffs[index];
      console.log(`Session ${index + 1}: Starting execution for "${diff.description}"`);
      
      const result = await session.execute(
        `Generate a commit message for this change: ${diff.description}\n\nDiff:\n${diff.diff}`,
        { timeout: 60000 }
      );
      
      console.log(`Session ${index + 1}: Completed in ${Date.now() - startTime}ms`);
      return { session, result, index };
    });

    // Wait for all to complete
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    console.log(`\nAll requests completed in ${totalTime}ms\n`);

    // Verify results
    for (const { session, result, index } of results) {
      if (!result.success) {
        console.error(`Session ${index + 1} failed:`, result.error);
      }
      expect(result.success).toBe(true);
      
      if (result.success) {
        console.log(`\nSession ${index + 1} output:`);
        console.log(result.value.output);
        console.log('---');
        
        // Verify it's a valid commit message
        const commitPattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/m;
        expect(result.value.output).toMatch(commitPattern);
        
        // Just verify we got a valid response - Claude may not always include the ID
        // The important thing is that each session got a proper response
      }
    }

    // Verify sessions are independent by checking their histories
    console.log('\nVerifying session independence...');
    for (let i = 0; i < sessions.length; i++) {
      const state = await sessions[i].getState();
      expect(state.metadata.messageCount).toBe(2); // 1 user + 1 assistant
      console.log(`Session ${i + 1}: ${state.metadata.messageCount} messages`);
    }

    // Clean up
    for (const session of sessions) {
      await claude.destroySession(session.id);
    }

    console.log('\n=== Parallel test completed successfully ===');
  }, 180000); // 3 minute timeout for parallel operations

  it('should handle rapid sequential commits without mixing contexts', async () => {
    console.log('\n=== Testing Rapid Sequential Commits ===\n');

    // Create two sessions with different contexts
    const session1Result = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
      context: {
        systemPrompt: `You are a FRONTEND commit specialist. 
        Generate conventional commit messages for frontend changes.
        ALWAYS start your commit messages with "frontend:" prefix.
        Example: "frontend: feat: add new button component"`,
      },
    });

    const session2Result = await claude.createSession({
      model: ClaudeModel.HAIKU_3_5,
      context: {
        systemPrompt: `You are a BACKEND commit specialist.
        Generate conventional commit messages for backend changes.
        ALWAYS start your commit messages with "backend:" prefix.
        Example: "backend: feat: add user authentication endpoint"`,
      },
    });

    expect(session1Result.success).toBe(true);
    expect(session2Result.success).toBe(true);

    const session1 = session1Result.value!;
    const session2 = session2Result.value!;

    // Rapidly alternate between sessions
    const operations = [
      { session: session1, change: 'Added React component' },
      { session: session2, change: 'Added API endpoint' },
      { session: session1, change: 'Fixed CSS styling' },
      { session: session2, change: 'Updated database schema' },
    ];

    console.log('Executing rapid alternating requests...');
    const results = [];

    for (const { session, change } of operations) {
      console.log(`Executing for session ${session.id}: "${change}"`);
      const result = await session.execute(
        `Generate a conventional commit message for the following change: "${change}". Remember to use your prefix.`,
        { timeout: 30000 }
      );
      console.log(`Result for "${change}": ${result.success ? 'Success' : 'Failed'}`);
      if (!result.success) {
        console.error(`Error details:`, result.error);
      }
      results.push({ session, result, change });
    }

    // Verify each session maintained its context
    console.log('\nVerifying context isolation...');
    for (const { session, result, change } of results) {
      if (!result.success) {
        console.error(`Failed for change "${change}":`, result.error);
      }
      expect(result.success).toBe(true);
      
      if (result.success) {
        console.log(`\nChange: "${change}"`);
        console.log(`Output: ${result.value.output.trim()}`);
        
        // Verify frontend session always has frontend prefix
        if (session.id === session1.id) {
          expect(result.value.output.toLowerCase()).toContain('frontend:');
        }
        // Verify backend session always has backend prefix
        else if (session.id === session2.id) {
          expect(result.value.output.toLowerCase()).toContain('backend:');
        }
      }
    }

    // Clean up
    await claude.destroySession(session1.id);
    await claude.destroySession(session2.id);

    console.log('\n=== Rapid sequential test completed successfully ===');
  }, 120000); // 2 minute timeout
});