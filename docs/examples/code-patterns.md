# Claude-Core Code Examples and Patterns

This guide provides practical code examples and patterns for using claude-core with modern Claude CLI features.

## Table of Contents

1. [Basic Usage Patterns](#basic-usage-patterns)
2. [Streaming Patterns](#streaming-patterns)
3. [Authentication Patterns](#authentication-patterns)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Tool Management Patterns](#tool-management-patterns)
6. [Performance Patterns](#performance-patterns)
7. [Production Patterns](#production-patterns)
8. [Testing Patterns](#testing-patterns)

## Basic Usage Patterns

### Simple Text Generation
```typescript
import { Claude, ClaudeModel } from '@chasenocap/claude-core';

async function generateText() {
  const claude = new Claude();
  const session = await claude.createSession({
    model: ClaudeModel.OPUS_4,
  });

  const result = await session.send('Write a haiku about TypeScript');
  
  if (result.success) {
    console.log(result.value);
  } else {
    console.error('Error:', result.error);
  }
}
```

### With System Prompt
```typescript
async function codeReviewer() {
  const session = await claude.createSession({
    model: ClaudeModel.SONNET_4,
    systemPrompt: 'You are an expert code reviewer. Focus on security and performance.',
  });

  const result = await session.send('Review this code:\n```\n' + code + '\n```');
  return result;
}
```

### Session Forking
```typescript
async function exploreOptions() {
  const mainSession = await claude.createSession({
    model: ClaudeModel.SONNET_4,
  });

  // Initial context
  await mainSession.send('Design a REST API for a todo app');

  // Fork to explore different approaches
  const restfulFork = await mainSession.fork();
  const graphqlFork = await mainSession.fork();

  const [restResult, graphqlResult] = await Promise.all([
    restfulFork.send('Implement using REST conventions'),
    graphqlFork.send('Implement using GraphQL'),
  ]);

  // Compare approaches
  return { rest: restResult.value, graphql: graphqlResult.value };
}
```

## Streaming Patterns

### Real-time Streaming with Callbacks
```typescript
interface StreamingOptions {
  onToken?: (token: string) => void;
  onToolUse?: (tool: ToolUse) => void;
  onComplete?: (result: string) => void;
  onError?: (error: Error) => void;
}

async function streamResponse(prompt: string, options: StreamingOptions) {
  const session = await claude.createSession({
    model: ClaudeModel.OPUS_4,
    outputFormat: 'stream-json',
  });

  const stream = await session.stream(prompt);

  for await (const event of stream) {
    switch (event.type) {
      case 'token':
        options.onToken?.(event.content);
        break;
      case 'tool_use':
        options.onToolUse?.(event);
        break;
      case 'error':
        options.onError?.(new Error(event.message));
        break;
      case 'complete':
        options.onComplete?.(event.result);
        break;
    }
  }
}

// Usage
await streamResponse('Write a long story', {
  onToken: (token) => process.stdout.write(token),
  onToolUse: (tool) => console.log(`\n[Using ${tool.name}]\n`),
  onComplete: (result) => console.log('\n✓ Complete'),
  onError: (error) => console.error('\n✗ Error:', error),
});
```

### Streaming with Progress Tracking
```typescript
class ProgressTracker {
  private tokens = 0;
  private startTime = Date.now();

  async trackStream(session: IClaudeSession, prompt: string) {
    const progressBar = new ProgressBar('Generating [:bar] :percent :etas', {
      total: 100,
      width: 40,
    });

    const result = await session.stream(prompt, {
      onProgress: (progress) => {
        this.tokens += progress.tokens;
        progressBar.update(progress.percentage / 100);
      },
    });

    const duration = Date.now() - this.startTime;
    console.log(`Generated ${this.tokens} tokens in ${duration}ms`);
    console.log(`Speed: ${(this.tokens / duration * 1000).toFixed(1)} tokens/sec`);

    return result;
  }
}
```

### Streaming to Multiple Destinations
```typescript
class MultiStreamHandler {
  private destinations: WritableStream[] = [];

  addDestination(stream: WritableStream) {
    this.destinations.push(stream);
  }

  async handleStream(session: IClaudeSession, prompt: string) {
    const stream = await session.stream(prompt);

    for await (const chunk of stream) {
      // Write to all destinations in parallel
      await Promise.all(
        this.destinations.map(dest => 
          dest.write(chunk).catch(err => 
            console.error('Stream write error:', err)
          )
        )
      );
    }
  }
}

// Usage: Stream to file, console, and websocket
const handler = new MultiStreamHandler();
handler.addDestination(fs.createWriteStream('output.txt'));
handler.addDestination(process.stdout);
handler.addDestination(websocketStream);
await handler.handleStream(session, 'Generate report');
```

## Authentication Patterns

### Multi-Provider Authentication
```typescript
class AuthenticationManager {
  private providers: Map<string, IAuthProvider> = new Map();

  constructor() {
    this.registerProviders();
  }

  private registerProviders() {
    this.providers.set('anthropic', new AnthropicAuthProvider());
    this.providers.set('bedrock', new BedrockAuthProvider());
    this.providers.set('vertex', new VertexAuthProvider());
  }

  async authenticate(config: AuthConfig): Promise<Credentials> {
    // Try providers in order of preference
    const preferenceOrder = ['anthropic', 'bedrock', 'vertex'];

    for (const providerName of preferenceOrder) {
      const provider = this.providers.get(providerName);
      if (provider && await provider.isAvailable()) {
        try {
          return await provider.authenticate(config);
        } catch (error) {
          console.warn(`${providerName} auth failed:`, error);
          continue;
        }
      }
    }

    throw new Error('No authentication provider available');
  }
}

// Usage
const authManager = new AuthenticationManager();
const credentials = await authManager.authenticate({
  apiKey: process.env.ANTHROPIC_API_KEY,
  awsProfile: process.env.AWS_PROFILE,
  gcpProject: process.env.GCP_PROJECT,
});

const session = await claude.createSession({
  credentials,
  model: ClaudeModel.OPUS_4,
});
```

### Secure Credential Storage
```typescript
import * as keytar from 'keytar';
import * as crypto from 'crypto';

class SecureCredentialStore {
  private readonly service = 'claude-core';
  private readonly algorithm = 'aes-256-gcm';

  async storeApiKey(account: string, apiKey: string): Promise<void> {
    const encrypted = this.encrypt(apiKey);
    await keytar.setPassword(this.service, account, encrypted);
  }

  async getApiKey(account: string): Promise<string | null> {
    const encrypted = await keytar.getPassword(this.service, account);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = this.getDerivedKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const key = this.getDerivedKey();
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private getDerivedKey(): Buffer {
    // Derive key from machine-specific data
    const machineId = os.hostname() + os.userInfo().username;
    return crypto.scryptSync(machineId, 'claude-core-salt', 32);
  }
}
```

### OAuth Flow Implementation
```typescript
class OAuthAuthenticator {
  private readonly clientId = 'claude-core-cli';
  private readonly redirectUri = 'http://localhost:8080/callback';

  async authenticate(): Promise<string> {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    
    // Start local server for callback
    const authCode = await this.startCallbackServer();
    
    // Open browser for authentication
    const authUrl = this.buildAuthUrl(codeChallenge);
    await open(authUrl);
    
    // Wait for callback
    const code = await authCode;
    
    // Exchange code for token
    const token = await this.exchangeCodeForToken(code, codeVerifier);
    
    return token;
  }

  private generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  private buildAuthUrl(codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    return `https://claude.ai/oauth/authorize?${params}`;
  }

  private startCallbackServer(): Promise<string> {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const code = url.searchParams.get('code');
        
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful! You can close this window.</h1>');
          server.close();
          resolve(code);
        }
      });
      
      server.listen(8080);
    });
  }
}
```

## Error Handling Patterns

### Comprehensive Error Handling
```typescript
class ClaudeErrorHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      backoffMultiplier = 2,
      initialDelay = 1000,
      maxDelay = 30000,
      retryableErrors = [4, 5], // Network and rate limit
    } = options;

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(error, retryableErrors)) {
          throw error;
        }
        
        if (attempt === maxAttempts) {
          throw new Error(`Failed after ${maxAttempts} attempts: ${lastError.message}`);
        }
        
        const delay = this.calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private isRetryable(error: any, retryableErrors: number[]): boolean {
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check for specific error messages
    const retryableMessages = [
      'rate limit',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
    ];
    
    return retryableMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private calculateDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number,
    maxDelay: number
  ): number {
    const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5);
    return Math.min(jitteredDelay, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const errorHandler = new ClaudeErrorHandler();

const result = await errorHandler.executeWithRetry(
  async () => {
    return await session.send('Complex task that might fail');
  },
  {
    maxAttempts: 5,
    retryableErrors: [4, 5, 503],
  }
);
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000,
    private readonly resetTimeout = 120000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error(`Circuit breaker opened after ${this.failures} failures`);
      
      // Auto-reset after timeout
      setTimeout(() => {
        this.state = 'half-open';
        this.failures = 0;
        console.log('Circuit breaker reset to half-open');
      }, this.resetTimeout);
    }
  }
}

