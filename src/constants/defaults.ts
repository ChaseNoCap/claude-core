/**
 * Default timeout values for different Claude operations
 */
export const DEFAULT_TIMEOUTS = {
  /**
   * Default timeout for standard Claude requests (2 minutes)
   */
  STANDARD_REQUEST: 120_000,

  /**
   * Timeout for simple/quick requests (30 seconds)
   */
  QUICK_REQUEST: 30_000,

  /**
   * Timeout for complex/long-running requests (5 minutes)
   */
  COMPLEX_REQUEST: 300_000,

  /**
   * Timeout for tool-heavy operations (10 minutes)
   */
  TOOL_HEAVY_REQUEST: 600_000,

  /**
   * Grace period before forcefully killing a process after SIGTERM (5 seconds)
   */
  KILL_GRACE_PERIOD: 5_000,
} as const;

/**
 * Timeout configuration based on operation type
 */
export const OPERATION_TIMEOUTS = {
  /**
   * Simple text generation, no tools
   */
  TEXT_GENERATION: DEFAULT_TIMEOUTS.STANDARD_REQUEST,

  /**
   * Code generation or analysis
   */
  CODE_GENERATION: DEFAULT_TIMEOUTS.COMPLEX_REQUEST,

  /**
   * File operations (read/write/edit)
   */
  FILE_OPERATIONS: DEFAULT_TIMEOUTS.COMPLEX_REQUEST,

  /**
   * System commands via Bash tool
   */
  SYSTEM_COMMANDS: DEFAULT_TIMEOUTS.TOOL_HEAVY_REQUEST,

  /**
   * Quick responses (yes/no, simple answers)
   */
  QUICK_RESPONSE: DEFAULT_TIMEOUTS.QUICK_REQUEST,
} as const;

export type OperationType = keyof typeof OPERATION_TIMEOUTS;