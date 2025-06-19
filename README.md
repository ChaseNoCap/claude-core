# @chasenocap/claude-core

Foundational Claude CLI wrapper for the metaGOTHIC framework. This package provides robust session management, tool use control, and subprocess handling for all Claude interactions.

## Current Status

This is a minimalistic implementation with mock dependencies for @chasenocap packages. The core functionality is in place and the package builds successfully.

## Installation

```bash
npm install @chasenocap/claude-core
```

Note: This package requires the Claude CLI to be installed and available in your PATH.

## Quick Start

```typescript
import { Container } from 'inversify';
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from '@chasenocap/claude-core';

// Set up DI container
const container = new Container();

// Bind dependencies
container.bind(CLAUDE_TYPES.ILogger).toConstantValue(console);
container.bind(CLAUDE_TYPES.IEventBus).toConstantValue(eventBus);
container.bind(CLAUDE_TYPES.IToolManager).to(ToolManager);
container.bind(CLAUDE_TYPES.SessionStore).to(SessionStore);
container.bind(CLAUDE_TYPES.ClaudeOptions).toConstantValue({
  claudePath: 'claude',
  defaultModel: 'claude-3-opus-20240229',
});
container.bind(CLAUDE_TYPES.IClaude).to(Claude);

// Get Claude instance
const claude = container.get(CLAUDE_TYPES.IClaude);

// Create a session
const sessionResult = await claude.createSession({
  context: {
    systemPrompt: 'You are a helpful coding assistant.',
  },
});

if (sessionResult.success) {
  const session = sessionResult.value;
  
  // Execute a prompt
  const result = await session.execute('What is TypeScript?');
  
  if (result.success) {
    console.log(result.value.output);
  }
  
  // Stream response
  for await (const chunk of session.stream('Explain async iterators')) {
    process.stdout.write(chunk);
  }
  
  // Clean up
  await claude.destroySession(session.id);
}
```

## Core Features

- ✅ **Session Management**: Create, destroy, and manage Claude sessions
- ✅ **Tool Control**: Restrict which tools Claude can use per session
- ✅ **Subprocess Management**: Reliable process spawning and lifecycle management
- ✅ **Streaming Support**: Async iterator support for real-time output
- ✅ **Error Handling**: Result pattern with success/fail states
- ✅ **Event System**: Lifecycle events for monitoring
- ✅ **Response Caching**: Built-in caching for identical prompts
- ✅ **History Tracking**: Full conversation history with metadata

## Architecture

The package uses dependency injection with Inversify and follows clean architecture principles:

```
src/
├── interfaces/       # Contract definitions
├── implementations/  # Concrete implementations
├── types/           # TypeScript type definitions
├── utils/           # Helper utilities
└── mocks/           # Mock implementations of @chasenocap packages
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

## Mock Dependencies

This package includes minimal mock implementations for:
- `@chasenocap/di-framework` - Result pattern implementation
- `@chasenocap/logger` - Simple console logger
- `@chasenocap/event-system` - Event bus implementation

These can be replaced with the actual packages when they become available.

## API Reference

### IClaude
- `createSession(options)` - Create a new Claude session
- `destroySession(id)` - Terminate a session
- `restoreSession(id)` - Restore an existing session
- `registerTools(tools)` - Register available tools
- `spawn(options)` - Spawn a subprocess
- `cleanup()` - Clean up all resources

### IClaudeSession
- `execute(prompt, options?)` - Execute a prompt and get result
- `stream(prompt, options?)` - Stream response as async iterator
- `updateContext(context)` - Update session context
- `getState()` - Get current session state
- `getHistory()` - Get conversation history
- `fork(messageId?)` - Fork session (simplified)
- `checkpoint(name?)` - Create a checkpoint
- `destroy()` - Destroy the session

## License

MIT