# Documentation Correction Plan

Based on the authoritative Claude CLI reference at https://docs.anthropic.com/en/docs/claude-code/cli-usage, we need to correct significant inaccuracies in our documentation.

## Key Findings

### ❌ Flags That DO NOT Exist in Claude CLI:
1. `--system-prompt` - Not a real flag
2. `--append-system-prompt` - Not a real flag  
3. `--system-prompt-file` - Not a real flag
4. `--api-key` - Not a real flag
5. `--clear-context` - Not a real flag
6. `--compact-context` - Not a real flag
7. `--max-context-tokens` - Not a real flag
8. `--mcp-config` - Not a real flag (it's `claude mcp` command)
9. `--mcp-debug` - Not a real flag
10. `--fork-session` - Not a real flag
11. `--at-message` - Not a real flag
12. `--session-timeout` - Not a real flag
13. `--thinking-mode` - Not a real flag

### ✅ Actual Claude CLI Flags:
1. `-p, --print` - Non-interactive mode
2. `--output-format` - Output format (text, json, stream-json)
3. `--input-format` - Input format (text, stream-json) 
4. `--model` - Model selection (sonnet, opus)
5. `--verbose` - Detailed logging
6. `--allowedTools` - Tool permissions
7. `--disallowedTools` - Tool restrictions
8. `--continue` - Continue last conversation
9. `--resume` - Resume specific session
10. `--max-turns` - Limit agentic turns
11. `--add-dir` - Add working directories
12. `--permission-prompt-tool` - MCP tool for permissions
13. `--dangerously-skip-permissions` - Skip permission prompts

## Files to Correct

### 1. `/docs/reference/claude-cli-comprehensive-guide.md`
**Major corrections needed:**
- Remove all non-existent flags
- Remove authentication section (no API key flags)
- Remove system prompt flags section
- Remove MCP flags (it's a command, not flags)
- Remove thinking modes
- Correct output formats (only text, json, stream-json)
- Remove session forking flags
- Remove context management flags

### 2. `/docs/implementation/prioritized-stories.md`
**Stories to remove/modify:**
- **Story 4.2: System Prompt Management** - REMOVE (flags don't exist)
- **Story 5.1: MCP Integration** - MODIFY (it's `claude mcp` command, not flags)
- **Story 5.2: Thinking Modes** - REMOVE (doesn't exist)
- **Story 1.3: Authentication Manager** - MODIFY (no API key flags)
- **Story 4.1: Context Window Management** - MODIFY (no context flags)

### 3. `/docs/examples/code-patterns.md`
**Patterns to remove/modify:**
- Remove all examples using non-existent flags
- Update authentication patterns (no CLI auth flags)
- Remove system prompt flag examples
- Remove thinking mode examples

### 4. `/CLAUDE.md`
**Updates needed:**
- Update Sprint 1 stories (remove Story 4.2)
- Remove references to non-existent features
- Update gaps being addressed

### 5. `/docs/implementation/migration-guide.md`
**Updates needed:**
- Remove feature flags for non-existent features
- Update validation gates
- Revise timeline

## Corrected Story Priorities

### Sprint 1 (Current):
- ✅ Story 3.2: Timeout Implementation (COMPLETED)
- ✅ Story 1.2: JSON Output Format (VALID - --output-format json exists)
- ✅ Story 1.1: Stream-JSON Output (VALID - --output-format stream-json exists)
- ❌ ~~Story 4.2: System Prompt Management~~ (REMOVED - flags don't exist)

### Sprint 2:
- ✅ Story 2.1: Enhanced Tool Restrictions (VALID - --allowedTools/--disallowedTools exist)
- ❌ ~~Story 1.3: Authentication Manager~~ (REMOVED - no auth flags)

### Sprint 3:
- ✅ Story 3.1: Rate Limiting (VALID - internal feature)
- ✅ Story 3.3: Retry Logic (VALID - internal feature)
- ✅ Story 2.2: Permission Skip Mode (VALID - --dangerously-skip-permissions exists)

### Stories to Remove:
- Story 4.1: Context Window Management (no CLI support)
- Story 4.2: System Prompt Management (no CLI support)
- Story 5.1: MCP Integration (different than described)
- Story 5.2: Thinking Modes (doesn't exist)
- Story 6.1: CLI Auto-completion (not mentioned in docs)

## New Valid Stories Based on Actual CLI:

### Story 1.3: Session Continuation Support
- Implement `--continue` flag support
- Implement `--resume` flag support
- Session persistence between invocations

### Story 1.4: Input Format Support
- Implement `--input-format` flag
- Support stream-json input format

### Story 1.5: Max Turns Limiting
- Implement `--max-turns` flag
- Limit agentic operations in non-interactive mode

### Story 2.3: Working Directory Management
- Implement `--add-dir` flag support
- Multiple working directory contexts

## Implementation Impact

1. **Immediate Actions:**
   - Remove Story 4.2 from current sprint
   - Update all documentation to remove non-existent features
   - Revise remaining stories to align with actual CLI

2. **Code Changes:**
   - Remove any code preparing for non-existent features
   - Focus on actual CLI capabilities
   - Simplify authentication (no CLI flags needed)

3. **Testing Updates:**
   - Remove tests for non-existent features
   - Add tests for actual CLI flags

## Validation Approach

1. Every flag mentioned in our docs MUST exist in official CLI docs
2. Use `claude -h` output as ground truth
3. Test each flag with actual Claude CLI before documenting
4. Remove all speculative or "future" features

This correction will ensure our documentation is accurate and our implementation aligns with the actual Claude CLI capabilities.