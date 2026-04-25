/**
 * Host-neutral contract surface used by service interfaces.
 * VS Code / Obsidian adapters should convert concrete host objects to these shapes.
 */
export interface DisposableLike {
  dispose(): void;
}

export interface UriLike {
  toString(): string;
  fsPath?: string;
}

export interface TextDocumentLike {
  uri: UriLike;
  fileName: string;
  getText(range?: unknown): string;
}

export interface PositionLike {
  line: number;
  character: number;
}

export interface CancellationTokenLike {
  isCancellationRequested: boolean;
}

export interface CompletionContextLike {
  triggerKind?: number;
  triggerCharacter?: string;
}

export interface CompletionItemLike {
  label: unknown;
  kind?: unknown;
  detail?: string;
  insertText?: unknown;
}

export interface CompletionListLike<TItem = CompletionItemLike> {
  items: TItem[];
  isIncomplete?: boolean;
}

export interface ConfigurationChangeEventLike {
  affectsConfiguration(section: string): boolean;
}

export interface WebviewLike {
  postMessage(message: unknown): PromiseLike<boolean>;
}

export interface WebviewPanelLike {
  readonly webview: WebviewLike;
  reveal(viewColumn?: unknown, preserveFocus?: boolean): void;
  dispose(): void;
}
