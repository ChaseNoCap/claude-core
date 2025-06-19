# Next Steps for @chasenocap/claude-core

## ✅ Completed (Priority 1 - Immediate Fixes)

### 1. ✅ Added Missing npm Scripts
- Added `lint` and `format` scripts to package.json
- Installed ESLint, Prettier, and TypeScript ESLint plugins
- Created ESLint flat config (eslint.config.js) and Prettier config

### 2. ✅ Clarified Session Architecture
- Updated documentation to reflect Claude CLI's stateless nature
- All Claude CLI invocations are stateless (no persistent subprocess)
- Session state is maintained through conversation history passed with each request

### 3. ✅ FluentSession Status
- FluentSession doesn't exist in source (only in dist/)
- Removed from exports

## Priority 2 - Test Coverage (Partially Complete)

### ✅ Completed
- Added unit tests for Claude.ts (16 tests)
- Added unit tests for StatelessClaudeSession.ts (21 tests)  
- Configured vitest.config.ts with coverage thresholds and proper mock resolution
- Fixed test infrastructure (mock module resolution, coverage exclusions)

### ⚠️ Current Issues
- Some tests failing due to implementation/test mismatches
- Coverage still below 80% threshold (currently ~30-40%)
- Integration tests timeout when trying to run actual Claude CLI

### 📝 Still Needed
- Fix failing tests (event type mismatches, timing issues)
- Add tests for ClaudeSession.ts
- Add tests for Subprocess.ts
- Add tests for ContextManager.ts (when implemented)
- Add tests for process-utils.ts
- Mock Claude CLI for integration tests instead of running actual CLI

## Priority 3 - Architecture Improvements

### 1. Replace Mock Dependencies
Currently using local mocks for:
- @chasenocap/di-framework
- @chasenocap/logger
- @chasenocap/event-system

Options:
- Publish these as actual npm packages
- Convert to peer dependencies
- Bundle the necessary functionality

### 2. Improve Error Handling
- Create custom error types for different failure scenarios
- Add retry logic with exponential backoff (as documented)
- Implement circuit breaker pattern for subprocess failures
- Better error messages for common issues

### 3. Add Configuration Options
Create a configuration interface:
```typescript
interface ClaudeConfig {
  sessionType: 'persistent' | 'stateless';
  maxRetries: number;
  timeoutMs: number;
  defaultTools: string[];
  contextStrategy: 'compact' | 'full' | 'custom';
}
```

## Priority 4 - Feature Completions

### 1. Streaming Improvements
- Implement async iterator pattern (currently only EventEmitter)
- Add backpressure handling
- Support for partial message parsing

### 2. Session Management
- Implement session persistence to disk
- Add session migration between versions
- Support for session templates
- Add metrics/telemetry hooks

### 3. Tool Management Enhancements
- Dynamic tool loading
- Tool versioning support
- Tool dependency resolution
- Runtime tool validation

## Priority 5 - Documentation & DevEx

### 1. API Documentation
- Add JSDoc comments to all public methods
- Generate TypeDoc documentation
- Create API reference guide
- Add more usage examples

### 2. Developer Guide
- Architecture decision records (ADRs)
- Contributing guidelines
- Plugin development guide
- Performance tuning guide

### 3. CI/CD Setup
- GitHub Actions for tests
- Automated npm publishing
- Changelog generation
- Security scanning

## Code Quality Checklist

- [ ] All tests passing
- [ ] 80%+ test coverage
- [ ] No ESLint warnings
- [ ] TypeScript strict mode enabled
- [ ] All TODOs addressed or tracked
- [ ] Performance benchmarks established
- [ ] Security review completed
- [ ] API stability guaranteed

## Recommended Development Order

1. **Week 1**: Fix immediate issues (scripts, exports, session defaults)
2. **Week 2**: Expand test coverage to 80%
3. **Week 3**: Replace mock dependencies or make decision on approach
4. **Week 4**: Implement missing features (streaming, error handling)
5. **Week 5**: Documentation and DevEx improvements
6. **Week 6**: Performance optimization and security review

This roadmap ensures the package reaches production quality while maintaining the clean architecture already established.