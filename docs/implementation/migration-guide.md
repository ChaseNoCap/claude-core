# Claude-Core Migration Guide: Safe Enhancement Strategy

This guide provides a detailed migration strategy for enhancing claude-core with modern Claude CLI features while maintaining backward compatibility and ensuring zero downtime.

## Migration Principles

1. **No Breaking Changes**: Existing code must continue to work
2. **Incremental Migration**: Features can be adopted gradually  
3. **Rollback Capability**: Any change can be reverted safely
4. **Continuous Operation**: No service interruption
5. **Validation First**: Test before switching

## Migration Phases

### Phase 1: Parallel Implementation (Weeks 1-6)

During this phase, new features are implemented alongside existing code without modifying current functionality.

#### 1.1 Create Feature Flags
```typescript
// src/config/features.ts
export interface FeatureFlags {
  useStreamJson: boolean;
  useJsonOutput: boolean;
  useEnhancedAuth: boolean;
  useAdvancedTools: boolean;
  useRateLimiting: boolean;
  useContextManagement: boolean;
}

export const defaultFeatures: FeatureFlags = {
  useStreamJson: false,        // Start with all features disabled
  useJsonOutput: false,
  useEnhancedAuth: false,
  useAdvancedTools: false,
  useRateLimiting: false,
  useContextManagement: false,
};
```

#### 1.2 Implement Compatibility Layer
```typescript
// src/implementations/CompatibilityLayer.ts
export class CompatibilityLayer {
  constructor(
    private features: FeatureFlags,
    private legacySession: IClaudeSession,
    private enhancedSession?: IEnhancedClaudeSession
  ) {}

  async send(prompt: string, options?: SendOptions): Promise<IResult<string>> {
    if (this.features.useStreamJson && this.enhancedSession) {
      return this.enhancedSession.sendWithStreaming(prompt, options);
    }
    return this.legacySession.send(prompt, options);
  }
}
```

#### 1.3 Version Detection
```typescript
// src/utils/ClaudeVersionDetector.ts
export class ClaudeVersionDetector {
  async detectVersion(): Promise<ClaudeVersionInfo> {
    const result = await exec('claude --version');
    return this.parseVersion(result.stdout);
  }

  supportsFeature(feature: string, version: ClaudeVersionInfo): boolean {
    const featureMatrix = {
      'stream-json': { minVersion: '1.5.0' },
      'json-output': { minVersion: '1.4.0' },
      'mcp-protocol': { minVersion: '1.6.0' },
    };
    return this.versionGreaterThan(version, featureMatrix[feature].minVersion);
  }
}
```

### Phase 2: Validation Gates (Throughout Development)

Each feature must pass through validation gates before being enabled.

#### Gate 1: Unit Test Validation
```typescript
// tests/migration/compatibility.test.ts
describe('Migration Compatibility', () => {
  it('should maintain backward compatibility with legacy send', async () => {
    const legacy = new ClaudeSession(/* ... */);
    const enhanced = new EnhancedClaudeSession(/* ... */);
    const compat = new CompatibilityLayer(defaultFeatures, legacy, enhanced);
    
    const legacyResult = await legacy.send('test prompt');
    const compatResult = await compat.send('test prompt');
    
    expect(compatResult).toEqual(legacyResult);
  });
});
```

#### Gate 2: Integration Test Validation
```bash
#!/bin/bash
# scripts/validate-integration.sh

echo "Running integration tests with legacy implementation..."
npm test -- --grep "integration"

echo "Enabling enhanced features..."
export CLAUDE_CORE_FEATURES="useStreamJson=true,useJsonOutput=true"

echo "Running integration tests with enhanced implementation..."
npm test -- --grep "integration"

echo "Comparing results..."
diff test-results-legacy.json test-results-enhanced.json
```

#### Gate 3: Performance Validation
```typescript
// scripts/performance-validation.ts
async function validatePerformance() {
  const metrics = {
    legacy: await benchmarkLegacy(),
    enhanced: await benchmarkEnhanced()
  };

  const degradation = (metrics.enhanced.avgTime - metrics.legacy.avgTime) / metrics.legacy.avgTime;
  
  if (degradation > 0.1) { // More than 10% slower
    throw new Error(`Performance degradation: ${degradation * 100}%`);
  }
  
  console.log('✅ Performance validation passed');
  console.log(`Enhanced implementation is ${-degradation * 100}% faster`);
}
```

