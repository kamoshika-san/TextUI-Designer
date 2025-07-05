import * as vscode from 'vscode';

export interface CompletionContext {
  type: 'component-list' | 'component-properties' | 'property-value' | 'root-level';
  componentName?: string;
  propertyName?: string;
  indentLevel: number;
}

/**
 * 補完コンテキスト解析器
 * YAMLの構造を解析して適切な補完タイプを決定
 */
export class CompletionContextAnalyzer {
  /**
   * コンテキストを解析
   */
  analyze(linePrefix: string, position: vscode.Position): CompletionContext {
    const lines = linePrefix.split('\n');
    const currentLine = lines[lines.length - 1];
    const indentLevel = this.getIndentLevel(currentLine);

    // ハイフンの後（コンポーネントリスト）
    if (this.isComponentListContext(currentLine)) {
      return { type: 'component-list', indentLevel };
    }

    // ルートレベル
    if (indentLevel === 0) {
      return { type: 'root-level', indentLevel };
    }

    // プロパティ値の行
    const propertyMatch = this.matchPropertyLine(currentLine);
    if (propertyMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { 
          type: 'property-value', 
          propertyName: propertyMatch.propertyName, 
          componentName, 
          indentLevel 
        };
      }
    }

    // コンポーネント名の行
    const componentMatch = this.matchComponentLine(currentLine);
    if (componentMatch) {
      const parentComponent = this.findParentComponent(lines, lines.length - 1);
      if (parentComponent) {
        return { 
          type: 'property-value', 
          propertyName: componentMatch.componentName, 
          componentName: parentComponent, 
          indentLevel 
        };
      } else {
        return { 
          type: 'component-properties', 
          componentName: componentMatch.componentName, 
          indentLevel 
        };
      }
    }

    // 親コンポーネントのプロパティ入力中
    const componentName = this.findParentComponent(lines, lines.length - 1);
    if (componentName) {
      return { type: 'component-properties', componentName, indentLevel };
    }

    return { type: 'root-level', indentLevel };
  }

  private isComponentListContext(line: string): boolean {
    return line.trim().endsWith('-') || line.trim() === '-';
  }

  private matchPropertyLine(line: string): { propertyName: string } | null {
    const match = line.match(/^\s*(\w+):\s*(.*)$/);
    return match ? { propertyName: match[1] } : null;
  }

  private matchComponentLine(line: string): { componentName: string } | null {
    const match = line.match(/^-?\s*(\w+):\s*$/);
    return match ? { componentName: match[1] } : null;
  }

  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private findParentComponent(lines: string[], currentIndex: number): string | undefined {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() === '') continue;
      
      const match = line.match(/^\s*-?\s*(\w+):\s*$/);
      if (match && match[1] !== 'components' && match[1] !== 'page') {
        return match[1];
      }
    }
    return undefined;
  }
} 