# Comprehensive Guide Corrections Summary

This document summarizes all corrections needed for `/docs/reference/claude-cli-comprehensive-guide.md` based on the official Claude CLI documentation.

## Sections to Remove Entirely

### 1. System Prompts Section
Remove the entire "System Prompts" section including:
- `--system-prompt` flag (doesn't exist)
- `--append-system-prompt` flag (doesn't exist)
- `--system-prompt-file` flag (doesn't exist)
- All examples using these flags

**Reality**: System prompts must be included in the conversation history passed via stdin, not as separate flags.

### 2. Authentication Methods Section
Remove subsections for:
- API Key flags (`--api-key` doesn't exist)
- OAuth flow (no CLI support)
- Enterprise authentication flags

**Reality**: Authentication only uses environment variable `ANTHROPIC_API_KEY`

### 3. Context Management Section
Remove all context-related flags:
- `--max-context-tokens` (doesn't exist)
- `--compact-context` (doesn't exist)
- `--clear-context` (doesn't exist)

**Reality**: Context is managed by what you pass to stdin, no CLI control.

### 4. MCP Flags Section
Remove MCP flag documentation:
- `--mcp-config` (doesn't exist)
- `--mcp-debug` (doesn't exist)
- `--no-default-mcp` (doesn't exist)

**Reality**: MCP uses `claude mcp` command, not flags.

### 5. Session Management - Advanced Features
Remove non-existent features:
- `--fork-session` (doesn't exist)
- `--at-message` (doesn't exist)
- `--resume-session` (should be just `--resume`)

### 6. Thinking Modes Section
Remove entirely - thinking modes don't exist in Claude CLI

## Sections to Correct

### 1. Output Formats
**Current (Wrong)**:
- Lists many format options

**Correct**:
- Only three formats exist: `text`, `json`, `stream-json`

### 2. Basic Usage
**Add**: 
- `claude` - Interactive REPL
- `claude "query"` - REPL with initial prompt
- `claude -p "query"` - Non-interactive query

### 3. Core Flags
**Keep these actual flags**:
- `-p, --print` - Non-interactive mode
- `--output-format` - Output format selection
- `--input-format` - Input format (text, stream-json)
- `--model` - Model selection (sonnet, opus)
- `--verbose` - Verbose logging
- `--allowedTools` - Tool permissions
- `--disallowedTools` - Tool restrictions
- `--continue` - Continue last conversation
- `--resume` - Resume specific session
- `--max-turns` - Limit agentic turns
- `--add-dir` - Add working directories
- `--permission-prompt-tool` - MCP permission tool
- `--dangerously-skip-permissions` - Skip permissions

### 4. Model Selection
**Correct models**:
- `sonnet` (Claude 3.5 Sonnet)
- `opus` (Claude 3 Opus)
- Remove references to "Haiku 4", "Sonnet 4", "Opus 4" - these don't exist

### 5. Commands Section (Add)
Add documentation for actual commands:
- `claude update` - Update Claude
- `claude mcp` - Configure MCP servers

## Sections to Add

### 1. Input Format Documentation
Document `--input-format` flag:
- `text` (default)
- `stream-json` for streaming input

### 2. Max Turns Documentation
Document `--max-turns` flag for limiting agentic operations

### 3. Working Directories
Document `--add-dir` flag for adding additional working directories

### 4. Actual Session Management
- `--continue` flag usage
- `--resume` flag usage (without non-existent session ID parameter)

## Examples to Fix

### Before (Wrong):
```bash
claude -p "Hello" --system-prompt "You are helpful" --api-key sk-ant-...
```

### After (Correct):
```bash
export ANTHROPIC_API_KEY=sk-ant-...
claude -p "Hello"
```

### Before (Wrong):
```bash
claude --fork-session abc123 --at-message 5
```

### After (Correct):
```bash
# Session forking doesn't exist in CLI
claude --continue  # Continue last conversation
```

## Key Principles for Correction

1. **Only document flags that exist in `claude -h`**
2. **Remove all speculative or "future" features**
3. **Align with official documentation exactly**
4. **Test each example with actual CLI**
5. **Be honest about limitations**

## Impact Summary

- **~60% of the guide needs removal or correction**
- Focus on actual CLI capabilities, not imagined features
- Simpler but more accurate documentation
- Better alignment with user expectations