#### Gate 4: Memory Validation
```typescript
// scripts/memory-validation.ts
async function validateMemory() {
  const memoryLeakDetector = new MemoryLeakDetector();
  
  // Run 1000 operations
  for (let i = 0; i < 1000; i++) {
    await session.send('test prompt');
    if (i % 100 === 0) {
      memoryLeakDetector.checkpoint();
    }
  }
  
  const leaks = memoryLeakDetector.analyze();
  if (leaks.length > 0) {
    throw new Error(`Memory leaks detected: ${leaks}`);
  }
}
```

### Phase 3: Gradual Rollout (Weeks 7-10)

Enable features gradually with careful monitoring.

#### 3.1 Feature Flag Management
```typescript
// src/config/FeatureFlagManager.ts
export class FeatureFlagManager {
  private rolloutPercentages = new Map<keyof FeatureFlags, number>();

  async shouldEnableFeature(feature: keyof FeatureFlags, sessionId: string): boolean {
    const percentage = this.rolloutPercentages.get(feature) || 0;
    const hash = this.hashSessionId(sessionId);
    return (hash % 100) < percentage;
  }

  async increaseRollout(feature: keyof FeatureFlags, percentage: number) {
    if (percentage > 100 || percentage < 0) {
      throw new Error('Invalid percentage');
    }
    
    // Validate before increasing
    const validation = await this.validateFeature(feature, percentage);
    if (!validation.passed) {
      throw new Error(`Validation failed: ${validation.errors}`);
    }
    
    this.rolloutPercentages.set(feature, percentage);
    await this.persistRolloutConfig();
  }
}
```

#### 3.2 Monitoring and Alerts
```typescript
// src/monitoring/MigrationMonitor.ts
export class MigrationMonitor {
  private metrics = {
    errors: new Map<string, number>(),
    latencies: new Map<string, number[]>(),
    successRates: new Map<string, number>(),
  };

  async recordOperation(feature: string, operation: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await operation();
      this.recordSuccess(feature, Date.now() - start);
      return result;
    } catch (error) {
      this.recordError(feature, error);
      throw error;
    }
  }

  async checkHealthAndRollback() {
    for (const [feature, errorCount] of this.metrics.errors) {
      const successRate = this.calculateSuccessRate(feature);
      
      if (successRate < 0.95) { // Less than 95% success rate
        console.error(`Feature ${feature} has low success rate: ${successRate}`);
        await this.rollbackFeature(feature);
      }
    }
  }
}
```

#### 3.3 A/B Testing
```typescript
// src/testing/ABTestManager.ts
export class ABTestManager {
  async runABTest(feature: keyof FeatureFlags, duration: number) {
    const controlGroup: SessionResult[] = [];
    const testGroup: SessionResult[] = [];
    
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const sessionId = generateSessionId();
      const useFeature = Math.random() < 0.5;
      
      const result = await this.runSession(sessionId, {
        [feature]: useFeature
      });
      
      if (useFeature) {
        testGroup.push(result);
      } else {
        controlGroup.push(result);
      }
    }
    
    return this.analyzeResults(controlGroup, testGroup);
  }
}
```

### Phase 4: Cleanup (Weeks 11-12)

Remove deprecated code after successful migration.

#### 4.1 Deprecation Warnings
```typescript
// src/implementations/ClaudeSession.ts
/**
 * @deprecated Use EnhancedClaudeSession instead. Will be removed in v2.0.0
 */
export class ClaudeSession implements IClaudeSession {
  constructor(...args: any[]) {
    console.warn(
      'ClaudeSession is deprecated. Please migrate to EnhancedClaudeSession. ' +
      'See migration guide: https://github.com/chasenocap/claude-core/docs/migration-guide.md'
    );
  }
}
```

#### 4.2 Safe Removal Checklist
```markdown
## Pre-removal Checklist

- [ ] All features enabled at 100% for 2 weeks
- [ ] Zero rollbacks in the last week
- [ ] All consumers notified of deprecation
- [ ] Migration guide published and tested
- [ ] Performance metrics show improvement
- [ ] No increase in error rates
- [ ] All tests passing with new implementation
- [ ] Documentation updated
- [ ] Backward compatibility layer can be removed
- [ ] Final security audit completed
```

#### 4.3 Cleanup Script
```bash
#!/bin/bash
# scripts/cleanup-deprecated.sh

echo "Starting cleanup of deprecated code..."

# Check if safe to remove
if ! ./scripts/validate-cleanup-safety.sh; then
  echo "❌ Not safe to cleanup yet"
  exit 1
fi

# Create backup
git checkout -b backup/pre-cleanup-$(date +%Y%m%d)
git push origin backup/pre-cleanup-$(date +%Y%m%d)

# Remove deprecated files
rm -f src/implementations/ClaudeSession.ts
rm -f src/implementations/OldOutputParser.ts
rm -rf src/legacy/

# Update imports
find src -name "*.ts" -exec sed -i '' 's/ClaudeSession/EnhancedClaudeSession/g' {} \;

# Run tests
npm test

# Update version
npm version major

echo "✅ Cleanup complete"
```

