import type { TextUIDSL } from '../renderer/types';

export interface ExportOptions {
  format: string;
  outputPath?: string;
  fileName?: string;
  themePath?: string;
  sourcePath?: string;
  /** false のときは最初から文字列レンダーでエクスポート（デフォルトは true＝React を試行） */
  useReactRender?: boolean;
  /** 拡張ルートパス。指定時は WebView の CSS（media/assets/index-*.css）をこのパス基準で解決する */
  extensionPath?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}
