# Claude CLI Comprehensive Reference Guide

This guide provides a complete reference for the Claude CLI, covering all features from basic usage to advanced production deployment patterns. It serves as the foundation for the claude-core enhancement project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Command Line Interface](#command-line-interface)
3. [Authentication & Security](#authentication--security)
4. [Session Management](#session-management)
5. [Output Formats & Streaming](#output-formats--streaming)
6. [Tool Management & Permissions](#tool-management--permissions)
7. [Error Handling & Resilience](#error-handling--resilience)
8. [Performance & Rate Limits](#performance--rate-limits)
9. [CI/CD Integration](#cicd-integration)
10. [Production Patterns](#production-patterns)

## Architecture Overview

Claude CLI follows a **stateless architecture by design**. Each invocation creates a new process with no memory of previous interactions. This design prioritizes:

- **Security**: No persistent state reduces attack surface
- **Scalability**: Each request is independent
- **Flexibility**: Easy to parallelize and distribute
- **Simplicity**: No complex state management

### Key Architectural Principles

1. **Stateless Operations**: Every CLI call starts fresh
2. **Context via Input**: Full conversation passed with each request
3. **Tool Isolation**: Subprocess-level permission enforcement
4. **Streaming Support**: Real-time output for responsive UIs
5. **Exit Code Semantics**: Standardized error communication

## Command Line Interface

### Basic Usage

```bash
# Interactive mode (default)
claude

# Non-interactive mode with prompt
claude -p "Your prompt here"
claude --print "Your prompt here"

# With specific model
claude -p "Your prompt" --model opus-4
claude -p "Your prompt" --model sonnet-4
```

### Core Flags

#### Output Control
```bash
# Output format selection
claude -p "prompt" --output-format json
claude -p "prompt" --output-format stream-json
claude -p "prompt" --output-format text (default)

# Verbose logging
claude -p "prompt" --verbose
claude -p "prompt" -v

# Quiet mode (suppress non-essential output)
claude -p "prompt" --quiet
claude -p "prompt" -q
```

#### Model Selection
```bash
# Specify model
claude --model opus-4         # Most capable
claude --model sonnet-4       # Balanced
claude --model haiku-4        # Fast and efficient

# Model switching behavior
# Automatically downgrades from Opus to Sonnet when limits reached
```

#### System Prompts
```bash
# Override default system prompt
claude -p "prompt" --system-prompt "You are a code reviewer"

# Append to existing system prompt
claude -p "prompt" --append-system-prompt "Always use TypeScript"

# Load system prompt from file
claude -p "prompt" --system-prompt-file ./prompts/reviewer.txt
```

### Advanced Flags

#### Permission Control
```bash
# Allow specific tools
claude -p "prompt" --allowedTools "Edit,Read"
claude -p "prompt" --allowedTools "Bash(npm install)"
claude -p "prompt" --allowedTools "Bash(git commit:*)"

# Disallow specific tools
claude -p "prompt" --disallowedTools "Bash(rm:*)"
claude -p "prompt" --disallowedTools "Edit(/etc/*)"

# Dangerous: Skip all permissions (use only in isolated environments)
claude -p "prompt" --dangerously-skip-permissions
```

#### Session Management
```bash
# Continue last session
claude --continue

# Resume specific session interactively
claude --resume

# Resume specific session by ID
claude --resume-session abc123

# Fork session at specific point
claude --fork-session abc123 --at-message 5
```

#### MCP (Model Context Protocol)
```bash
# Load MCP configuration
claude --mcp-config ./mcp.json

# Enable MCP debugging
claude --mcp-debug

# Disable default MCP servers
claude --no-default-mcp
```

#### Context Management
```bash
# Set context window size
claude -p "prompt" --max-context-tokens 30000

# Enable aggressive context compaction
claude -p "prompt" --compact-context

# Clear context before prompt
claude -p "prompt" --clear-context
```

## Authentication & Security

### Authentication Methods

#### 1. OAuth (Recommended)
```bash
# One-time browser authentication
claude auth login

# Check authentication status
claude auth status

# Logout
claude auth logout
```

#### 2. API Key
```bash
# Environment variable (recommended)
export ANTHROPIC_API_KEY="sk-ant-..."
claude -p "prompt"

# Direct flag (not recommended for production)
claude -p "prompt" --api-key "sk-ant-..."
```

#### 3. Enterprise Authentication

**Amazon Bedrock**:
```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
claude -p "prompt"
```

**Google Vertex AI**:
```bash
export CLAUDE_CODE_USE_VERTEX=1
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export VERTEX_PROJECT_ID=your-project
export VERTEX_REGION=us-central1
claude -p "prompt"
```

### Security Configuration

#### System-wide Policies
```json
// /Library/Application Support/ClaudeCode/policies.json
{
  "allowedTools": ["Read", "Edit", "Bash"],
  "disallowedCommands": ["rm -rf", "sudo"],
  "maxTokensPerRequest": 50000,
  "requireAuthentication": true
}
```

#### User Settings
```json
// ~/.claude/settings.json
{
  "defaultModel": "opus-4",
  "outputFormat": "json",
  "security": {
    "confirmDangerousActions": true,
    "logAllRequests": true
  }
}
```

#### Project Settings
```json
// .claude/settings.json
{
  "model": "sonnet-4",
  "systemPrompt": "You are working on a TypeScript project",
  "allowedTools": ["Edit", "Read", "Bash(npm:*)"]
}
```

## Session Management

### Understanding Stateless Sessions

Each Claude CLI invocation is completely independent. "Sessions" are maintained by:

1. **Client-side History**: The client maintains conversation history
2. **Context Injection**: Full history passed with each request
3. **Session IDs**: Used for tracking, not state persistence
4. **Lineage Tracking**: Parent-child relationships between sessions

### Session Lifecycle

```bash
# Start new session (implicit)
claude -p "Hello"
# Returns: session_id: abc123

# Continue with context
claude -p "What did I just say?" --continue-session abc123
# Client loads history and includes it in request

# Session expires after 5 hours of inactivity
```

### Context Management Strategies

#### 1. CLAUDE.md Files
```markdown
# CLAUDE.md
Automatically loaded at session start. Include:
- Project overview
- Tech stack details
- Coding conventions
- Known issues
- Development patterns
```

#### 2. Git Worktrees
```bash
# Separate contexts for different features
git worktree add ../feature-auth feature/auth
cd ../feature-auth
claude -p "Implement authentication"
```

#### 3. Checkpoint Pattern
```bash
# Create checkpoint after major changes
git commit -m "Checkpoint: Auth implementation complete"
git tag checkpoint-auth-v1

# Restore if needed
git checkout checkpoint-auth-v1
claude --continue
```

### Session Storage

The CLI stores session data in:
```
~/.claude/sessions/
├── active/          # Currently active sessions
├── archived/        # Completed sessions
└── metadata.json    # Session index
```

## Output Formats & Streaming

### Plain Text (Default)
```bash
claude -p "Write hello world"
# Output: print("Hello, world!")
```

### JSON Format
```bash
claude -p "Write hello world" --output-format json
```

Output structure:
```json
{
  "type": "result",
  "total_cost_usd": 0.0015,
  "duration_ms": 1234,
  "num_turns": 1,
  "result": "print(\"Hello, world!\")",
  "session_id": "abc123",
  "model_used": "opus-4",
  "tokens_used": {
    "input": 15,
    "output": 8,
    "total": 23
  },
  "tool_uses": []
}
```

### Stream JSON Format
```bash
claude -p "Write a long function" --output-format stream-json
```

Outputs newline-delimited JSON:
```json
{"type": "start", "session_id": "abc123", "model": "opus-4"}
{"type": "token", "content": "def"}
{"type": "token", "content": " calculate"}
{"type": "token", "content": "_fibonacci"}
{"type": "tool_use", "tool": "Edit", "params": {...}}
{"type": "result", "total_cost_usd": 0.0023, ...}
```

### Parsing Examples

#### Bash with jq
```bash
#!/bin/bash
result=$(claude -p "Generate code" --output-format json)
code=$(echo "$result" | jq -r '.result')
cost=$(echo "$result" | jq -r '.total_cost_usd')
echo "Generated code (cost: \$${cost})"
echo "$code"
```

#### Python Streaming
```python
import json
import subprocess

proc = subprocess.Popen(
    ["claude", "-p", "Write code", "--output-format", "stream-json"],
    stdout=subprocess.PIPE,
    text=True
)

for line in proc.stdout:
    msg = json.loads(line)
    if msg["type"] == "token":
        print(msg["content"], end="", flush=True)
    elif msg["type"] == "tool_use":
        print(f"\n[Using tool: {msg['tool']}]")
```

## Tool Management & Permissions

### Available Tools

1. **Read**: Read files
2. **Edit**: Modify files
3. **Write**: Create new files
4. **Bash**: Execute commands
5. **Search**: Search in files
6. **List**: List directory contents

### Permission Patterns

#### Basic Patterns
```bash
# Allow all instances of a tool
--allowedTools "Edit"

# Allow specific command
--allowedTools "Bash(npm install)"

# Allow command with any arguments
--allowedTools "Bash(git commit:*)"

# Allow multiple tools
--allowedTools "Edit,Read,Bash(npm:*)"
```

#### Advanced Patterns
```bash
# Path-based restrictions
--allowedTools "Edit(src/*),Read(*)"
--disallowedTools "Edit(/etc/*),Bash(sudo:*)"

# Complex command patterns
--allowedTools "Bash(git commit:-m *)"
--allowedTools "Bash(docker build:--tag myapp:*)"
```

### Security Best Practices

1. **Principle of Least Privilege**
   ```bash
   # Only allow what's needed
   claude -p "Fix the test" \
     --allowedTools "Edit(tests/*),Bash(npm test)"
   ```

2. **Explicit Denials**
   ```bash
   # Prevent dangerous operations
   claude -p "Refactor code" \
     --disallowedTools "Bash(rm:*),Bash(sudo:*)"
   ```

3. **Sandbox Environments**
   ```bash
   # Run in Docker container
   docker run --rm -it claude-sandbox \
     claude -p "Analyze this code" \
     --dangerously-skip-permissions
   ```

## Error Handling & Resilience

### Exit Codes

| Code | Meaning | Example Scenario |
|------|---------|------------------|
| 0 | Success | Normal completion |
| 1 | General Error | Parsing failure |
| 2 | Invalid Arguments | Unknown flag |
| 3 | Permission Denied | Tool not allowed |
| 4 | Network Error | API unreachable |
| 5 | Rate Limited | Quota exceeded |
| 6 | Authentication Error | Invalid API key |
| 7 | Context Too Large | Exceeds token limit |
| 8 | Model Unavailable | Model not found |

### Error Handling Patterns

#### Bash with Retry
```bash
#!/bin/bash
run_claude_with_retry() {
    local prompt="$1"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if output=$(claude -p "$prompt" --output-format json 2>&1); then
            echo "$output"
            return 0
        else
            local exit_code=$?
            echo "Attempt $attempt failed (exit: $exit_code)" >&2
            
            case $exit_code in
                4) # Network error
                    sleep $((attempt * 2))
                    ;;
                5) # Rate limited
                    sleep $((attempt * 10))
                    ;;
                6) # Auth error
                    echo "Authentication failed, check credentials" >&2
                    return $exit_code
                    ;;
                *)
                    sleep 1
                    ;;
            esac
            
            attempt=$((attempt + 1))
        fi
    done
    
    return 1
}
```

#### Python with Exponential Backoff
```python
import subprocess
import time
import json
from typing import Optional, Dict

def run_claude_with_backoff(
    prompt: str,
    max_retries: int = 3
) -> Optional[Dict]:
    for attempt in range(max_retries):
        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--output-format", "json"],
                capture_output=True,
                text=True,
                check=True
            )
            return json.loads(result.stdout)
        except subprocess.CalledProcessError as e:
            if e.returncode == 5:  # Rate limited
                wait_time = (2 ** attempt) * 10
                print(f"Rate limited, waiting {wait_time}s")
                time.sleep(wait_time)
            elif e.returncode in [4, 1]:  # Network or general error
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                raise
    
    return None
```

### Logging Strategy

```bash
#!/bin/bash
CLAUDE_LOG_DIR="${HOME}/.claude/logs"
mkdir -p "$CLAUDE_LOG_DIR"

log_claude_request() {
    local prompt="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_file="${CLAUDE_LOG_DIR}/claude-$(date +%Y%m%d).log"
    
    # Log request
    echo "[$timestamp] REQUEST: $prompt" >> "$log_file"
    
    # Execute with timing
    local start_time=$(date +%s)
    local output
    local exit_code
    
    output=$(claude -p "$prompt" --output-format json 2>&1)
    exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log response
    echo "[$timestamp] RESPONSE (${duration}s, exit:${exit_code}): $output" >> "$log_file"
    
    # Return output
    echo "$output"
    return $exit_code
}
```

## Performance & Rate Limits

### Rate Limit Tiers

| Plan | Price | Messages/5hr | Context Window | Models |
|------|-------|--------------|----------------|--------|
| Free | $0 | 30 | 40K tokens | Haiku 4 only |
| Pro | $20/mo | ~225 | 200K tokens | All models |
| Max | $200/mo | ~900 | 200K tokens | All models + priority |
| Enterprise | Custom | Custom | 200K tokens | All + dedicated |

### API Usage Tiers

| Tier | Requests/min | Daily Tokens | Cost |
|------|--------------|--------------|------|
| Free | 5 | 25K | $0 |
| Tier 1 | 50 | 50M | Based on usage |
| Tier 2 | 100 | 100M | Based on usage |
| Tier 3 | 200 | 250M | Based on usage |
| Tier 4 | 400 | 500M | Based on usage |
| Enterprise | Custom | Custom | Custom |

### Model Performance

| Model | Speed | Quality | Cost/1M tokens | Best For |
|-------|-------|---------|----------------|----------|
| Haiku 4 | Fast | Good | $0.25 | Quick tasks |
| Sonnet 4 | Balanced | Excellent | $3.00 | Most tasks |
| Opus 4 | Slower | Best | $15.00 | Complex tasks |

### Optimization Strategies

#### 1. Model Selection
```bash
# Use Haiku for simple tasks
claude -p "Format this JSON" --model haiku-4

# Use Sonnet for coding
claude -p "Implement auth system" --model sonnet-4

# Use Opus for architecture
claude -p "Design microservices architecture" --model opus-4
```

#### 2. Context Management
```bash
# Limit context for better performance
claude -p "Fix this bug" --max-context-tokens 10000

# Clear context when switching tasks
claude -p "New task" --clear-context
```

#### 3. Parallel Processing
```bash
#!/bin/bash
# Process multiple files in parallel
for file in src/*.js; do
    (
        claude -p "Add TypeScript types to $file" \
            --allowedTools "Edit($file)" \
            --output-format json > "results/$(basename $file).json"
    ) &
done
wait
```

### Thinking Modes

Control reasoning depth with thinking modes:

```bash
# Basic (4K tokens) - Quick responses
claude -p "Simple question" --thinking-mode basic

# Standard (12K tokens) - Default
claude -p "Normal task" --thinking-mode standard

# Advanced (31K tokens) - Complex reasoning
claude -p "Complex problem" --thinking-mode advanced

# Ultrathink (32K tokens) - Maximum reasoning
claude -p "Very complex problem" --thinking-mode ultrathink
```

## CI/CD Integration

### GitHub Actions

#### Official Action (Beta)
```yaml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          trigger_phrase: "@claude"
          allowed_tools: "Read,Edit,Bash(npm test)"
          model: "sonnet-4"
```

#### Custom Workflow
```yaml
name: Auto-fix Issues
on:
  issues:
    types: [labeled]

jobs:
  fix:
    if: contains(github.event.label.name, 'auto-fix')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Claude
        run: |
          # Install Claude CLI
          curl -fsSL https://claude.ai/install.sh | sh
          
      - name: Fix Issue
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "Fix issue: ${{ github.event.issue.title }}" \
            --allowedTools "Edit,Bash(npm test)" \
            --output-format json > fix-result.json
            
      - name: Create PR
        run: |
          gh pr create \
            --title "Fix: ${{ github.event.issue.title }}" \
            --body "Automated fix for #${{ github.event.issue.number }}"
```

### Docker Integration

#### Dockerfile
```dockerfile
FROM node:20-slim

# Install Claude CLI
RUN curl -fsSL https://claude.ai/install.sh | sh

# Set up non-root user
RUN useradd -m -s /bin/bash claude
USER claude
WORKDIR /home/claude

# Copy project
COPY --chown=claude:claude . .

# Set environment
ENV ANTHROPIC_API_KEY=""
ENV CLAUDE_OUTPUT_FORMAT="json"

# Entry point
ENTRYPOINT ["claude"]
CMD ["--help"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  claude:
    build: .
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - CLAUDE_OUTPUT_FORMAT=json
    volumes:
      - ./src:/home/claude/src
      - ./tests:/home/claude/tests
    command: >
      -p "Run tests and fix any failures"
      --allowedTools "Edit,Bash(npm test)"
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    
    environment {
        ANTHROPIC_API_KEY = credentials('anthropic-api-key')
    }
    
    stages {
        stage('Code Review') {
            steps {
                script {
                    def result = sh(
                        script: '''
                            claude -p "Review changes in this PR" \
                              --output-format json \
                              --allowedTools "Read"
                        ''',
                        returnStdout: true
                    )
                    
                    def review = readJSON text: result
                    echo "Review cost: \$${review.total_cost_usd}"
                    echo review.result
                }
            }
        }
        
        stage('Auto-fix') {
            when {
                expression { 
                    currentBuild.result == 'UNSTABLE' 
                }
            }
            steps {
                sh '''
                    claude -p "Fix the failing tests" \
                      --allowedTools "Edit,Bash(npm test)" \
                      --output-format json
                '''
            }
        }
    }
}
```

## Production Patterns

### 1. Git Automation Pattern

```bash
#!/bin/bash
# git-claude-commit
git add -A
commit_msg=$(claude -p "Generate commit message for these changes" \
  --output-format json | jq -r '.result')
git commit -m "$commit_msg"
```

### 2. Code Review Pattern

```bash
#!/bin/bash
# claude-review
claude -p "Review the changes in this PR for:
- Security issues
- Performance problems
- Code style violations
- Missing tests
Output as markdown checklist" \
  --allowedTools "Read,Bash(git diff)" \
  --output-format json | jq -r '.result' > review.md
```

### 3. Migration Pattern

```bash
#!/bin/bash
# migrate-to-typescript
find src -name "*.js" | while read file; do
    echo "Migrating $file"
    claude -p "Convert $file to TypeScript with proper types" \
      --allowedTools "Edit($file),Write(${file%.js}.ts)" \
      --output-format json
    
    # Verify migration
    if npx tsc --noEmit "${file%.js}.ts"; then
        rm "$file"
        echo "✓ Migration successful"
    else
        echo "✗ Migration failed, keeping original"
        rm "${file%.js}.ts"
    fi
done
```

### 4. Documentation Pattern

```bash
#!/bin/bash
# generate-docs
claude -p "Generate comprehensive API documentation for all public methods" \
  --allowedTools "Read(src/**/*.ts),Write(docs/api.md)" \
  --system-prompt "You are a technical documentation expert" \
  --output-format json
```

### 5. Test Generation Pattern

```python
#!/usr/bin/env python3
import subprocess
import json
import glob

def generate_tests_for_file(filepath):
    prompt = f"""
    Generate comprehensive unit tests for {filepath}:
    - Test all public methods
    - Include edge cases
    - Use existing test patterns from the codebase
    - Achieve >80% coverage
    """
    
    result = subprocess.run([
        "claude", "-p", prompt,
        "--allowedTools", f"Read({filepath}),Write(tests/),Read(tests/**/*.test.ts)",
        "--output-format", "json"
    ], capture_output=True, text=True)
    
    return json.loads(result.stdout)

# Generate tests for all components
for file in glob.glob("src/components/**/*.tsx"):
    print(f"Generating tests for {file}")
    result = generate_tests_for_file(file)
    print(f"Cost: ${result['total_cost_usd']}")
```

### 6. Monitoring Pattern

```bash
#!/bin/bash
# Monitor Claude usage
METRICS_FILE="$HOME/.claude/metrics.json"

track_usage() {
    local result="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Extract metrics
    local cost=$(echo "$result" | jq -r '.total_cost_usd')
    local tokens=$(echo "$result" | jq -r '.tokens_used.total')
    local duration=$(echo "$result" | jq -r '.duration_ms')
    
    # Append to metrics file
    jq -n \
        --arg ts "$timestamp" \
        --arg cost "$cost" \
        --arg tokens "$tokens" \
        --arg duration "$duration" \
        '{timestamp: $ts, cost: $cost, tokens: $tokens, duration_ms: $duration}' \
        >> "$METRICS_FILE"
}

# Use with tracking
result=$(claude -p "Your prompt" --output-format json)
track_usage "$result"
```

## Best Practices Summary

### DO:
- ✅ Use API keys from environment variables
- ✅ Implement proper error handling with retries
- ✅ Track usage and costs
- ✅ Use appropriate models for tasks
- ✅ Implement security restrictions
- ✅ Create comprehensive CLAUDE.md files
- ✅ Use version control checkpoints
- ✅ Monitor rate limits

### DON'T:
- ❌ Hard-code API keys
- ❌ Use `--dangerously-skip-permissions` in production
- ❌ Ignore error codes
- ❌ Assume session persistence
- ❌ Skip validation of Claude's outputs
- ❌ Use Opus for simple tasks
- ❌ Exceed rate limits without backoff
- ❌ Store sensitive data in prompts

## Version History

- **2025-01**: General Availability with Claude 4 models
- **2024-12**: Beta release with streaming support
- **2024-11**: Alpha with basic CLI functionality

This guide will be updated as new features are released. For the latest information, run:
```bash
claude --help
claude --version
```