# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the @chasenocap/claude-core package - a foundational Claude CLI wrapper for the metaGOTHIC framework. It provides robust session management, tool use control, and subprocess handling for all Claude interactions within the metaGOTHIC ecosystem.

### Current Enhancement Project (Active)

We are currently enhancing claude-core to support all modern Claude CLI features. The enhancement project is documented in `/docs/` with:

- **[Comprehensive CLI Reference](./docs/reference/claude-cli-comprehensive-guide.md)** - All modern Claude CLI features
- **[Implementation Roadmap](./docs/implementation/prioritized-stories.md)** - 15 stories across 7 epics, 12-week timeline
- **[Migration Guide](./docs/implementation/migration-guide.md)** - Safe, incremental migration strategy
- **[Code Examples](./docs/examples/code-patterns.md)** - Production-ready patterns and examples

**Enhancement Focus**: Adding streaming JSON, authentication, rate limiting, context management, and MCP support while maintaining 100% backward compatibility.

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

# Lint and format code
npm run lint
npm run format
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
- `StatelessClaudeSession` - Creates new subprocess for each request (aligns with Claude CLI's actual behavior) ✅
- `ToolManager` - Manages tool registration and restrictions ✅
- `SessionStore` - Tracks session history and lineage between stateless calls ✅
- `Subprocess` - Handles process spawning and lifecycle ✅
- `OutputParser` - Parses Claude responses and tool use ✅

**Enhancement Status (Sprint 1 - Foundation):**
- [ ] Story 1.1: Stream-JSON Output Format (5 points) - `--output-format stream-json`
- [ ] Story 1.2: JSON Output Format (3 points) - `--output-format json`
- [x] Story 3.2: Timeout Implementation (3 points) ✅
- [ ] Story 1.4: Session Resumption by ID (5 points) - `-r "session-id"` - **CRITICAL for cost optimization**

## Testing

Tests are written using Vitest with >90% coverage maintained:

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

- **CRITICAL**: Claude cannot launch Claude - integration tests that attempt to spawn the Claude CLI will fail when run from within Claude
  - When testing, users must run tests outside of Claude environment
  - Use mock implementations for testing Claude CLI interactions
- Currently using mock implementations for @chasenocap dependencies
- Claude CLI is stateless - each invocation spawns a new process
- Session "state" is maintained by passing conversation history with each request
- SessionStore tracks lineage and history between stateless invocations
- **Enhancement Documentation**: See `/docs/` for comprehensive enhancement guides
- **Current State**: See `CURRENT_STATE.md` and `NEXT_STEPS.md` for legacy tracking
- **Session Strategy**: We ONLY support explicit session resumption via `-r "session-id"` for precise control and cost optimization. We do NOT implement `-c`/`--continue` (ambiguous last session)

## Current Enhancement Focus

### Sprint 1 (Current - Weeks 1-2): Foundation
1. **Stream-JSON Output** - Real-time streaming support via `--output-format stream-json`
2. **JSON Output Format** - Structured responses via `--output-format json`
3. **Timeout Implementation** - Proper process timeout handling ✅
4. ~~**System Prompt Management**~~ - REMOVED (CLI flags don't exist)

### Upcoming Sprints
- **Sprint 2**: Authentication & Security (Weeks 3-4)
- **Sprint 3**: Performance & Rate Limiting (Weeks 5-6)
- **Sprint 4**: Advanced Features (Weeks 7-8)
- **Sprint 5**: Integration & Polish (Weeks 9-10)
- **Sprint 6**: Migration & Cleanup (Weeks 11-12)

### Key Enhancement Principles
1. **Zero Breaking Changes** - All existing code continues to work
2. **Feature Flags** - Gradual rollout with safe defaults
3. **Validation Gates** - 4 checkpoints throughout implementation
4. **Performance Target** - >20% improvement over current implementation

## Current Gaps Being Addressed

1. **Output Formats** → JSON and stream-JSON support via `--output-format` flag
2. **Tool Permissions** → Enhanced restrictions via `--allowedTools` and `--disallowedTools`
3. **Session Management** → Support for `--continue` and `--resume` flags
4. **Input Handling** → Support for `--input-format` flag
5. **Rate Limiting** → Intelligent backoff and model switching (internal)
6. **Error Handling** → Comprehensive retry logic and circuit breakers
7. **External Dependencies** → Replace mocks with actual @chasenocap packages when available

## Removed Features (Not in Actual CLI)

The following features were removed from our roadmap as they don't exist in the Claude CLI:
- System prompt flags (`--system-prompt`, `--append-system-prompt`)
- Authentication flags (no `--api-key` or similar)
- Context management flags (`--max-context-tokens`, `--clear-context`)
- MCP flags (`--mcp-config`, `--mcp-debug` - MCP uses `claude mcp` command)
- Thinking modes (no such feature exists)

## Working on the Enhancement Project

When implementing enhancement stories:

1. **Check Story Status** - Review `/docs/implementation/prioritized-stories.md` for current sprint work
2. **Follow Migration Guide** - Use `/docs/implementation/migration-guide.md` for safe implementation
3. **Use Code Patterns** - Reference `/docs/examples/code-patterns.md` for implementation examples
4. **Maintain Compatibility** - All changes must pass existing tests without modification
5. **Update Tracking** - Mark story status in this file and stories document

### Development Workflow
```bash
# 1. Pick a story from current sprint
# 2. Create feature branch
git checkout -b feature/story-1.1-stream-json

# 3. Implement with feature flag
# 4. Write tests (maintain >90% coverage)
# 5. Run validation
npm test
npm run typecheck
npm run lint

# 6. Update documentation
# 7. Create PR with story reference
```

### Validation Checkpoints
- **Unit Tests**: All existing tests must pass
- **Integration Tests**: Test with real Claude CLI (run outside Claude)
- **Performance Tests**: No regression from baseline
- **Documentation**: Update relevant docs in `/docs/`