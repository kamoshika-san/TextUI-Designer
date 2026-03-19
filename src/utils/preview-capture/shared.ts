import { Buffer } from 'buffer';

export interface PreviewCaptureOptions {
  outputPath: string;
  themePath?: string;
  /** DSL ファイルパス（themePath 未指定時に同階層の textui-theme.yml を参照するために使用） */
  dslFilePath?: string;
  /** 拡張ルートパス。指定時は WebView と同一 CSS をキャプチャ用 HTML に使用 */
  extensionPath?: string;
  width?: number;
  height?: number;
  scale?: number;
  waitMs?: number;
  browserPath?: string;
  allowNoSandbox?: boolean;
  /** デバッグ用。拡張から呼ぶときに渡すと CLI spawn などの状況が出力される */
  log?: (message: string) => void;
  /** false のとき HTML は文字列レンダラーのみ（CLI で react が無い環境向け） */
  useReactRender?: boolean;
  /** 指定時は CLI spawn にこのパスを使う（開発時にワークスペースの CLI を優先） */
  cliSpawnPath?: string;
  /** true のとき themePath を WebView 適用中テーマのみとし、同階層の textui-theme.yml にはフォールバックしない */
  useWebViewTheme?: boolean;
}

export interface PreviewCaptureResult {
  outputPath: string;
  browserPath: string;
  width: number;
  height: number;
}

export interface CaptureExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type CaptureLog = (message: string) => void;

export const DEFAULT_WIDTH = 1280;
export const DEFAULT_HEIGHT = 720;
export const DEFAULT_SCALE = 1;
export const DEFAULT_WAIT_MS = 3000;
export const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
export const THEME_FILENAMES = ['textui-theme.yml', 'textui-theme.yaml'];

export function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

