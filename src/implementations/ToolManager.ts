import { injectable } from 'inversify';
import type { IToolManager } from '../interfaces/IToolManager.js';
import type { Tool, ToolRestriction } from '../types/options.js';

@injectable()
export class ToolManager implements IToolManager {
  private tools: Map<string, Tool> = new Map();
  private restrictions: ToolRestriction[] = [];

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(toolName: string): void {
    this.tools.delete(toolName);
  }

  getTool(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  applyRestrictions(restrictions: ToolRestriction[]): void {
    this.restrictions = restrictions;
  }

  getAvailableTools(): Tool[] {
    const allTools = this.getAllTools();

    if (this.restrictions.length === 0) {
      return allTools;
    }

    const allowedTools = new Set<string>();
    const deniedTools = new Set<string>();

    for (const restriction of this.restrictions) {
      if (restriction.type === 'allow') {
        restriction.tools.forEach((tool) => allowedTools.add(tool));
      } else {
        restriction.tools.forEach((tool) => deniedTools.add(tool));
      }
    }

    return allTools.filter((tool) => {
      if (deniedTools.has(tool.name)) {
        return false;
      }
      if (allowedTools.size > 0) {
        return allowedTools.has(tool.name);
      }
      return true;
    });
  }

  isToolAvailable(toolName: string): boolean {
    return this.getAvailableTools().some((tool) => tool.name === toolName);
  }

  getCliFlags(): string[] {
    const flags: string[] = [];
    const availableTools = this.getAvailableTools();
    const allTools = this.getAllTools();

    const disabledTools = allTools.filter(
      (tool) => !availableTools.some((available) => available.name === tool.name),
    );

    for (const tool of disabledTools) {
      flags.push('--disable-tool', tool.name);
    }

    return flags;
  }
}
