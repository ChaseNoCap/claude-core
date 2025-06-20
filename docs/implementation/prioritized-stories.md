# Claude-Core Enhancement: Prioritized Implementation Stories

This document contains a comprehensive, prioritized list of implementation stories to enhance claude-core with modern Claude CLI features. Each story includes acceptance criteria, validation points, and tracking mechanisms.

## Story Tracking Legend

- 🔴 **Blocked**: Cannot start due to dependencies
- 🟡 **Ready**: Can be started
- 🟢 **In Progress**: Currently being worked on
- ✅ **Completed**: Finished and validated
- 🔄 **Needs Revision**: Failed validation, needs rework
- ❌ **Removed**: Feature doesn't exist in actual CLI

## Important Note

This document has been updated to reflect the actual Claude CLI capabilities based on the authoritative documentation at https://docs.anthropic.com/en/docs/claude-code/cli-usage. Many originally planned features have been removed as they don't exist in the actual CLI.

## Epic 1: Core Infrastructure Enhancement (P0 - Critical)

### Story 1.1: Implement Stream-JSON Output Format 🟡
**Priority**: P0 - Critical
**Effort**: 5 points
**Dependencies**: None

**Description**: Add support for real-time streaming output using the `--output-format stream-json` flag.

**Acceptance Criteria**:
- [ ] Parse and handle `--output-format stream-json` flag
- [ ] Implement stream parsing for newline-delimited JSON
- [ ] Support token-by-token streaming
- [ ] Handle tool use events in stream
- [ ] Maintain backward compatibility with current pseudo-streaming

**Validation Points**:
1. Unit tests pass for stream parsing
2. Integration test with actual Claude CLI streaming
3. Performance benchmark: <100ms latency for first token
4. Memory usage stays constant during long streams

**Implementation Notes**:
```typescript
// Key files to modify:
// - src/implementations/StatelessClaudeSession.ts
// - src/utils/OutputParser.ts
// - src/types/claude.types.ts
```

### Story 1.2: Add JSON Output Format Support 🟡
**Priority**: P0 - Critical  
**Effort**: 3 points
**Dependencies**: None

**Description**: Implement structured JSON output format for programmatic consumption.

**Acceptance Criteria**:
- [ ] Parse `--output-format json` flag
- [ ] Return structured response with metadata
- [ ] Include cost tracking in response
- [ ] Include token usage metrics
- [ ] Support both sync and async patterns

**Validation Points**:
1. JSON schema validation for output
2. Cost calculation accuracy within 5%
3. All existing tests still pass
4. New integration tests for JSON format

### Story 1.3: ~~Implement Authentication Manager~~ ❌
**Priority**: ~~P0 - Critical~~ REMOVED
**Effort**: ~~8 points~~
**Dependencies**: None

**Removal Note**: The Claude CLI does not expose authentication flags. Authentication is handled through environment variables (`ANTHROPIC_API_KEY`) only. There are no OAuth, Bedrock, or Vertex AI authentication options in the CLI.

### Story 1.4: Session Resumption by ID 🟡
**Priority**: P0 - Critical
**Effort**: 5 points
**Dependencies**: Story 1.2 (JSON format for session IDs)

**Description**: Implement explicit session resumption via `-r "session-id"` flag for cost optimization through context caching.

**Acceptance Criteria**:
- [ ] Parse `-r` or `--resume` flag with session ID parameter
- [ ] Load complete session history from SessionStore
- [ ] Pass full conversation context to Claude to leverage caching
- [ ] Track token usage and cost reduction from cached context
- [ ] Return new session ID for the continued conversation
- [ ] Maintain fork points and session lineage

**Validation Points**:
1. Session correctly resumes with full history
2. API costs are reduced due to context caching (measure token difference)
3. Fork points and lineage are maintained correctly
4. No context loss or message duplication
5. Session IDs are properly tracked and stored

**Implementation Notes**:
- We intentionally do NOT implement `-c`/`--continue` (last session) to maintain explicit control
- This is CRITICAL for cost optimization and correct forking behavior
- Session resumption must include the complete conversation history

## Epic 2: Advanced Tool Management (P1 - High)

### Story 2.1: Enhanced Tool Restrictions 🔴
**Priority**: P1 - High
**Effort**: 5 points
**Dependencies**: Story 1.1 (for testing with actual CLI)

**Description**: Implement fine-grained tool permission patterns.

**Acceptance Criteria**:
- [ ] Support command-specific patterns: `Bash(npm install:*)`
- [ ] Support path-based restrictions: `Edit(src/*)`
- [ ] Implement wildcard matching
- [ ] Add regex pattern support
- [ ] Validate patterns at configuration time

**Validation Points**:
1. Pattern matching unit tests (100+ cases)
2. Security review: No bypass possible
3. Performance: <1ms per pattern match
4. Integration test with real Claude CLI

