# Documentation Correction Tasks

## Immediate Actions Required

### 1. Update `/docs/reference/claude-cli-comprehensive-guide.md`
- [ ] Remove System Prompts section (flags don't exist)
- [ ] Remove Authentication Methods section (only env var supported)
- [ ] Remove Context Management section (no CLI flags)
- [ ] Remove MCP flags section (it's a command, not flags)
- [ ] Remove Thinking Modes section (doesn't exist)
- [ ] Correct Output Formats (only text, json, stream-json)
- [ ] Update model names (remove v4 models)
- [ ] Add Input Format documentation
- [ ] Add Max Turns documentation
- [ ] Add Working Directory documentation
- [ ] Fix all code examples to use real flags only

### 2. Update `/docs/implementation/prioritized-stories.md`
- [x] Mark removed stories with ❌
- [x] Update sprint planning
- [x] Remove non-existent features
- [x] Adjust timeline from 12 to 8 weeks

### 3. Update `/docs/examples/code-patterns.md`
- [ ] Remove authentication pattern examples with CLI flags
- [ ] Remove system prompt flag examples
- [ ] Remove context management flag examples
- [ ] Remove thinking mode examples
- [ ] Update all examples to use only real CLI flags
- [ ] Add examples for actual flags (--continue, --resume, --add-dir)

### 4. Update `/CLAUDE.md`
- [x] Remove Story 4.2 from Sprint 1
- [x] Update gaps being addressed
- [x] Add "Removed Features" section
- [x] Correct enhancement focus

### 5. Update `/docs/implementation/migration-guide.md`
- [ ] Remove feature flags for non-existent features
- [ ] Update validation gates
- [ ] Revise timeline to 8 weeks
- [ ] Remove migration paths for features that don't exist

### 6. Create New Documentation
- [x] `/docs/implementation/documentation-correction-plan.md`
- [x] `/docs/implementation/guide-corrections-summary.md`
- [x] `/docs/implementation/corrected-roadmap.md`
- [x] `/docs/implementation/documentation-correction-tasks.md` (this file)

## Key Corrections Summary

### Flags That Actually Exist:
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
12. `--permission-prompt-tool` - MCP permission tool
13. `--dangerously-skip-permissions` - Skip permissions

### Flags We Incorrectly Documented:
- `--system-prompt` ❌
- `--append-system-prompt` ❌
- `--api-key` ❌
- `--max-context-tokens` ❌
- `--clear-context` ❌
- `--compact-context` ❌
- `--mcp-config` ❌
- `--mcp-debug` ❌
- `--fork-session` ❌
- `--thinking-mode` ❌
- Many others...

## Validation Steps

1. Every flag in our docs must exist in `claude -h` output
2. Test each example with actual Claude CLI
3. Remove all speculative features
4. Focus on wrapping actual capabilities

## Timeline

- Immediate: Update CLAUDE.md and prioritized stories ✅
- Day 1: Correct comprehensive guide
- Day 2: Fix code examples
- Day 3: Update migration guide
- Day 4: Final review and validation

This correction effort will ensure our documentation accurately reflects the real Claude CLI, making claude-core a reliable wrapper for actual CLI capabilities.