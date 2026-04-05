/**
 * Overlay Diff Viewer の型定義。
 *
 * Extension → WebView 間のメッセージと、
 * React コンポーネントが保持するオーバーレイ比較の状態を定義する。
 */

import type { TextUIDSL } from '../dsl-types';
import type { SemanticSummaryResult } from '../../core/textui-semantic-diff-summary';

/** overlay-diff-init メッセージのペイロード（Extension → WebView） */
export interface OverlayDiffInitMessage {
  type: 'overlay-diff-init';
  dslA: TextUIDSL;
  fileNameA: string;
  dslB: TextUIDSL;
  fileNameB: string;
  /** D4 semantic one-line summaries. Present when diff computation succeeded. */
  semanticSummary?: SemanticSummaryResult;
}

/** OverlayDiffViewer コンポーネントが保持する状態 */
export interface OverlayDiffState {
  dslA: TextUIDSL;
  fileNameA: string;
  dslB: TextUIDSL;
  fileNameB: string;
  /** D4 semantic one-line summaries. Present when diff computation succeeded. */
  semanticSummary?: SemanticSummaryResult;
}