## Manual Validation Points

### Validation Point 1: Feature Flag Toggle (Every Sprint)
```bash
# Manual test: Toggle each feature on/off
for feature in useStreamJson useJsonOutput useEnhancedAuth; do
  echo "Testing with $feature=false"
  export CLAUDE_CORE_FEATURE_$feature=false
  npm test
  
  echo "Testing with $feature=true"  
  export CLAUDE_CORE_FEATURE_$feature=true
  npm test
done
```

### Validation Point 2: Load Testing (Before Each Rollout)
```bash
# Run load test with gradually increasing load
for connections in 10 50 100 500 1000; do
  echo "Load testing with $connections concurrent connections"
  artillery run --target http://localhost:3000 \
    --count $connections \
    --duration 300 \
    load-test.yml
    
  # Check metrics
  if [ $(cat metrics.json | jq .error_rate) -gt 0.01 ]; then
    echo "❌ Error rate too high with $connections connections"
    exit 1
  fi
done
```

### Validation Point 3: Customer Impact (Weekly)
```sql
-- Query to check customer impact
SELECT 
  feature_name,
  COUNT(DISTINCT session_id) as affected_sessions,
  AVG(CASE WHEN error_occurred THEN 1 ELSE 0 END) as error_rate,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
FROM 
  claude_core_metrics
WHERE 
  timestamp > NOW() - INTERVAL '7 days'
GROUP BY 
  feature_name
ORDER BY 
  error_rate DESC;
```

### Validation Point 4: Rollback Testing (Before Production)
```typescript
// tests/migration/rollback.test.ts
describe('Rollback Scenarios', () => {
  it('should successfully rollback from enhanced to legacy', async () => {
    // Enable enhanced features
    await featureFlagManager.setFlags({ useStreamJson: true });
    
    // Simulate failure
    mockClaudeFailure();
    
    // Automatic rollback should occur
    await monitor.checkHealthAndRollback();
    
    // Verify rollback
    const flags = await featureFlagManager.getFlags();
    expect(flags.useStreamJson).toBe(false);
    
    // Verify functionality restored
    const result = await session.send('test');
    expect(result.success).toBe(true);
  });
});
```

## Migration Timeline

### Week 1-2: Foundation
- Implement feature flags
- Create compatibility layer
- Set up monitoring

### Week 3-4: Core Features
- Implement streaming JSON
- Add authentication manager
- Initial validation

### Week 5-6: Advanced Features
- Rate limiting
- Context management
- Performance optimization

### Week 7-8: Rollout Preparation
- A/B testing setup
- Load testing
- Documentation

### Week 9-10: Gradual Rollout
- 10% → 25% → 50% → 100%
- Monitor and adjust
- Fix any issues

### Week 11-12: Cleanup
- Remove deprecated code
- Final optimization
- Release v2.0.0

## Emergency Procedures

### Immediate Rollback
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Disable all enhanced features immediately
export CLAUDE_CORE_FEATURES="all=false"

# Restart services
pm2 restart all

# Notify team
curl -X POST $SLACK_WEBHOOK -d '{"text":"Emergency rollback executed"}'

# Create incident report
echo "Rollback at $(date)" >> incidents.log
```

### Feature Circuit Breaker
```typescript
// src/resilience/CircuitBreaker.ts
export class FeatureCircuitBreaker {
  private failures = new Map<string, number>();
  private readonly threshold = 10;
  private readonly resetTime = 60000; // 1 minute

  async executeWithBreaker<T>(
    feature: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    if (this.isOpen(feature)) {
      return fallback();
    }

    try {
      const result = await operation();
      this.recordSuccess(feature);
      return result;
    } catch (error) {
      this.recordFailure(feature);
      if (this.failures.get(feature) >= this.threshold) {
        this.openBreaker(feature);
      }
      return fallback();
    }
  }
}
```

## Success Criteria

The migration is considered successful when:

1. ✅ All enhanced features enabled at 100%
2. ✅ Error rate < 0.1% (better than baseline)
3. ✅ P95 latency improved by >20%
4. ✅ Zero customer complaints
5. ✅ All deprecated code removed
6. ✅ Documentation complete
7. ✅ Team trained on new features
8. ✅ Monitoring shows stable metrics for 2 weeks

## Post-Migration

After successful migration:

1. **Document Lessons Learned**
2. **Update Best Practices**
3. **Plan Next Enhancements**
4. **Celebrate Success! 🎉**