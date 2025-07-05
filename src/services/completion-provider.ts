import * as vscode from 'vscode';
import { ISchemaManager } from '../types';
import { OptimizedCompletionProvider } from './completion/optimized-completion-provider';

/**
 * 補完プロバイダー（最適化版に委譲）
 * YAML/JSONファイルのIntelliSense機能を提供
 */
export class TextUICompletionProvider implements vscode.CompletionItemProvider {
  private optimizedProvider: OptimizedCompletionProvider;

  constructor(schemaManager: ISchemaManager) {
    this.optimizedProvider = new OptimizedCompletionProvider(schemaManager);
  }

  /**
   * 補完を提供
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    return this.optimizedProvider.provideCompletionItems(document, position, token, context);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.optimizedProvider.clearCache();
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return this.optimizedProvider.getCacheStats();
  }
} 