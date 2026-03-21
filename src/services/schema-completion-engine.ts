import * as vscode from 'vscode';
import { parseYamlTextAsync } from '../dsl/yaml-parse-async';
import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import { COMPONENT_PROPERTIES } from './completion-component-catalog';
import { CompletionAnalysisContext } from './completion-context-analyzer';

/**
 * 補完候補生成（descriptor / カタログ駆動）。
 *
 * `COMPONENT_DEFINITIONS` と `COMPONENT_PROPERTIES`（`completion-component-catalog`）が正本。
 * JSON Schema の AST や oneOf は参照しない。
 */
export class DescriptorCompletionEngine {
  private readonly completionItemKindFallback: Record<'Class' | 'Property' | 'Value' | 'Module' | 'Field', number> = {
    Class: 7,
    Property: 9,
    Value: 12,
    Module: 3,
    Field: 5
  };

  async parseYamlForSyntaxValidation(text: string): Promise<void> {
    await parseYamlTextAsync(text);
  }

  generateCompletionItemsFromDescriptors(context: CompletionAnalysisContext): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    switch (context.type) {
      case 'component-list':
        items.push(...this.getComponentCompletions());
        break;
      case 'component-properties':
        items.push(...this.getComponentPropertyCompletions(context.componentName, context.existingProperties));
        break;
      case 'property-value':
        items.push(...this.getPropertyValueCompletions(context.propertyName, context.componentName));
        break;
      case 'root-level':
        items.push(...this.getRootLevelCompletions(context.rootKeys));
        break;
    }

    return items;
  }

  getComponentCompletions(): vscode.CompletionItem[] {
    return COMPONENT_DEFINITIONS.map(def => {
      const componentName = def.name;
      const item = this.createCompletionItem(componentName, 'Class');
      item.detail = def.description || 'コンポーネント';
      item.insertText = `${componentName}:\n    `;
      item.sortText = `0${componentName}`;
      return item;
    });
  }

  getComponentPropertyCompletions(componentName?: string, existingProperties: Set<string> = new Set()): vscode.CompletionItem[] {
    if (!componentName) {return [];}

    const properties = this.getComponentProperties(componentName);
    const filteredProperties = properties.filter(prop => !existingProperties.has(prop.name));

    return filteredProperties.map(prop => {
      const item = this.createCompletionItem(prop.name, 'Property');
      item.detail = prop.description;
      item.insertText = `${prop.name}: `;
      item.sortText = `0${prop.name}`;
      return item;
    });
  }

  getPropertyValueCompletions(propertyName?: string, componentName?: string): vscode.CompletionItem[] {
    if (!propertyName || !componentName) {return [];}

    const values = this.getPropertyValues(propertyName, componentName);

    return values.map(val => {
      const item = this.createCompletionItem(val.value, 'Value');
      item.detail = val.description;
      item.insertText = val.value;
      item.sortText = `0${val.value}`;
      return item;
    });
  }

  getRootLevelCompletions(existingRootKeys: Set<string> = new Set()): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    if (existingRootKeys.has('page')) {
      return items;
    }

    const pageItem = this.createCompletionItem('page', 'Module');
    pageItem.detail = 'ページ定義';
    pageItem.insertText = 'page:\n  id: \n  title: \n  layout: vertical\n  components:\n    - ';
    pageItem.sortText = '0page';
    items.push(pageItem);

    return items;
  }

  getBasicCompletions(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    const basicItems = [
      { name: 'page', description: 'ページ定義' },
      { name: 'id', description: 'ID' },
      { name: 'title', description: 'タイトル' },
      { name: 'layout', description: 'レイアウト' },
      { name: 'components', description: 'コンポーネントリスト' }
    ];

    basicItems.forEach(item => {
      const completionItem = this.createCompletionItem(item.name, 'Field');
      completionItem.detail = item.description;
      completionItem.insertText = `${item.name}: `;
      items.push(completionItem);
    });

    return items;
  }

  private getComponentProperties(componentName: string): Array<{ name: string; description: string }> {
    return (COMPONENT_PROPERTIES[componentName] || []).map(({ name, description }) => ({
      name,
      description
    }));
  }

  private getPropertyValues(propertyName: string, componentName: string): Array<{ value: string; description: string }> {
    const matchedProperty = (COMPONENT_PROPERTIES[componentName] || []).find(
      property => property.name === propertyName
    );
    return matchedProperty?.values || [];
  }

  private getCompletionItemKind(kind: 'Class' | 'Property' | 'Value' | 'Module' | 'Field'): number {
    const completionItemKind = (vscode as unknown as { CompletionItemKind?: Record<string, number> }).CompletionItemKind;
    if (completionItemKind && typeof completionItemKind[kind] === 'number') {
      return completionItemKind[kind];
    }
    return this.completionItemKindFallback[kind];
  }

  private createCompletionItem(
    label: string,
    kind: 'Class' | 'Property' | 'Value' | 'Module' | 'Field'
  ): vscode.CompletionItem {
    const completionCtor = (vscode as { CompletionItem?: unknown }).CompletionItem;
    const resolvedKind = this.getCompletionItemKind(kind);
    if (typeof completionCtor === 'function') {
      return new vscode.CompletionItem(label, resolvedKind as vscode.CompletionItemKind);
    }
    return {
      label,
      kind: resolvedKind,
      detail: '',
      insertText: '',
      sortText: ''
    } as unknown as vscode.CompletionItem;
  }
}

/**
 * @deprecated 互換名。新規コードは {@link DescriptorCompletionEngine} を参照。
 */
export const SchemaCompletionEngine = DescriptorCompletionEngine;
