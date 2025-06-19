/**
 * Available Claude models with their API identifiers
 * @see https://docs.anthropic.com/en/docs/about-claude/models
 */
export enum ClaudeModel {
  // Claude Opus 4 (Latest Generation - May 2025)
  OPUS_4 = 'claude-opus-4-20250514',
  
  // Claude Sonnet 4 (Latest Generation - May 2025)
  SONNET_4 = 'claude-sonnet-4-20250514',
  
  // Claude 3.7 Family
  SONNET_3_7 = 'claude-3.7-sonnet-20250220',
  
  // Claude 3.5 Family
  SONNET_3_5_NEW = 'claude-3-5-sonnet-20241022',
  SONNET_3_5 = 'claude-3-5-sonnet-20240620',
  HAIKU_3_5 = 'claude-3-5-haiku-20241022',
  
  // Claude 3 Family
  OPUS_3 = 'claude-3-opus-20240229',
  SONNET_3 = 'claude-3-sonnet-20240229',
  HAIKU_3 = 'claude-3-haiku-20240307',
}

/**
 * Model aliases for development/testing
 * These point to the latest version of each model tier
 */
export const ClaudeModelAlias = {
  OPUS_LATEST: ClaudeModel.OPUS_4,
  SONNET_LATEST: ClaudeModel.SONNET_4,
  HAIKU_LATEST: ClaudeModel.HAIKU_3_5,
} as const;

/**
 * Default model to use if none specified
 */
export const DEFAULT_CLAUDE_MODEL = ClaudeModel.OPUS_4;

/**
 * Model pricing information (per million tokens)
 */
export const ModelPricing = {
  [ClaudeModel.OPUS_4]: { input: 15, output: 75 },
  [ClaudeModel.SONNET_4]: { input: 3, output: 15 },
  [ClaudeModel.SONNET_3_7]: { input: 3, output: 15 },
  [ClaudeModel.SONNET_3_5_NEW]: { input: 3, output: 15 },
  [ClaudeModel.SONNET_3_5]: { input: 3, output: 15 },
  [ClaudeModel.HAIKU_3_5]: { input: 0.25, output: 1.25 },
  [ClaudeModel.OPUS_3]: { input: 15, output: 75 },
  [ClaudeModel.SONNET_3]: { input: 3, output: 15 },
  [ClaudeModel.HAIKU_3]: { input: 0.25, output: 1.25 },
} as const;

/**
 * Type guard to check if a string is a valid Claude model
 */
export function isValidClaudeModel(model: string): model is ClaudeModel {
  return Object.values(ClaudeModel).includes(model as ClaudeModel);
}

/**
 * Get human-readable name for a model
 */
export function getModelDisplayName(model: ClaudeModel): string {
  const names: Record<ClaudeModel, string> = {
    [ClaudeModel.OPUS_4]: 'Claude Opus 4',
    [ClaudeModel.SONNET_4]: 'Claude Sonnet 4',
    [ClaudeModel.SONNET_3_7]: 'Claude 3.7 Sonnet',
    [ClaudeModel.SONNET_3_5_NEW]: 'Claude 3.5 Sonnet (New)',
    [ClaudeModel.SONNET_3_5]: 'Claude 3.5 Sonnet',
    [ClaudeModel.HAIKU_3_5]: 'Claude 3.5 Haiku',
    [ClaudeModel.OPUS_3]: 'Claude 3 Opus',
    [ClaudeModel.SONNET_3]: 'Claude 3 Sonnet',
    [ClaudeModel.HAIKU_3]: 'Claude 3 Haiku',
  };
  return names[model];
}