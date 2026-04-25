import * as vscode from 'vscode';
import type {
  CompletionContextLike,
  CompletionItemLike,
  CompletionListLike,
  ICompletionProvider,
  PositionLike,
  TextDocumentLike,
  UriLike
} from '../types';

function isCompletionListLike(value: unknown): value is CompletionListLike<CompletionItemLike> {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items);
}

/**
 * Host-neutral completion provider を VS Code の CompletionItemProvider へ適合させる。
 */
export function toVscodeCompletionItemProvider(provider: ICompletionProvider): vscode.CompletionItemProvider<vscode.CompletionItem> {
  return {
    provideCompletionItems: async (document, position, token, context) => {
      const result = await provider.provideCompletionItems(
        document,
        position,
        token,
        context as CompletionContextLike
      );

      if (Array.isArray(result)) {
        return result as unknown as vscode.CompletionItem[];
      }

      if (isCompletionListLike(result)) {
        if (typeof vscode.CompletionList === 'function') {
          return new vscode.CompletionList(result.items as unknown as vscode.CompletionItem[], result.isIncomplete ?? false);
        }
        return {
          items: result.items as unknown as vscode.CompletionItem[],
          isIncomplete: result.isIncomplete ?? false
        } as vscode.CompletionList<vscode.CompletionItem>;
      }

      return [];
    }
  };
}

export function asVscodeTextDocument(document: TextDocumentLike): vscode.TextDocument {
  return document as vscode.TextDocument;
}

export function asVscodePosition(position: PositionLike): vscode.Position {
  return position as vscode.Position;
}

export function asVscodeCompletionContext(context: CompletionContextLike): vscode.CompletionContext {
  return context as vscode.CompletionContext;
}

export function asVscodeUri(uri: UriLike): vscode.Uri {
  return uri as vscode.Uri;
}
