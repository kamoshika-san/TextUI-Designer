# v2 比較ロジック設計 H: V2SemanticDiffProvider 実装アーキテクチャ

設計フェーズ成果物。コード実装は含まない。
前提: 設計A〜G 完了済み。`SemanticDiffProvider` interface は `src/core/diff/diff-provider.ts` で確定済み。

---

## 論点H-1: compareStructureDiff シグネチャの扱い

**決定: 既存の `compareStructureDiff(prev, next, policy?)` シグネチャをそのまま使う。v2 専用メソッドは追加しない。**

根拠:
- `SemanticDiffProvider` interface は v1/v2 の swap seam として設計されており（T-016 で確定）、
  シグネチャを変えると全呼び出し元（TextUICoreEngine / build-three-way-diff / flow-normalizer）の変更が必要になる。
- v2 の比較ロジック（A〜G で設計した全ルール）は `compareStructureDiff` の **実装** として組み込む。
  呼び出し元から見えるシグネチャは変わらない。
- `policy?: HeuristicPolicy` パラメータは v2 では無視する（v2 は heuristic なし — 設計C-1 で確定）。

```typescript
// V2SemanticDiffProvider の位置付け
class V2SemanticDiffProvider implements SemanticDiffProvider {
  compareStructureDiff(prev, next, policy?): DiffCompareResult {
    // policy を無視し、v2 ロジック（A〜G）を実行
    // 戻り値は DiffCompareResult（詳細は H-2 で規定）
  }
}
```

---

## 論点H-2: V2SemanticDiffProvider の戻り値型

**決定: `DiffCompareResult`（v1 型）を返す。`SemanticDiffProvider` interface を拡張しない。**

根拠:
- interface を拡張（`compareStructureDiffV2(): V2Result` を追加）すると、
  v1 実装（`V1SemanticDiffProvider`）が新メソッドに対応しなければならず、
  swap seam の目的（impl を差し替えるだけでよい）が崩れる。
- v2 の `V2ScreenDiff[]`（設計A〜G で設計した型）は `DiffCompareResult` の
  `metadata` または `events` フィールドに JSON として収録する方式で対応する。
- 将来的に v2 型を first-class にする場合は interface 拡張ではなく、
  別の `V2DiffCompareResult` 型を返す新 interface を定義し段階的に移行する。

### `DiffCompareResult` への v2 データの収録方法

```typescript
// DiffCompareResult に v2 結果を拡張フィールドで付与
interface DiffCompareResult {
  // ... 既存フィールド（v1 互換）
  v2?: {
    screens: V2ScreenDiff[];
    metadata: {
      schemaVersion: 'v2-compare-logic/v0';
      totalRecords: number;
    };
  };
}
```

> **注**: `DiffCompareResult` 型への `v2?` フィールド追加は別チケットとして起票する。
> 現行型に存在しないフィールドを追加するため、型変更チケットが必要。

---

## V2SemanticDiffProvider の全体構造（擬似コード）

```typescript
class V2SemanticDiffProvider implements SemanticDiffProvider {
  // H-1: 既存シグネチャを維持
  compareStructureDiff(
    previous: DiffCompareDocument,
    next: DiffCompareDocument,
    _policy?: HeuristicPolicy  // v2 では無視
  ): DiffCompareResult {
    const screens = this.compareAllScreens(previous, next);
    // H-2: v2 結果を DiffCompareResult.v2 に収録
    return {
      ...buildV1CompatibleResult(previous, next),
      v2: {
        screens,
        metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: countRecords(screens) }
      }
    };
  }

  private compareAllScreens(previous, next): V2ScreenDiff[] {
    // 設計A: Screen レベル走査
    // 設計B: Entity 同一性判定
    // 設計C: Component 同一性判定
    // 設計D: 5軸差分検出
    // 設計E: confidence スコアリング
    // 設計F: evidence 生成
    // 設計G: sort order 適用
  }
}
```

---

## 実装チケット化の推奨順序

| 順序 | 内容 | 依存 |
|---|---|---|
| 1 | `DiffCompareResult` 型に `v2?` フィールド追加 | 型変更チケット |
| 2 | `V2SemanticDiffProvider` クラス skeleton 作成 | 1 |
| 3 | compareScreen / compareEntity / compareComponent 実装 | 2、設計A〜C |
| 4 | 5軸差分検出・confidence・evidence 実装 | 3、設計D〜F |
| 5 | sort order 適用・統合テスト | 4、設計G |

---

## 依存関係

| 前提 |
|---|
| 設計A〜G: 全比較ロジック確定 |
| src/core/diff/diff-provider.ts: SemanticDiffProvider interface (compareStructureDiff シグネチャ) |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計H*
