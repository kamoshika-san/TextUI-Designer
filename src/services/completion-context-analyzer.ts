import * as vscode from 'vscode';

export type CompletionAnalysisContext = {
  type: 'component-list' | 'component-properties' | 'property-value' | 'root-level';
  componentName?: string;
  propertyName?: string;
  existingProperties?: Set<string>;
  rootKeys?: Set<string>;
};

export class CompletionContextAnalyzer {
  buildCompletionRequestContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext,
    createPosition: (line: number, character: number) => vscode.Position
  ): {
    text: string;
    linePrefix: string;
    currentWord: string;
    isTemplate: boolean;
    cacheKey: string;
  } {
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(createPosition(position.line, 0)), document.offsetAt(position));
    const currentWord = this.getCurrentWord(linePrefix);
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    const cacheKey = this.generateCacheKey(document, position, context, isTemplate, createPosition);
    return { text, linePrefix, currentWord, isTemplate, cacheKey };
  }

  generateCacheKey(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext,
    isTemplate: boolean,
    createPosition: (line: number, character: number) => vscode.Position
  ): string {
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(createPosition(position.line, 0)), document.offsetAt(position));
    const triggerChar = context.triggerCharacter || '';

    return `${document.uri.toString()}:${position.line}:${position.character}:${isTemplate}:${triggerChar}:${linePrefix}`;
  }

  analyzeContext(linePrefix: string, _position: vscode.Position): CompletionAnalysisContext {
    const lines = linePrefix.split('\n');
    const currentLine = lines[lines.length - 1];
    const indentLevel = this.getIndentLevel(currentLine);
    const contextMeta = this.collectContextMeta(lines, lines.length - 1, indentLevel);

    if (currentLine.trim().endsWith('-') || currentLine.trim() === '-') {
      return { type: 'component-list' };
    }

    if (indentLevel === 0) {
      return { type: 'root-level', rootKeys: contextMeta.rootKeys };
    }

    const propertyMatch = currentLine.match(/^\s*(\w+):\s*(.*)$/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName, componentName, existingProperties: contextMeta.existingProperties };
      }
    }

    const componentMatch = currentLine.match(/^-?\s*(\w+):\s*$/);
    if (componentMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return {
          type: 'property-value',
          propertyName: componentMatch[1],
          componentName,
          existingProperties: contextMeta.existingProperties
        };
      }
      return {
        type: 'component-properties',
        componentName: componentMatch[1],
        existingProperties: contextMeta.existingProperties
      };
    }

    const componentName = this.findParentComponent(lines, lines.length - 1);
    if (componentName) {
      return { type: 'component-properties', componentName, existingProperties: contextMeta.existingProperties };
    }

    return { type: 'root-level', rootKeys: contextMeta.rootKeys };
  }

  collectContextMeta(
    lines: string[],
    currentIndex: number,
    currentIndent: number
  ): { existingProperties: Set<string>; rootKeys: Set<string> } {
    const existingProperties = new Set<string>();
    const rootKeys = new Set<string>();

    for (let i = 0; i < currentIndex; i++) {
      const line = lines[i];
      const propertyMatch = line.match(/^\s*(?:-\s*)?(\w+):/);
      if (!propertyMatch) {continue;}

      const key = propertyMatch[1];
      const indent = this.getIndentLevel(line);

      if (indent === 0) {
        rootKeys.add(key);
      }

      if (indent === currentIndent) {
        existingProperties.add(key);
      }
    }

    return { existingProperties, rootKeys };
  }

  getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  findParentComponent(lines: string[], currentIndex: number): string | undefined {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() === '') {continue;}
      const match = line.match(/^\s*-?\s*(\w+):\s*$/);
      if (match && match[1] !== 'components' && match[1] !== 'page') {
        return match[1];
      }
    }
    return undefined;
  }

  getCurrentWord(linePrefix: string): string {
    const words = linePrefix.trim().split(/\s+/);
    return words[words.length - 1] || '';
  }
}