### Story 2.2: Implement Dangerous Mode Handling 🔴
**Priority**: P1 - High
**Effort**: 2 points
**Dependencies**: Story 2.1

**Description**: Add support for `--dangerously-skip-permissions` with proper warnings.

**Acceptance Criteria**:
- [ ] Parse dangerous mode flag
- [ ] Log prominent warnings
- [ ] Require explicit confirmation in interactive mode
- [ ] Track dangerous mode usage
- [ ] Disable by default in production

**Validation Points**:
1. Warning appears in logs
2. Cannot accidentally enable
3. Metrics track dangerous usage
4. Documentation clearly warns

## Epic 3: Performance & Resilience (P1 - High)

### Story 3.1: Implement Rate Limiting 🟡
**Priority**: P1 - High
**Effort**: 5 points
**Dependencies**: None

**Description**: Add intelligent rate limiting with automatic backoff.

**Acceptance Criteria**:
- [ ] Track request rate per session
- [ ] Implement exponential backoff
- [ ] Support tier-based limits
- [ ] Auto-switch models when limited
- [ ] Queue requests when approaching limits

**Validation Points**:
1. Never exceed rate limits in tests
2. Graceful degradation under load
3. Model switching works correctly
4. Queue drains properly

**Implementation Example**:
```typescript
interface RateLimiter {
  checkLimit(): Promise<boolean>;
  recordRequest(): void;
  getBackoffTime(): number;
  switchToFallbackModel(): ClaudeModel;
}
```

### Story 3.2: Add Timeout Implementation ✅
**Priority**: P1 - High
**Effort**: 3 points
**Dependencies**: None

**Description**: Properly implement timeout functionality in execute method.

**Acceptance Criteria**:
- [x] Respect timeout parameter in execute()
- [x] Clean process termination on timeout
- [x] Return appropriate error on timeout
- [x] Configurable default timeout
- [x] Different timeouts for different operations

**Validation Points**:
1. Process actually terminates on timeout
2. No zombie processes left
3. Timeout error clearly identified
4. Resources properly cleaned up

### Story 3.3: Implement Retry Logic 🔴
**Priority**: P1 - High
**Effort**: 5 points
**Dependencies**: Story 3.1

**Description**: Add configurable retry logic with smart backoff.

**Acceptance Criteria**:
- [ ] Configurable retry attempts
- [ ] Different strategies for different errors
- [ ] Exponential backoff for rate limits
- [ ] Linear backoff for network errors
- [ ] Circuit breaker pattern

**Validation Points**:
1. Retries actually help success rate
2. No retry storms
3. Metrics track retry patterns
4. Clear logging of retry attempts

## Epic 4: Context Management (P2 - Medium)

### Story 4.1: ~~Implement Context Window Management~~ ❌
**Priority**: ~~P2 - Medium~~ REMOVED
**Effort**: ~~8 points~~
**Dependencies**: ~~Story 1.2 (for token counting)~~

**Removal Note**: The Claude CLI does not expose context window management flags. There are no `--max-tokens`, `--context-window`, or similar flags available. Context management is handled internally by the CLI.

### Story 4.2: ~~Add System Prompt Management~~ ❌
**Priority**: ~~P2 - Medium~~ REMOVED
**Effort**: ~~3 points~~
**Dependencies**: None

**Removal Note**: The Claude CLI does not have `--system-prompt` or `--append-system-prompt` flags. System prompts must be included as part of the conversation history passed to the CLI, not as separate flags.

## Epic 5: Advanced Features (P2 - Medium)

### Story 5.1: ~~MCP Integration~~ ❌
**Priority**: ~~P2 - Medium~~ REMOVED
**Effort**: ~~13 points~~
**Dependencies**: ~~Story 1.1, Story 1.2~~

**Removal Note**: MCP (Model Context Protocol) is not handled via flags in the Claude CLI. Instead, it uses the `claude mcp` command structure. MCP servers are managed through separate commands, not as flags to the main chat interface.

### Story 5.2: ~~Thinking Modes Support~~ ❌
**Priority**: ~~P2 - Medium~~ REMOVED
**Effort**: ~~3 points~~
**Dependencies**: ~~Story 1.3 (for model features)~~

**Removal Note**: The Claude CLI does not have a `--thinking-mode` flag or any thinking mode configuration options. This feature does not exist in the actual CLI.

## Epic 6: Developer Experience (P3 - Low)

### Story 6.1: ~~Add CLI Auto-completion~~ ❌
**Priority**: ~~P3 - Low~~ REMOVED
**Effort**: ~~5 points~~
**Dependencies**: ~~Core features complete~~

**Removal Note**: The Claude CLI documentation does not mention any auto-completion features. This functionality is not provided by the official CLI.

### Story 6.2: ~~Implement Usage Analytics~~ ❌
**Priority**: ~~P3 - Low~~ REMOVED
**Effort**: ~~5 points~~
**Dependencies**: ~~Story 1.2~~

