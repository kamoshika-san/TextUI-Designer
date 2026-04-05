/**
 * Visual Diff 表示モデル
 *
 * WebView（Slice 2）が受け取る差分ツリーの型定義。
 * 構造 Diff IR（DiffResult / ComponentDiff）を変換して生成する。
 * WebView 実装・CSS・React コンポーネントはこのファイルに含まない。
 */

export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface VisualDiffNode {
  /** DSL コンポーネントの kind (e.g. "button", "text") */
  kind: string;
  /** 表示ラベル — kind + props の代表値から生成 */
  label: string;
  /** 変更種別 */
  changeType: ChangeType;
  /** ネスト構造（将来の子コンポーネント対応。現 Phase では常に空配列） */
  children: VisualDiffNode[];
}

export interface VisualDiffResult {
  /** ルートレベルの差分ノード一覧（DSL components 配列に対応） */
  nodes: VisualDiffNode[];
  /** 変更ありか否か（unchanged のみなら false） */
  hasChanges: boolean;
}
