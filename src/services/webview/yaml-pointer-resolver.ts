import * as vscode from 'vscode';
import * as YAML from 'yaml';

export class YamlPointerResolver {
  resolvePosition(document: vscode.TextDocument, pointer: string): vscode.Position | null {
    const normalizedPointer = pointer.startsWith('/') ? pointer : `/${pointer}`;
    if (normalizedPointer === '/') {
      return this.createPosition(0, 0);
    }

    try {
      const yamlDocument = YAML.parseDocument(document.getText(), {
        prettyErrors: false
      });
      const rootNode = yamlDocument.contents as unknown;
      const segments = normalizedPointer
        .split('/')
        .slice(1)
        .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

      const node = this.resolveNodeByPointer(rootNode, segments);
      const offset = this.extractNodeStartOffset(node);
      if (offset === null) {
        return null;
      }
      const fromDocument = document.positionAt(offset);
      return this.createPosition(fromDocument.line, fromDocument.character);
    } catch (error) {
      console.warn('[YamlPointerResolver] YAML pointer解決に失敗しました:', error);
      return null;
    }
  }

  private resolveNodeByPointer(rootNode: unknown, segments: string[]): unknown {
    let currentNode: unknown = rootNode;

    for (const segment of segments) {
      if (this.isYamlMapNode(currentNode)) {
        const pair = currentNode.items.find(item => this.readYamlKey(item?.key) === segment);
        if (!pair) {
          return null;
        }
        currentNode = pair.value;
        continue;
      }

      if (this.isYamlSeqNode(currentNode)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= currentNode.items.length) {
          return null;
        }
        currentNode = currentNode.items[index];
        continue;
      }

      return null;
    }

    return currentNode;
  }

  private extractNodeStartOffset(node: unknown): number | null {
    if (!node || typeof node !== 'object') {
      return null;
    }
    const range = (node as { range?: unknown }).range;
    if (!Array.isArray(range) || typeof range[0] !== 'number') {
      return null;
    }
    return range[0];
  }

  private readYamlKey(keyNode: unknown): string | null {
    if (!keyNode || typeof keyNode !== 'object') {
      return null;
    }
    const value = (keyNode as { value?: unknown }).value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  }

  private isYamlMapNode(node: unknown): node is { items: Array<{ key?: unknown; value?: unknown }> } {
    if (!node || typeof node !== 'object') {
      return false;
    }
    const items = (node as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return false;
    }
    if (items.length === 0) {
      return false;
    }
    const firstItem = items[0];
    return Boolean(firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'value' in firstItem);
  }

  private isYamlSeqNode(node: unknown): node is { items: unknown[] } {
    if (!node || typeof node !== 'object') {
      return false;
    }
    const items = (node as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      return false;
    }
    if (items.length === 0) {
      return true;
    }
    const firstItem = items[0];
    return !(firstItem && typeof firstItem === 'object' && 'key' in firstItem && 'value' in firstItem);
  }

  private createPosition(line: number, character: number): vscode.Position {
    return typeof (vscode as { Position?: unknown }).Position === 'function'
      ? new vscode.Position(line, character)
      : ({ line, character } as unknown as vscode.Position);
  }
}
