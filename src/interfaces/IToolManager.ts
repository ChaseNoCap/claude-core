import type { Tool, ToolRestriction } from '../types/options.js';

export interface IToolManager {
  registerTool(tool: Tool): void;
  unregisterTool(toolName: string): void;
  getTool(toolName: string): Tool | undefined;
  getAllTools(): Tool[];
  applyRestrictions(restrictions: ToolRestriction[]): void;
  getAvailableTools(): Tool[];
  isToolAvailable(toolName: string): boolean;
  getCliFlags(): string[];
}