// Usage with Claude session
const breaker = new CircuitBreaker();

async function safeClaudeRequest(prompt: string) {
  return breaker.execute(async () => {
    return await session.send(prompt);
  });
}
```

## Tool Management Patterns

### Fine-grained Tool Permissions
```typescript
class ToolPermissionManager {
  private rules: PermissionRule[] = [];

  addRule(rule: PermissionRule) {
    this.rules.push(rule);
  }

  buildClaudeFlags(): string[] {
    const allowed: string[] = [];
    const disallowed: string[] = [];

    for (const rule of this.rules) {
      if (rule.type === 'allow') {
        allowed.push(this.formatRule(rule));
      } else {
        disallowed.push(this.formatRule(rule));
      }
    }

    const flags: string[] = [];
    if (allowed.length > 0) {
      flags.push(`--allowedTools`, allowed.join(','));
    }
    if (disallowed.length > 0) {
      flags.push(`--disallowedTools`, disallowed.join(','));
    }

    return flags;
  }

  private formatRule(rule: PermissionRule): string {
    if (rule.parameters) {
      return `${rule.tool}(${rule.parameters})`;
    }
    return rule.tool;
  }
}

// Usage
const permissions = new ToolPermissionManager();

// Allow read access to source files only
permissions.addRule({
  type: 'allow',
  tool: 'Read',
  parameters: 'src/**/*',
});

