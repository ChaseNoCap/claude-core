import { describe, it, expect, beforeEach } from 'vitest';
import { OutputParser } from '../../src/utils/output-parser.js';
import type { ToolUse } from '../../src/types/options.js';

describe('OutputParser', () => {
  let parser: OutputParser;

  beforeEach(() => {
    parser = new OutputParser();
  });

  describe('append', () => {
    it('should append chunks to buffer', () => {
      parser.append('Hello ');
      parser.append('World');

      expect(parser.getBuffer()).toBe('Hello World');
    });

    it('should limit buffer size', () => {
      const smallParser = new OutputParser(10);
      smallParser.append('12345');
      smallParser.append('67890');
      smallParser.append('ABC');

      // Buffer should keep the last 10 characters: "4567890ABC"
      expect(smallParser.getBuffer()).toBe('4567890ABC');
    });
  });

  describe('parseToolUses', () => {
    it('should parse single tool use', () => {
      const toolUseXml = `
        Some text before
        <tool_use>
          <tool_name>calculator</tool_name>
          <parameters>{"operation": "add", "a": 5, "b": 3}</parameters>
        </tool_use>
        Some text after
      `;

      parser.append(toolUseXml);
      const toolUses = parser.parseToolUses();

      expect(toolUses).toHaveLength(1);
      expect(toolUses[0]?.toolName).toBe('calculator');
      expect(toolUses[0]?.parameters).toEqual({
        operation: 'add',
        a: 5,
        b: 3,
      });
    });

    it('should parse multiple tool uses', () => {
      const toolUseXml = `
        <tool_use>
          <tool_name>read_file</tool_name>
          <parameters>{"path": "/tmp/test.txt"}</parameters>
        </tool_use>
        Some intermediate text
        <tool_use>
          <tool_name>write_file</tool_name>
          <parameters>{"path": "/tmp/output.txt", "content": "Hello"}</parameters>
        </tool_use>
      `;

      parser.append(toolUseXml);
      const toolUses = parser.parseToolUses();

      expect(toolUses).toHaveLength(2);
      expect(toolUses[0]?.toolName).toBe('read_file');
      expect(toolUses[1]?.toolName).toBe('write_file');
    });

    it('should handle malformed tool use', () => {
      const malformedXml = `
        <tool_use>
          <tool_name>test</tool_name>
          <parameters>invalid json</parameters>
        </tool_use>
      `;

      parser.append(malformedXml);
      const toolUses = parser.parseToolUses();

      expect(toolUses).toHaveLength(0);
    });

    it('should handle incomplete tool use', () => {
      const incompleteXml = `
        <tool_use>
          <tool_name>test</tool_name>
        </tool_use>
      `;

      parser.append(incompleteXml);
      const toolUses = parser.parseToolUses();

      expect(toolUses).toHaveLength(0);
    });
  });

  describe('extractContent', () => {
    it('should extract content without tool uses', () => {
      const content = 'This is some regular content without any tool uses.';
      parser.append(content);

      expect(parser.extractContent()).toBe(content);
    });

    it('should remove tool uses from content', () => {
      const mixedContent = `
        Before tool use
        <tool_use>
          <tool_name>test</tool_name>
          <parameters>{}</parameters>
        </tool_use>
        After tool use
      `;

      parser.append(mixedContent);
      const extracted = parser.extractContent();

      expect(extracted).not.toContain('<tool_use>');
      expect(extracted).toContain('Before tool use');
      expect(extracted).toContain('After tool use');
    });

    it('should handle multiple tool uses', () => {
      const content = `
        Start
        <tool_use><tool_name>tool1</tool_name><parameters>{}</parameters></tool_use>
        Middle
        <tool_use><tool_name>tool2</tool_name><parameters>{}</parameters></tool_use>
        End
      `;

      parser.append(content);
      const extracted = parser.extractContent();

      expect(extracted).not.toContain('<tool_use>');
      expect(extracted).toContain('Start');
      expect(extracted).toContain('Middle');
      expect(extracted).toContain('End');
    });
  });

  describe('clear', () => {
    it('should clear the buffer', () => {
      parser.append('Some content');
      expect(parser.getBuffer()).not.toBe('');

      parser.clear();
      expect(parser.getBuffer()).toBe('');
    });
  });

  describe('integration', () => {
    it('should handle realistic Claude output', () => {
      const claudeOutput = `
        I'll help you with that calculation.

        <tool_use>
          <tool_name>calculator</tool_name>
          <parameters>{"operation": "multiply", "a": 12, "b": 7}</parameters>
        </tool_use>

        The result of 12 × 7 is 84.

        <tool_use>
          <tool_name>write_file</tool_name>
          <parameters>{"path": "result.txt", "content": "12 × 7 = 84"}</parameters>
        </tool_use>

        I've saved the result to result.txt.
      `;

      parser.append(claudeOutput);

      const toolUses = parser.parseToolUses();
      expect(toolUses).toHaveLength(2);
      expect(toolUses[0]?.toolName).toBe('calculator');
      expect(toolUses[1]?.toolName).toBe('write_file');

      const content = parser.extractContent();
      expect(content).toContain("I'll help you with that calculation");
      expect(content).toContain('The result of 12 × 7 is 84');
      expect(content).toContain("I've saved the result to result.txt");
      expect(content).not.toContain('<tool_use>');
    });
  });
});
