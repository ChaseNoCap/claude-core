import { describe, it, expect, beforeEach } from 'vitest';
import { ToolManager } from '../../src/implementations/ToolManager.js';
import type { Tool, ToolRestriction } from '../../src/types/options.js';

describe('ToolManager', () => {
  let toolManager: ToolManager;

  beforeEach(() => {
    toolManager = new ToolManager();
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
      };

      toolManager.registerTool(tool);
      expect(toolManager.getTool('test-tool')).toEqual(tool);
    });

    it('should overwrite existing tool with same name', () => {
      const tool1: Tool = {
        name: 'test-tool',
        description: 'First version',
      };

      const tool2: Tool = {
        name: 'test-tool',
        description: 'Second version',
      };

      toolManager.registerTool(tool1);
      toolManager.registerTool(tool2);

      expect(toolManager.getTool('test-tool')).toEqual(tool2);
    });
  });

  describe('unregisterTool', () => {
    it('should remove a registered tool', () => {
      const tool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
      };

      toolManager.registerTool(tool);
      toolManager.unregisterTool('test-tool');

      expect(toolManager.getTool('test-tool')).toBeUndefined();
    });

    it('should handle unregistering non-existent tool', () => {
      expect(() => toolManager.unregisterTool('non-existent')).not.toThrow();
    });
  });

  describe('getAllTools', () => {
    it('should return all registered tools', () => {
      const tools: Tool[] = [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
        { name: 'tool3', description: 'Tool 3' },
      ];

      tools.forEach((tool) => toolManager.registerTool(tool));

      const allTools = toolManager.getAllTools();
      expect(allTools).toHaveLength(3);
      expect(allTools).toEqual(expect.arrayContaining(tools));
    });

    it('should return empty array when no tools registered', () => {
      expect(toolManager.getAllTools()).toEqual([]);
    });
  });

  describe('applyRestrictions and getAvailableTools', () => {
    beforeEach(() => {
      const tools: Tool[] = [
        { name: 'read', description: 'Read tool' },
        { name: 'write', description: 'Write tool' },
        { name: 'execute', description: 'Execute tool' },
        { name: 'delete', description: 'Delete tool' },
      ];

      tools.forEach((tool) => toolManager.registerTool(tool));
    });

    it('should return all tools when no restrictions', () => {
      const availableTools = toolManager.getAvailableTools();
      expect(availableTools).toHaveLength(4);
    });

    it('should apply deny restrictions', () => {
      const restrictions: ToolRestriction[] = [{ type: 'deny', tools: ['delete', 'execute'] }];

      toolManager.applyRestrictions(restrictions);
      const availableTools = toolManager.getAvailableTools();

      expect(availableTools).toHaveLength(2);
      expect(availableTools.map((t) => t.name)).toEqual(['read', 'write']);
    });

    it('should apply allow restrictions', () => {
      const restrictions: ToolRestriction[] = [{ type: 'allow', tools: ['read', 'write'] }];

      toolManager.applyRestrictions(restrictions);
      const availableTools = toolManager.getAvailableTools();

      expect(availableTools).toHaveLength(2);
      expect(availableTools.map((t) => t.name)).toEqual(['read', 'write']);
    });

    it('should prioritize deny over allow', () => {
      const restrictions: ToolRestriction[] = [
        { type: 'allow', tools: ['read', 'write', 'execute'] },
        { type: 'deny', tools: ['execute'] },
      ];

      toolManager.applyRestrictions(restrictions);
      const availableTools = toolManager.getAvailableTools();

      expect(availableTools).toHaveLength(2);
      expect(availableTools.map((t) => t.name)).toEqual(['read', 'write']);
    });
  });

  describe('isToolAvailable', () => {
    beforeEach(() => {
      toolManager.registerTool({ name: 'read', description: 'Read tool' });
      toolManager.registerTool({ name: 'write', description: 'Write tool' });
    });

    it('should return true for available tool', () => {
      expect(toolManager.isToolAvailable('read')).toBe(true);
    });

    it('should return false for unavailable tool', () => {
      expect(toolManager.isToolAvailable('delete')).toBe(false);
    });

    it('should respect restrictions', () => {
      toolManager.applyRestrictions([{ type: 'deny', tools: ['write'] }]);

      expect(toolManager.isToolAvailable('read')).toBe(true);
      expect(toolManager.isToolAvailable('write')).toBe(false);
    });
  });

  describe('getCliFlags', () => {
    beforeEach(() => {
      const tools: Tool[] = [
        { name: 'read', description: 'Read tool' },
        { name: 'write', description: 'Write tool' },
        { name: 'execute', description: 'Execute tool' },
      ];

      tools.forEach((tool) => toolManager.registerTool(tool));
    });

    it('should return empty array when all tools available', () => {
      expect(toolManager.getCliFlags()).toEqual([]);
    });

    it('should return disallowed flags for restricted tools', () => {
      toolManager.applyRestrictions([{ type: 'deny', tools: ['write', 'execute'] }]);

      const flags = toolManager.getCliFlags();
      expect(flags).toEqual(['--disallowedTools', 'write,execute']);
    });

    it('should return allowed flags for tools in allow list', () => {
      toolManager.applyRestrictions([{ type: 'allow', tools: ['read'] }]);

      const flags = toolManager.getCliFlags();
      expect(flags).toEqual(['--allowedTools', 'read']);
    });
  });
});