// Allow safe npm commands
permissions.addRule({
  type: 'allow',
  tool: 'Bash',
  parameters: 'npm test:*',
});

// Explicitly deny dangerous commands
permissions.addRule({
  type: 'deny',
  tool: 'Bash',
  parameters: 'rm -rf:*',
});

const session = await claude.createSession({
  model: ClaudeModel.SONNET_4,
  toolPermissions: permissions,
});
```

### Dynamic Tool Restrictions
```typescript
class DynamicToolRestrictor {
  private contextRules = new Map<string, PermissionRule[]>();

  async evaluateContext(prompt: string): Promise<ToolPermissions> {
    const context = await this.analyzePrompt(prompt);
    
    // Apply different rules based on context
    if (context.includes('production')) {
      return this.getProductionPermissions();
    } else if (context.includes('test')) {
      return this.getTestPermissions();
    } else {
      return this.getDefaultPermissions();
    }
  }

  private getProductionPermissions(): ToolPermissions {
    return {
      allowed: ['Read'],
      disallowed: ['Write', 'Edit', 'Bash'],
    };
  }

  private getTestPermissions(): ToolPermissions {
    return {
      allowed: ['Read', 'Edit', 'Bash(npm test:*)'],
      disallowed: ['Bash(rm:*)', 'Bash(sudo:*)'],
    };
  }

  private async analyzePrompt(prompt: string): Promise<string> {
    // Simple keyword analysis, could be enhanced with NLP
    const keywords = ['production', 'test', 'development', 'staging'];
    const found = keywords.filter(keyword => 
      prompt.toLowerCase().includes(keyword)
    );
    return found.join(',');
  }
}
```

## Performance Patterns

### Concurrent Session Management
```typescript
class SessionPool {
  private pool: IClaudeSession[] = [];
  private inUse = new Set<IClaudeSession>();
  
