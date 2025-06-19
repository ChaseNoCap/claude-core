# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the @chasenocap/claude-core package - a foundational Claude CLI wrapper for the metaGOTHIC framework. It provides robust session management, tool use control, and subprocess handling for all Claude interactions within the metaGOTHIC ecosystem.

## Build Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run type checking
npm run typecheck

# Development mode (watch)
npm run dev

# Note: lint and format scripts need to be added to package.json
```

## Architecture

The package follows clean architecture principles with clear separation of concerns:

- **Interfaces** (`src/interfaces/`): Define contracts for all major components
- **Implementations** (`src/implementations/`): Concrete implementations using dependency injection
- **Types** (`src/types/`): TypeScript type definitions and DI tokens
- **Utils** (`src/utils/`): Helper functions for output parsing and process management
- **Mocks** (`src/mocks/` and `mocks/`): Mock implementations of external dependencies

Key architectural patterns:
- Dependency Injection using Inversify with decorator support
- IResult<T> pattern for error handling (currently using mocked @chasenocap/di-framework)
- Event-driven architecture (using mocked @chasenocap/event-system)
- Structured logging (via mocked @chasenocap/logger)

### Current Implementation Status

**Core Components:**
- `Claude` - Main entry point, creates and manages sessions
- `ClaudeSession` - Session implementation that attempts to maintain a subprocess (may not align with Claude CLI's stateless nature)
- `StatelessClaudeSession` - Creates new subprocess for each request (aligns with Claude CLI's actual behavior)
- `ToolManager` - Manages tool registration and restrictions
- `SessionStore` - Tracks session history and lineage between stateless calls
- `ContextManager` - Manages conversation context with compaction
- `FluentSession` - Not implemented in source (only exists in dist/)

## Testing

Tests are written using Vitest. Goal is 80% coverage minimum (currently only basic tests implemented):

```bash
# Run a specific test file
npm test tests/unit/ToolManager.test.ts

# Run tests in watch mode
npm test -- --watch

# Run integration tests only
npm test tests/integration/
```

## Key Implementation Details

1. **Session Isolation**: Each Claude session runs in a separate subprocess with its own context
2. **Tool Sandboxing**: Tool restrictions are enforced at the subprocess level using Claude CLI flags
3. **Streaming Support**: Both event emitter and async iterator patterns for real-time output
4. **Error Recovery**: Automatic restart of crashed sessions with exponential backoff
5. **Resource Management**: Proper cleanup of subprocesses to prevent zombie processes

## Important Memories

- Remember that claude cannot launch claude and you must ask the user
- Currently using mock implementations for @chasenocap dependencies
- Claude CLI is stateless - each invocation spawns a new process
- Session "state" is maintained by passing conversation history with each request
- SessionStore tracks lineage and history between stateless invocations

## Current Gaps and TODOs

1. **Test Coverage**: Expand test suite to meet 80% coverage requirement
2. **External Dependencies**: Replace mocks with actual @chasenocap packages when available
3. **Error Handling**: Implement comprehensive error scenarios in tests
4. **Documentation**: Add JSDoc comments to public API methods
5. **ClaudeSession vs StatelessClaudeSession**: Consider removing ClaudeSession if it doesn't align with Claude CLI's stateless nature
6. **Context Management**: Implement proper context compaction for long conversations
7. **Session Lineage**: Complete implementation of session forking and branching