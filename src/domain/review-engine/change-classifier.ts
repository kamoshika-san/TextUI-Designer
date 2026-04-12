/**
 * Review Engine — Change Classifier
 * T-RE3-001 / T-RE3-002
 *
 * SemanticChange を layout / style / content / behavior の 4 分類に振り分ける。
 *
 * 分類ルール（changeType × DSL フィールドのマッピング）:
 *
 * | changeType       | classType  | 根拠                                      |
 * |------------------|------------|-------------------------------------------|
 * | UpdateLayout     | layout     | padding/margin/width/height 等の配置変更  |
 * | UpdateStyle      | style      | color/font/border 等の見た目変更          |
 * | UpdateCondition  | behavior   | 表示条件・visibility 変更                 |
 * | UpdateEvent      | behavior   | onClick 等のイベント・遷移先変更          |
 * | UpdateBinding    | behavior   | API バインディング変更                    |
 * | UpdateProps      | content    | デフォルト（テキスト・ラベル等）          |
 * | AddComponent     | content    | 構造変更はコンテンツ追加として扱う        |
 * | RemoveComponent  | content    | 構造変更はコンテンツ削除として扱う        |
 * | MoveComponent    | layout     | 位置・順序変更はレイアウト変更として扱う  |
 */

import type { SemanticChange } from '../../types/semantic-diff';
import type { Change } from './diff-ir';

export type ClassType = 'layout' | 'style' | 'content' | 'behavior';

const CHANGE_TYPE_TO_CLASS: Record<SemanticChange['type'], ClassType> = {
  UpdateLayout:    'layout',
  MoveComponent:   'layout',
  UpdateStyle:     'style',
  UpdateCondition: 'behavior',
  UpdateEvent:     'behavior',
  UpdateBinding:   'behavior',
  UpdateProps:     'content',
  AddComponent:    'content',
  RemoveComponent: 'content',
};

/**
 * SemanticChange の type から ClassType を返す。
 * 未知の type は 'content' にフォールバックする。
 */
export function classifySemanticChangeType(type: SemanticChange['type']): ClassType {
  return CHANGE_TYPE_TO_CLASS[type] ?? 'content';
}

/**
 * Change の metadata.classType を付与して返す（元の Change は変更しない）。
 */
export function classifyChange(change: Change): Change {
  return {
    ...change,
    metadata: {
      ...change.metadata,
      classType: classifySemanticChangeType(change.type)
    }
  };
}

/**
 * Change 配列を一括分類して返す。
 */
export function classifyChanges(changes: Change[]): Change[] {
  return changes.map(classifyChange);
}