  constructor(
    private readonly size: number,
    private readonly config: SessionConfig
  ) {}

  async initialize() {
    const promises = Array.from({ length: this.size }, () =>
      claude.createSession(this.config)
    );
    
    this.pool = await Promise.all(promises);
  }

  async acquire(): Promise<IClaudeSession> {
    // Wait for available session
    while (this.pool.length === 0) {
      await this.sleep(100);
    }
    
    const session = this.pool.pop()!;
    this.inUse.add(session);
    return session;
  }

  release(session: IClaudeSession) {
    this.inUse.delete(session);
    this.pool.push(session);
  }

  async withSession<T>(
    operation: (session: IClaudeSession) => Promise<T>
  ): Promise<T> {
    const session = await this.acquire();
    try {
      return await operation(session);
    } finally {
      this.release(session);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage: Process multiple prompts concurrently
const pool = new SessionPool(5, { model: ClaudeModel.SONNET_4 });
await pool.initialize();

const prompts = [
  'Task 1: Analyze code',
  'Task 2: Write tests',
  'Task 3: Generate docs',
  // ... more tasks
];

const results = await Promise.all(
  prompts.map(prompt =>
    pool.withSession(session => session.send(prompt))
  )
);
```

### Context Window Optimization
```typescript
class ContextOptimizer {
  private readonly encoder = new TikTokenEncoder();
  
  async optimizeContext(
    messages: Message[],
    maxTokens: number = 30000
  ): Promise<Message[]> {
    const importantMessages = this.identifyImportantMessages(messages);
    const optimized: Message[] = [];
    let currentTokens = 0;

    // Always include important messages
    for (const msg of importantMessages) {
      const tokens = await this.countTokens(msg);
      optimized.push(msg);
      currentTokens += tokens;
    }

    // Add recent messages until limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (importantMessages.includes(msg)) continue;
      
      const tokens = await this.countTokens(msg);
      if (currentTokens + tokens > maxTokens) break;
      
      optimized.unshift(msg);
      currentTokens += tokens;
    }

    // Compress if still over limit
    if (currentTokens > maxTokens) {
      return this.compressMessages(optimized, maxTokens);
    }

    return optimized;
  }

  private identifyImportantMessages(messages: Message[]): Message[] {
    return messages.filter(msg => 
      msg.metadata?.important ||
      msg.content.includes('IMPORTANT') ||
      msg.content.includes('TODO') ||
      msg.role === 'system'
    );
  }

  private async countTokens(message: Message): Promise<number> {
    return this.encoder.encode(message.content).length;
  }

  private async compressMessages(
    messages: Message[],
    maxTokens: number
  ): Promise<Message[]> {
    // Implement message summarization
    const compressed: Message[] = [];
    let currentTokens = 0;

    for (const msg of messages) {
      const summary = await this.summarizeMessage(msg);
      const tokens = await this.countTokens(summary);
      
      if (currentTokens + tokens <= maxTokens) {
        compressed.push(summary);
        currentTokens += tokens;
      }
    }

    return compressed;
  }

  private async summarizeMessage(message: Message): Promise<Message> {
    // In practice, this could use a smaller model for summarization
    return {
      ...message,
      content: message.content.substring(0, 500) + '... [truncated]',
      metadata: { ...message.metadata, compressed: true },
    };
  }
}
```

## Production Patterns

### Health Monitoring
```typescript
class ClaudeHealthMonitor {
  private metrics = {
    requests: 0,
    errors: 0,
    totalLatency: 0,
    tokenUsage: 0,
    cost: 0,
  };

  async monitorRequest<T>(
    operation: () => Promise<T>,
    metadata: RequestMetadata
  ): Promise<T> {
    const start = Date.now();
    this.metrics.requests++;

    try {
      const result = await operation();
      
      const latency = Date.now() - start;
      this.metrics.totalLatency += latency;
      
      if ('tokens' in result) {
        this.metrics.tokenUsage += result.tokens;
      }
      
      if ('cost' in result) {
        this.metrics.cost += result.cost;
      }

      this.emitMetrics('success', { latency, ...metadata });
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.emitMetrics('error', { error, ...metadata });
      throw error;
    }
  }

  getHealthStatus(): HealthStatus {
    const errorRate = this.metrics.errors / this.metrics.requests;
    const avgLatency = this.metrics.totalLatency / this.metrics.requests;
    
    return {
      status: errorRate > 0.05 ? 'unhealthy' : 'healthy',
      errorRate,
      avgLatency,
      totalRequests: this.metrics.requests,
      totalCost: this.metrics.cost,
      avgTokensPerRequest: this.metrics.tokenUsage / this.metrics.requests,
    };
  }

  private emitMetrics(event: string, data: any) {
    // Send to monitoring service
    if (process.env.DATADOG_API_KEY) {
      // DataDog integration
    } else if (process.env.PROMETHEUS_PUSHGATEWAY) {
      // Prometheus integration
    } else {
      // Local logging
      console.log(`[METRICS] ${event}:`, data);
    }
  }
}
```

### Graceful Shutdown
```typescript
class GracefulShutdown {
  private sessions: Set<IClaudeSession> = new Set();
  private shuttingDown = false;

  registerSession(session: IClaudeSession) {
    this.sessions.add(session);
  }

  unregisterSession(session: IClaudeSession) {
    this.sessions.delete(session);
  }

  async shutdown(timeout = 30000): Promise<void> {
    console.log('Initiating graceful shutdown...');
    this.shuttingDown = true;

    // Stop accepting new requests
    this.stopAcceptingRequests();

    // Wait for ongoing requests with timeout
    const shutdownPromise = this.waitForSessions();
    const timeoutPromise = this.timeout(timeout);

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      console.log('Graceful shutdown completed');
    } catch (error) {
      console.error('Forced shutdown due to timeout');
      this.forceShutdown();
    }
  }

  private async waitForSessions() {
    const checkInterval = setInterval(() => {
      console.log(`Waiting for ${this.sessions.size} sessions to complete...`);
    }, 5000);

    while (this.sessions.size > 0) {
      await this.sleep(100);
    }

    clearInterval(checkInterval);
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), ms);
    });
  }

  private forceShutdown() {
    for (const session of this.sessions) {
      session.terminate();
    }
    this.sessions.clear();
  }

  private stopAcceptingRequests() {
    // Implementation depends on your server framework
    if (global.server) {
      global.server.close();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const shutdown = new GracefulShutdown();

// Register sessions
const session = await claude.createSession({ model: ClaudeModel.OPUS_4 });
shutdown.registerSession(session);

// Handle shutdown signals
process.on('SIGTERM', () => shutdown.shutdown());
process.on('SIGINT', () => shutdown.shutdown());
```

## Testing Patterns

### Mock Claude Session for Testing
```typescript
class MockClaudeSession implements IClaudeSession {
  private responses = new Map<string, string>();
  private callHistory: Array<{ prompt: string; timestamp: Date }> = [];

  setResponse(prompt: string, response: string) {
    this.responses.set(prompt, response);
  }

  setResponsePattern(pattern: RegExp, response: string) {
    // Store pattern-based responses
  }

  async send(prompt: string): Promise<IResult<string>> {
    this.callHistory.push({ prompt, timestamp: new Date() });

    const response = this.responses.get(prompt) || 
      this.findPatternMatch(prompt) ||
      'Mock response';

    // Simulate processing time
    await this.sleep(100);

    return {
      success: true,
      value: response,
    };
  }

  getCallHistory() {
    return [...this.callHistory];
  }

  reset() {
    this.callHistory = [];
  }

  private findPatternMatch(prompt: string): string | null {
    // Implementation for pattern matching
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage in tests
describe('MyClaudeIntegration', () => {
  let mockSession: MockClaudeSession;

  beforeEach(() => {
    mockSession = new MockClaudeSession();
    mockSession.setResponse(
      'Generate a greeting',
      'Hello, world!'
    );
  });

  it('should handle greetings', async () => {
    const result = await myFunction(mockSession);
    expect(result).toBe('Hello, world!');
    
    const history = mockSession.getCallHistory();
    expect(history).toHaveLength(1);
    expect(history[0].prompt).toBe('Generate a greeting');
  });
});
```

### Integration Test Patterns
```typescript
class ClaudeIntegrationTester {
  private realSession: IClaudeSession;
  private mockSession: IClaudeSession;

  constructor(private readonly useMock = process.env.USE_MOCK === 'true') {}

  async getSession(): Promise<IClaudeSession> {
    if (this.useMock) {
      if (!this.mockSession) {
        this.mockSession = new MockClaudeSession();
      }
      return this.mockSession;
    }

    if (!this.realSession) {
      this.realSession = await claude.createSession({
        model: ClaudeModel.HAIKU_4, // Use cheaper model for tests
      });
    }
    return this.realSession;
  }

  async runTestSuite(tests: TestCase[]): Promise<TestResults> {
    const results: TestResult[] = [];

    for (const test of tests) {
      const session = await this.getSession();
      const start = Date.now();

      try {
        const result = await session.send(test.prompt);
        const duration = Date.now() - start;

        results.push({
          name: test.name,
          passed: test.validate(result.value),
          duration,
          cost: this.estimateCost(test.prompt, result.value),
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          error: error.message,
          duration: Date.now() - start,
        });
      }
    }

    return this.analyzeResults(results);
  }

  private estimateCost(prompt: string, response: string): number {
    // Rough token estimation
    const promptTokens = prompt.split(' ').length * 1.3;
    const responseTokens = response.split(' ').length * 1.3;
    
    // Haiku pricing: $0.25 per 1M tokens
    return (promptTokens + responseTokens) * 0.25 / 1_000_000;
  }

  private analyzeResults(results: TestResult[]): TestResults {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      passed,
      failed,
      total: results.length,
      successRate: passed / results.length,
      totalCost,
      avgDuration: totalDuration / results.length,
      results,
    };
  }
}
```

## Best Practices Summary

### Session Lifecycle
```typescript
// ✅ DO: Properly manage session lifecycle
async function properSessionManagement() {
  const session = await claude.createSession({ model: ClaudeModel.SONNET_4 });
  
  try {
    const result = await session.send('Your prompt');
    return result;
  } finally {
    await session.close(); // Always clean up
  }
}

// ❌ DON'T: Leave sessions open
async function badSessionManagement() {
  const session = await claude.createSession({ model: ClaudeModel.SONNET_4 });
  const result = await session.send('Your prompt');
  return result; // Session never closed!
}
```

### Error Handling
```typescript
// ✅ DO: Handle errors gracefully
async function robustOperation() {
  try {
    const result = await session.send('Complex task');
    if (!result.success) {
      console.error('Operation failed:', result.error);
      return handleFailure(result.error);
    }
    return result.value;
  } catch (error) {
    console.error('Unexpected error:', error);
    return handleUnexpectedError(error);
  }
}

// ❌ DON'T: Ignore errors
async function fragileOperation() {
  const result = await session.send('Complex task');
  return result.value; // What if result.success is false?
}
```

### Resource Management
```typescript
// ✅ DO: Monitor resource usage
class ResourceAwareClient {
  private tokenBudget = 1_000_000;
  private tokensUsed = 0;

  async send(prompt: string): Promise<IResult<string>> {
    const estimatedTokens = this.estimateTokens(prompt);
    
    if (this.tokensUsed + estimatedTokens > this.tokenBudget) {
      return {
        success: false,
        error: new Error('Token budget exceeded'),
      };
    }

    const result = await this.session.send(prompt);
    
    if (result.success && result.metadata?.tokensUsed) {
      this.tokensUsed += result.metadata.tokensUsed;
    }

    return result;
  }
}

// ❌ DON'T: Ignore resource limits
async function unlimitedUsage() {
  while (true) {
    await session.send('Generate something'); // No limits!
  }
}
```

These patterns provide a solid foundation for building robust, production-ready applications with claude-core. Remember to always consider error handling, resource management, and security when implementing these patterns in your own applications.