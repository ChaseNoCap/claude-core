import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Container } from 'inversify';
import type { ILogger } from '@chasenocap/logger';
import type { IEventBus } from '@chasenocap/event-system';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from '../../src/index.js';
import type { IClaude, ClaudeOptions } from '../../src/index.js';

describe('Commit Message Generation Integration Test', () => {
  let container: Container;
  let claude: IClaude;

  beforeAll(() => {
    container = new Container();

    // Mock dependencies
    const mockLogger: ILogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    const mockEventBus: IEventBus = {
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
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

    claude = container.get<IClaude>(CLAUDE_TYPES.IClaude);
  });

  afterAll(async () => {
    await claude.cleanup();
  });

  it('should generate a commit message based on git diff', async () => {
    // Skip if Claude CLI is not available
    const checkResult = await claude.spawn({
      command: 'which',
      args: ['claude'],
    });

    if (!checkResult.success) {
      console.log('Skipping integration test: Claude CLI not found');
      return;
    }

    // Create a session for commit message generation
    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: `You are a commit message generator. 
        When given a git diff, generate a concise commit message following conventional commits format.
        Format: <type>: <description>
        Types: feat, fix, docs, style, refactor, test, chore`,
      },
      tools: [
        { type: 'deny', tools: ['*'] }, // No tools needed for commit messages
      ],
    });

    expect(sessionResult.success).toBe(true);
    if (!sessionResult.success) return;

    const session = sessionResult.value;

    // Simulate a git diff
    const gitDiff = `
diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1234567..abcdefg 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -10,6 +10,7 @@ interface ButtonProps {
   onClick?: () => void;
   disabled?: boolean;
   variant?: 'primary' | 'secondary';
+  size?: 'small' | 'medium' | 'large';
 }
 
 export const Button: React.FC<ButtonProps> = ({
@@ -17,10 +18,12 @@ export const Button: React.FC<ButtonProps> = ({
   onClick,
   disabled = false,
   variant = 'primary',
+  size = 'medium',
 }) => {
   return (
     <button
       className={\`btn btn-\${variant}\`}
+      data-size={size}
       onClick={onClick}
       disabled={disabled}
     >
    `;

    const prompt = `Generate a commit message for the following git diff:\n\n${gitDiff}`;
    const executeResult = await session.execute(prompt, { timeout: 10000 });

    expect(executeResult.success).toBe(true);
    if (!executeResult.success) return;

    const { output } = executeResult.value;
    expect(output).toBeTruthy();

    // Verify the commit message follows conventional format
    const commitMessagePattern = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
    const lines = output.trim().split('\n');
    const commitMessage = lines.find((line) => commitMessagePattern.test(line));

    expect(commitMessage).toBeTruthy();
    expect(commitMessage).toMatch(commitMessagePattern);

    // Clean up
    await claude.destroySession(session.id);
  }, 30000);

  it('should handle multiple commit message requests in sequence', async () => {
    // Skip if Claude CLI is not available
    const checkResult = await claude.spawn({
      command: 'which',
      args: ['claude'],
    });

    if (!checkResult.success) {
      console.log('Skipping integration test: Claude CLI not found');
      return;
    }

    const sessionResult = await claude.createSession({
      context: {
        systemPrompt: 'Generate conventional commit messages for git diffs.',
      },
    });

    expect(sessionResult.success).toBe(true);
    if (!sessionResult.success) return;

    const session = sessionResult.value;

    // First commit
    const firstDiff = 'Added new authentication module';
    const firstResult = await session.execute(`Generate commit message for: ${firstDiff}`, {
      timeout: 5000,
    });
    expect(firstResult.success).toBe(true);

    // Second commit
    const secondDiff = 'Fixed null pointer exception in user service';
    const secondResult = await session.execute(`Generate commit message for: ${secondDiff}`, {
      timeout: 5000,
    });
    expect(secondResult.success).toBe(true);

    // Verify session maintained context
    const state = await session.getState();
    expect(state.metadata.messageCount).toBe(2);

    await claude.destroySession(session.id);
  }, 30000);
});