**Removal Note**: The Claude CLI does not provide built-in usage analytics features. While the JSON output format includes cost and token information, there are no CLI flags or features for tracking, reporting, or analyzing usage over time.

## Epic 7: Migration & Cleanup (P1 - High)

### Story 7.1: Create Migration Path 🔴
**Priority**: P1 - High
**Effort**: 8 points
**Dependencies**: Epic 1 complete

**Description**: Implement safe migration from current to enhanced implementation.

**Acceptance Criteria**:
- [ ] Create compatibility layer
- [ ] Add migration guide
- [ ] Implement version detection
- [ ] Support gradual migration
- [ ] Provide rollback mechanism

**Validation Points**:
1. Zero breaking changes initially
2. Migration can be incremental
3. Rollback tested
4. Clear documentation

### Story 7.2: Remove Deprecated Code 🔴
**Priority**: P1 - High
**Effort**: 3 points
**Dependencies**: Story 7.1, all tests passing

**Description**: Clean up old implementations after migration.

**Acceptance Criteria**:
- [ ] Remove old ClaudeSession (if not needed)
- [ ] Clean up unused interfaces
- [ ] Remove compatibility shims
- [ ] Update all documentation
- [ ] Final security audit

**Validation Points**:
1. All tests still pass
2. No dead code remains
3. Documentation accurate
4. Performance improved

## Implementation Schedule (Updated)

### Sprint 1 (Week 1-2): Foundation
- Story 1.1: Stream-JSON Output *(5 points)*
- Story 1.2: JSON Output Format *(3 points)*
- Story 3.2: Timeout Implementation *(3 points)* ✅
- **NEW** Story 1.4: Session Resumption by ID *(5 points)* - Critical for cost optimization
**Total: 16 points**

### Sprint 2 (Week 3-4): Tool Management  
- Story 2.1: Enhanced Tool Restrictions *(5 points)*
- Story 2.2: Dangerous Mode *(2 points)*
- Story 3.1: Rate Limiting *(5 points)*
**Total: 12 points**

### Sprint 3 (Week 5-6): Performance & Resilience
- Story 3.3: Retry Logic *(5 points)*
- Story 7.1: Migration Path *(8 points)*
**Total: 13 points**

### Sprint 4 (Week 7-8): Cleanup & Polish
- Story 7.2: Remove Deprecated *(3 points)*
- Additional testing and documentation *(8 points)*
**Total: 11 points**

### Removed Stories:
- ❌ Story 1.3: Authentication Manager (no auth flags in CLI)
- ❌ Story 4.1: Context Window Management (no context flags in CLI)
- ❌ Story 4.2: System Prompt Management (no system prompt flags in CLI)
- ❌ Story 5.1: MCP Integration (MCP is a command, not flags)
- ❌ Story 5.2: Thinking Modes (doesn't exist)
- ❌ Story 6.1: CLI Auto-completion (not mentioned in official docs)
- ❌ Story 6.2: Usage Analytics (not a CLI feature)

## Key Validation Gates (Updated)

### Gate 1: After Sprint 1 (Week 2)
- [ ] All core output formats working
- [ ] Timeout functionality verified
- [ ] Performance benchmarks pass
- [ ] Basic integration tests complete

### Gate 2: After Sprint 2 (Week 4)
- [ ] Tool restrictions fully functional
- [ ] Dangerous mode properly warned
- [ ] Rate limiting prevents errors
- [ ] Security audit complete

### Gate 3: After Sprint 3 (Week 6)
- [ ] All retry logic tested
- [ ] Migration path validated
- [ ] 100% backward compatibility
- [ ] Load testing complete

### Gate 4: Final Release (Week 8)
- [ ] All deprecated code removed
- [ ] Documentation complete
- [ ] Performance improved by >20%
- [ ] Zero breaking changes for users

## Risk Mitigation

1. **Risk**: Breaking existing functionality
   - **Mitigation**: Extensive test coverage, compatibility layer
   
2. **Risk**: Performance degradation
   - **Mitigation**: Continuous benchmarking, profiling
   
3. **Risk**: Security vulnerabilities
   - **Mitigation**: Security review at each gate
   
4. **Risk**: Claude CLI changes
   - **Mitigation**: Version detection, graceful degradation

## Success Metrics (Updated)

- Test coverage remains >90%
- Zero breaking changes for existing users
- Performance improvement >20%
- Support for all **actual** Claude CLI features:
  - ✅ Stream-JSON output format
  - ✅ JSON output format
  - ✅ Enhanced tool restrictions
  - ✅ Dangerous mode flag
  - ✅ Proper timeout handling
  - ✅ Rate limiting and retry logic
- Clean, maintainable codebase
- Comprehensive documentation
- Reduced implementation timeline from 12 weeks to 8 weeks