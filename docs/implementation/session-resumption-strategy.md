# Session Resumption Strategy

## Core Principle: Explicit Session Management Only

### Strategy Overview

claude-core implements **explicit session resumption only** through the `-r "session-id"` flag. This design decision is intentional and critical for:

1. **Cost Optimization**: Leveraging Claude's context caching to minimize API fees
2. **Fork Correctness**: Precise control over which session state to resume
3. **Automation Clarity**: No ambiguity about which session is being continued

### What We Support ✅

```typescript
// Resume a specific session by ID
const session = await claude.resumeSession('session-123', {
  prompt: 'Continue working on the feature'
});

// Fork from a specific session
const forkedSession = await claude.forkSession('session-123', {
  atMessage: 5,  // Fork from message 5
  prompt: 'Try a different approach'
});
```

### What We DON'T Support ❌

```typescript
// NO: Ambiguous "continue last session"
// We don't implement `claude -c` or `--continue`

// NO: Piped input from external commands
// All context is built programmatically

// NO: Interactive session selection
// Only explicit session IDs
```

### Implementation Details

1. **Session Storage**: Store session IDs and metadata in `SessionStore`
2. **Context Caching**: Pass full conversation history to leverage Claude's caching
3. **Fork Points**: Track message IDs for precise forking
4. **Cost Tracking**: Monitor token usage across resumed sessions

### Benefits of This Approach

1. **Predictable Costs**: 
   - Cached context reduces token usage
   - Fork from cached sessions for variations
   - Track costs per session lineage

2. **Precise Control**:
   - No guessing which session to continue
   - Explicit fork points
   - Clear session genealogy

3. **Better Testing**:
   - Deterministic session behavior
   - No hidden state
   - Reproducible results

### Example Usage Pattern

```typescript
// Initial session
const mainSession = await claude.createSession({
  systemPrompt: 'You are a TypeScript expert'
});

const result1 = await mainSession.execute('Design a user service');
// Session ID: session-001

// Resume later with cached context
const resumedSession = await claude.resumeSession('session-001');
const result2 = await resumedSession.execute('Add authentication');
// Benefits from cached context, lower cost

// Fork to try alternative approach
const altSession = await claude.forkSession('session-001', {
  atMessage: 1  // Fork after first exchange
});
const result3 = await altSession.execute('Use a different auth pattern');
// Reuses cached context up to fork point

// Track costs
console.log(`Main session cost: ${result1.metadata.cost}`);
console.log(`Resumed session cost: ${result2.metadata.cost}`); // Lower due to caching
console.log(`Forked session cost: ${result3.metadata.cost}`);  // Lower due to caching
```

### CLI Command Mapping

| claude-core API | Claude CLI Command | Purpose |
|----------------|-------------------|---------|
| `createSession()` | `claude -p "prompt"` | New session |
| `resumeSession(id)` | `claude -r "id" -p "prompt"` | Resume specific session |
| `forkSession(id, point)` | Custom implementation | Fork at specific point |

### Cost Optimization Guidelines

1. **Always resume sessions** when continuing work
2. **Fork sessions** instead of creating new ones for variations
3. **Track session lineage** to understand cost patterns
4. **Use session IDs** explicitly in automation scripts

This strategy ensures consistent, predictable, and cost-effective session management for automation workflows.