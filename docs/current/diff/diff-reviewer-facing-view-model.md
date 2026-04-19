# Diff Reviewer-Facing View-Model

このドキュメントは reviewer が structural diff result と semantic summary を読むための
view-model の責務境界を定義する。

raw `DiffCompareResult` をそのまま reviewer に露出しない。
本 view-model は D2-1 output (`DiffReviewImpact`) と D2-3 narrative を入力とし、
G1-1 の `review-oriented` mode が返す Markdown / 構造化データの直接ソースとなる。

---

## 1. レイヤー分離

```
DiffCompareResult            ← Epic C (内部型。外部 boundary を超えない)
       ↓
DiffReviewImpact[]           ← D2-1: event → impact classification
       ↓
DiffReviewImpact + hook      ← D2-2: applySummaryRule による refinement
       ↓
DiffReviewerGroup[]          ← D2-3: narrative grouping (本 view-model の入力)
       ↓
DiffReviewerViewModel        ← G1-2 が定義する reviewer 向け view-model
       ↓
review-oriented output       ← G1-1 mode が消費する presentation 入力
```

`DiffCompareResult` と `DiffReviewerViewModel` の間にある変換レイヤーは
それぞれのエピックが所有する。G1-2 は `DiffReviewerViewModel` の shape と
責務を定義するのみで変換ロジックは実装しない。

---

## 2. DiffReviewerGroup — grouping 単位

D2-3 が組み立てた grouping を受け取る。G1-2 はこの shape を消費する side として定義する。

```ts
interface DiffReviewerGroup {
  /** grouping axis (D2-1 impactAxis から D2-3 が決定) */
  axis: DiffSummaryImpactAxis;          // 'structure' | 'behavior' | 'presentation' | 'ambiguity' | ...
  /** このグループの最高 severity */
  highestSeverity: DiffSummarySeverity; // 's0-minor' | 's1-notice' | 's2-review' | 's3-critical'
  /** グループに属する impact items */
  items: DiffReviewerItem[];
  /** D2-3 が生成した narrative テキスト (Markdown) */
  narrative: string;
}
```

---

## 3. DiffReviewerItem — evidence slot の最小 shape

1 つの `DiffReviewImpact` に対応する reviewer 向け表示単位。

```ts
interface DiffReviewerItem {
  /** D2-1 の eventId をそのまま保持 (traceability) */
  eventId: string;
  /** D2-1 summary category */
  category: DiffSummaryCategory;
  /** D2-1 severity */
  severity: DiffSummarySeverity;
  /** D2-1 summaryKey (formatter がメッセージテンプレートを引く key) */
  summaryKey: string;
  /** evidence: previous / next の sourceRef (存在する場合のみ) */
  evidence: DiffReviewerEvidence;
  /** D2-1 ruleTrace (デバッグ / 開発者向け; reviewer UI では折り畳み表示) */
  ruleTrace: string;
  /** heuristic 由来かどうか (reviewer に不確実性を伝える) */
  heuristicDerived: boolean;
  /** ambiguity marker (s3-critical のハイライト判定に使用) */
  ambiguityMarker: boolean;
}
```

---

## 4. DiffReviewerEvidence — sourceRef と extension hook の見せ方

raw `DiffTracePayload` を reviewer 向けに射影した shape。
`DiffSourceRef` の `documentPath` + `entityPath` をそのまま露出する。

```ts
interface DiffReviewerEvidence {
  /** previous 側の参照 (存在する場合) */
  previous?: {
    documentPath?: string;
    entityPath: string;
  };
  /** next 側の参照 (存在する場合) */
  next?: {
    documentPath?: string;
    entityPath: string;
  };
  /**
   * extension hook context のサマリ (D2-2 が適用した場合のみ)。
   * どの hook カテゴリ (permission/state/transition/event) が refinement を
   * トリガーしたかを文字列で保持する。詳細は D2-2 ruleTrace を参照。
   */
  hookSummary?: string;
}
```

---

## 5. DiffReviewerViewModel — トップレベル shape

```ts
interface DiffReviewerViewModel {
  kind: 'diff-reviewer-view-model';
  /** グループ一覧 (D2-3 grouping 順を保持) */
  groups: DiffReviewerGroup[];
  /** 全体サマリ */
  summary: {
    totalEvents: number;
    highestSeverity: DiffSummarySeverity | null;
    containsAmbiguity: boolean;
    containsHeuristic: boolean;
    /** severity 別カウント */
    severityBreakdown: Record<DiffSummarySeverity, number>;
  };
  /** view-model のバージョン (将来の schema migration 用) */
  schemaVersion: 'reviewer-vm/v0';
}
```

---

## 6. 責務境界サマリ

| レイヤー | 所有エピック | 責務 |
|---------|------------|------|
| `DiffCompareResult` | Epic C | 内部 diff 結果。外部非公開 |
| `DiffReviewImpact[]` | D2-1 | 1イベント→1インパクト分類 |
| hook refinement | D2-2 | extension hook による severity/category 上書き |
| `DiffReviewerGroup[]` | D2-3 | narrative 組み立てと grouping |
| `DiffReviewerViewModel` | **G1-2 (本ドキュメント)** | reviewer が読む view-model。presentation への入力 |
| Markdown / review-oriented output | D3 / G1-1 | presentation 出力。view-model を消費する |

---

## 7. 未解決事項

- `DiffReviewerGroup.narrative` の Markdown テンプレートは D2-3 が決定する。G1-2 は shape のみを定義。
- `hookSummary` の文字列フォーマットは D2-2 ruleTrace の実装に依存する。D2-3 review 後に確定。
- G1-3 (sourceRef jump と evidence navigation 方針) は `DiffReviewerEvidence.previous/next` の
  クリック / jump 先解決を担う。G1-2 は参照フィールドを保持するが jump ロジックは実装しない。
