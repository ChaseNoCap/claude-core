import type { ToolUse } from '../types/options.js';

export class OutputParser {
  private buffer: string = '';
  private readonly bufferSize: number;

  constructor(bufferSize: number = 1024 * 1024) {
    this.bufferSize = bufferSize;
  }

  append(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > this.bufferSize) {
      this.buffer = this.buffer.slice(-this.bufferSize);
    }
  }

  parseToolUses(): ToolUse[] {
    const toolUses: ToolUse[] = [];
    const toolUseRegex = /<tool_use>([\s\S]*?)<\/tool_use>/g;
    let match;

    while ((match = toolUseRegex.exec(this.buffer)) !== null) {
      try {
        const content = match[1];
        const toolNameMatch = content.match(/<tool_name>(.*?)<\/tool_name>/);
        const parametersMatch = content.match(/<parameters>([\s\S]*?)<\/parameters>/);

        if (toolNameMatch && parametersMatch) {
          const toolUse: ToolUse = {
            toolName: toolNameMatch[1]!.trim(),
            parameters: JSON.parse(parametersMatch[1]!.trim()),
            timestamp: new Date(),
          };
          toolUses.push(toolUse);
        }
      } catch (error) {
        // Silently ignore malformed tool uses
        // The test expects this to not throw
      }
    }

    return toolUses;
  }

  extractContent(): string {
    const contentWithoutToolUses = this.buffer.replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '');
    return contentWithoutToolUses.trim();
  }

  clear(): void {
    this.buffer = '';
  }

  getBuffer(): string {
    return this.buffer;
  }
}
