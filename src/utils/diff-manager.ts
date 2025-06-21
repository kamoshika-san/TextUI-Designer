import type { TextUIDSL, ComponentDef } from '../renderer/types';

export interface DiffResult {
  hasChanges: boolean;
  changedComponents: number[];
  addedComponents: number[];
  removedComponents: number[];
  modifiedComponents: number[];
}

export interface ComponentDiff {
  index: number;
  type: 'added' | 'removed' | 'modified';
  oldValue?: ComponentDef;
  newValue?: ComponentDef;
}

/**
 * DSLの差分を検出し、効率的な更新を管理するクラス
 */
export class DiffManager {
  private lastDSL: TextUIDSL | null = null;
  private lastHash: string | null = null;

  /**
   * 文字列のハッシュを生成
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * DSLのハッシュを生成
   */
  private generateDSLHash(dsl: TextUIDSL): string {
    return this.hashString(JSON.stringify(dsl));
  }

  /**
   * コンポーネントの差分を検出
   */
  computeDiff(newDSL: TextUIDSL): DiffResult {
    const newHash = this.generateDSLHash(newDSL);
    
    // 初回実行またはハッシュが同じ場合は変更なし
    if (!this.lastDSL || this.lastHash === newHash) {
      this.lastDSL = newDSL;
      this.lastHash = newHash;
      return {
        hasChanges: false,
        changedComponents: [],
        addedComponents: [],
        removedComponents: [],
        modifiedComponents: []
      };
    }

    const oldComponents = this.lastDSL.page?.components || [];
    const newComponents = newDSL.page?.components || [];
    
    const result = this.compareComponents(oldComponents, newComponents);
    
    // 状態を更新
    this.lastDSL = newDSL;
    this.lastHash = newHash;
    
    return result;
  }

  /**
   * コンポーネント配列を比較
   */
  private compareComponents(oldComponents: ComponentDef[], newComponents: ComponentDef[]): DiffResult {
    const changedComponents: number[] = [];
    const addedComponents: number[] = [];
    const removedComponents: number[] = [];
    const modifiedComponents: number[] = [];

    const maxLength = Math.max(oldComponents.length, newComponents.length);

    for (let i = 0; i < maxLength; i++) {
      const oldComponent = oldComponents[i];
      const newComponent = newComponents[i];

      if (!oldComponent && newComponent) {
        // 新しく追加されたコンポーネント
        addedComponents.push(i);
        changedComponents.push(i);
      } else if (oldComponent && !newComponent) {
        // 削除されたコンポーネント
        removedComponents.push(i);
        changedComponents.push(i);
      } else if (oldComponent && newComponent) {
        // 既存コンポーネントの変更チェック
        if (this.hasComponentChanged(oldComponent, newComponent)) {
          modifiedComponents.push(i);
          changedComponents.push(i);
        }
      }
    }

    return {
      hasChanges: changedComponents.length > 0,
      changedComponents,
      addedComponents,
      removedComponents,
      modifiedComponents
    };
  }

  /**
   * 個別コンポーネントの変更を検出
   */
  private hasComponentChanged(oldComp: ComponentDef, newComp: ComponentDef): boolean {
    const oldKeys = Object.keys(oldComp);
    const newKeys = Object.keys(newComp);

    // キーの数が異なる場合は変更あり
    if (oldKeys.length !== newKeys.length) {
      return true;
    }

    // キーが異なる場合は変更あり
    if (!oldKeys.every(key => newKeys.includes(key))) {
      return true;
    }

    // 各キーの値を比較
    for (const key of oldKeys) {
      const oldValue = (oldComp as any)[key];
      const newValue = (newComp as any)[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 特定のコンポーネントインデックスが変更されているかチェック
   */
  isComponentChanged(index: number, diffResult: DiffResult): boolean {
    return diffResult.changedComponents.includes(index);
  }

  /**
   * 変更されたコンポーネントの詳細情報を取得
   */
  getComponentDiff(index: number, oldComponents: ComponentDef[], newComponents: ComponentDef[]): ComponentDiff | null {
    const oldComponent = oldComponents[index];
    const newComponent = newComponents[index];

    if (!oldComponent && newComponent) {
      return {
        index,
        type: 'added',
        newValue: newComponent
      };
    }

    if (oldComponent && !newComponent) {
      return {
        index,
        type: 'removed',
        oldValue: oldComponent
      };
    }

    if (oldComponent && newComponent && this.hasComponentChanged(oldComponent, newComponent)) {
      return {
        index,
        type: 'modified',
        oldValue: oldComponent,
        newValue: newComponent
      };
    }

    return null;
  }

  /**
   * 差分結果をリセット
   */
  reset(): void {
    this.lastDSL = null;
    this.lastHash = null;
  }

  /**
   * 差分統計を取得
   */
  getDiffStats(diffResult: DiffResult): {
    totalChanges: number;
    changeRate: number;
    efficiency: number;
  } {
    const totalComponents = this.lastDSL?.page?.components?.length || 0;
    const totalChanges = diffResult.changedComponents.length;
    const changeRate = totalComponents > 0 ? (totalChanges / totalComponents) * 100 : 0;
    const efficiency = totalComponents > 0 ? ((totalComponents - totalChanges) / totalComponents) * 100 : 100;

    return {
      totalChanges,
      changeRate,
      efficiency
    };
  }
} 