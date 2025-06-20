/**
 * Constants and enums based on official Claude CLI documentation
 */

/**
 * Exit codes used by Claude CLI
 */
export enum ClaudeExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
  PERMISSION_DENIED = 3,
  NETWORK_ERROR = 4,
  RATE_LIMITED = 5,
}

/**
 * Output format options for Claude CLI
 */
export enum OutputFormat {
  TEXT = 'text',
  JSON = 'json',
  STREAM_JSON = 'stream-json',
}

/**
 * Input format options for Claude CLI
 */
export enum InputFormat {
  TEXT = 'text',
  STREAM_JSON = 'stream-json',
}

/**
 * JSON response types
 */
export enum JsonResponseType {
  RESULT = 'result',
}

/**
 * JSON response subtypes
 */
export enum JsonResponseSubtype {
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Available Claude models via CLI
 */
export enum ClaudeCliModel {
  SONNET = 'sonnet',  // Claude 3.5 Sonnet
  OPUS = 'opus',      // Claude 3 Opus
}

/**
 * Environment variables recognized by Claude CLI
 */
export const CLAUDE_ENV_VARS = {
  API_KEY: 'ANTHROPIC_API_KEY',
  USE_BEDROCK: 'CLAUDE_CODE_USE_BEDROCK',
  USE_VERTEX: 'CLAUDE_CODE_USE_VERTEX',
  ENABLE_TELEMETRY: 'CLAUDE_CODE_ENABLE_TELEMETRY',
} as const;

/**
 * Standard JSON response structure from Claude CLI
 */
export interface ClaudeJsonResponse {
  type: JsonResponseType;
  subtype: JsonResponseSubtype;
  total_cost_usd: number;
  is_error: boolean;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  result: string;
  session_id: string;
}