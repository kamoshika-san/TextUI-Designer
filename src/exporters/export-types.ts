import type { TextUIDSL } from '../domain/dsl-types';

export interface ExportOptions {
  format: string;
  outputPath?: string;
  fileName?: string;
  themePath?: string;
  sourcePath?: string;
  /**
   * HTML 出力のレンダリング経路。
   * - **省略 / true（既定）**: `HtmlExporter` の **primary** — React 静的レンダー（`react-static-export`）＋ WebView 系 CSS。Export / プレビュー系と揃える。
   * - **false**: **fallback** — `BaseComponentRenderer` 系の文字列レンダー（テスト・capture 等で明示的に指定）。primary と挙動差がありうるため、バグ修正は通常 primary 側を先に確認する。
   */
  useReactRender?: boolean;
  /** 拡張ルートパス。指定時は WebView の CSS（media/assets/index-*.css）をこのパス基準で解決する */
  extensionPath?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}
