# Diff Panel（WebView）— semantic diff v2 対応 仕様（Wave 0）

- **ステータス**: Wave 0（**ドキュメントのみ**。実装・型追加・postMessage 配線は Wave 1〜）  
- **更新**: 2026-04-19  
- **配置**: **`docs/future/semantic/`** — WebView v2 は未実装の先行仕様のため、`docs/future/types/v2` および本フォルダの compare-logic 設計（A〜H）と同一ライフサイクルで管理する（`docs/current/diff` は現行の正規化・IR 等の契約向け）。  
- **関連コード（参照のみ）**: `src/services/webview/diff-webview-deliver.ts`、`src/renderer/use-webview-messages.ts`  
- **v2 型正本（参照のみ）**: `docs/future/types/v2/diff-record.ts`、`docs/future/types/v2/dsl-structure.ts`、設計 A〜H（`v2-compare-logic-*.md`）、[`semantic-meaning-core-ontology-v0-ja.md`](semantic-meaning-core-ontology-v0-ja.md)  

---

## 1. P0 要約（プロダクト／PM バックログとの整合）

以下を **Wave 0 の前提**とする（詳細は各ファイル参照）。

| ID | 決定 |
|----|------|
| P0-IA | MVP の UI 階層は **`Screen → Entity → Component → diffs[]`** のツリー。v2 正本の読み順と一致させる。フラット一覧＋フィルタは後続オプション。 |
| P0-COEX | 同一 WebView 内で **タブ切替**：**構造（現行 Visual Diff v1）** と **意味（semantic v2）** を分離。v2 のみ MVP は採用しない。 |
| P0-MSG | **新 postMessage type** を推奨し、既存 `diff-update` の契約を壊さない。Wave 0 では **`diff-update-v2`** をメッセージ type 名の **正**とする（PM スプリント仮名と一致。将来リネームする場合は本書と `diff-webview-deliver` を同時更新）。 |

**参照（タスク／プロダクト側）**

- PdM 一方針: `TextUI-Designer-Doc/Tasks/Inbox-PdM/2026-04-19_product-diff-panel-v2-p0.md`  
- PM バックログ（論点表・Wave 境界）: `TextUI-Designer-Doc/Tasks/Inbox-PM/diff-panel-webview-v2-spec.md`  

---

## 2. 現行（v1）Extension ↔ WebView 契約

Extension 側の配信は **`DiffUpdateMessage`** として固定されている。

- **type**: `'diff-update'`（リテラル）  
- **payload**: `{ type: 'diff-update', diff: VisualDiffResult }`  
- **根拠**: `deliverDiffPayload` が `postMessage` に渡すオブジェクト形状（`diff-webview-deliver.ts`）。  
- **受信**: WebView 側は `case 'diff-update':` で分岐（`use-webview-messages.ts`）。  

**Wave 0 の約束**: `diff-update` の意味・フィールドを **変更しない**。v2 用は **別 type** で並走する。

---

## 3. 新 type `diff-update-v2`（案）

### 3.1 目的

- v1 構造差分（`VisualDiffResult`）と **semantic v2 の比較結果**を **メッセージ境界で分離**する。  
- ペイロードの **バージョン境界**を明確にし、後方互換とロールバックを容易にする。  

### 3.2 メッセージ形（JSON 例）

実体の型名は Wave 1 で `src/domain/diff/` に **`VisualDiffV2Result` 等**として導入予定。Wave 0 では **論理フィールド**のみ固定する。

```json
{
  "type": "diff-update-v2",
  "schemaVersion": 1,
  "payload": {
    "screens": [
      {
        "screenId": "screen_main",
        "entities": [
          {
            "entityId": "entity_orders",
            "components": [
              {
                "componentId": "cmp_submit",
                "diffs": [
                  {
                    "decision": {
                      "confidence_band": "high",
                      "diff_event": "component_action_changed",
                      "target_id": "cmp_submit#action",
                      "confidence": 0.92
                    },
                    "explanation": {
                      "evidence": [],
                      "before_predicate": null,
                      "after_predicate": null
                    }
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "meta": {
      "compareRunId": "optional-correlation-id"
    }
  }
}
```

- **`schemaVersion`**: メッセージ自体の互換バージョン（整数）。破壊的変更時にインクリメント。  
- **`payload.screens[]`**: P0-IA に従い **ツリー**（Screen → Entity → Component → `diffs[]`）。各 `diffs[]` 要素は v2 正本の **`V2DiffRecord`**（`decision` + `explanation`）に **用語・意味で 1:1** になるよう Wave 1 で型を接続する。  
- **`meta`**: 任意。相関 ID や生成時刻など、UI が必要なら Wave 1 以降で拡張。  

### 3.3 既存 `diff-update` との併存

| 観点 | 方針 |
|------|------|
| 送信順 | 同一フレームで両方送る必要はない。**タブ表示中のモード**に応じて Extension が **どちらか一方**を送る運用を既定とする（両方キャッシュする設計は Wave 1 で検討可）。 |
| 受信側 | `switch (message.type)` に **`diff-update-v2`** 分岐を **追加**する。`diff-update` 分岐は現状維持。 |
| 型安全 | Wave 0 は仕様のみ。Wave 1 で `VisualDiffV2Result` と mapper を **WebView 非依存**層に置く（PM バックログ Wave 1）。  

---

## 4. IA（ワイヤ — 箇条書き）

- **タブバー**（同一 WebView 上部）  
  - **「構造」**: 現行 Visual Diff（`diff-update` / `VisualDiffResult`）のツリー・バッジ。既存レビュー導線を維持。  
  - **「意味」**: v2 ツリー（本書 §5）。`diff-update-v2` で受け取った `payload` を表示。  
- **初期表示**: 既定は **「構造」**（既存ユーザー混乱を避ける）。v2 タブ選択時に初回 `diff-update-v2` を要求する **遅延ロード**でもよい（実装は Wave 2）。  
- **空状態**: v2 データ未生成時は「意味」タブにプレースホルダ（文言は Wave 2 / i18n）。  
- **Out-of-scope（設計 A）**: `V2ScreenDiffOutOfScope` と in-scope 空は **同一 UI にしない**（PdM 前提）。具体文言・色分けは **P1-OOS** で PM+Dev が確定。  

---

## 5. ツリー読み順（MVP）

ユーザーが **一貫した順で走査**できるよう、表示順は次の深さ優先とする。

1. **Screen**（画面単位）  
2. **Entity**（画面内の論理ブロック）  
3. **Component**（UI 部品）  
4. **`diffs[]`**（当該コンポーネントに紐づく v2 レコード列）  

v2 正本（`dsl-structure.ts` / `diff-record.ts`）の **用語と齟齬が出ない**よう Wave 1 の ViewModel 名を本節に逆参照で固定する。

---

## 6. P1 論点（OPEN / TBD）

Wave 0 では **決定しない**。Wave 1 以降のオーナー候補を併記する。

| ID | 状態 | 内容（要約） | オーナー候補（次工程） |
|----|------|--------------|------------------------|
| P1-OOS | **OPEN** | out-of-scope と in-scope 空の **UI 差**（同一表示禁止） | PM + Developer |
| P1-AXIS | **OPEN** | 12 `diff_event` と 5 軸グループの **主分類軸**・ontology 対応表 | PM + PdM（必要なら）+ Developer |
| P1-DEC | **OPEN** | `decision` / `explanation` の **提示方法**（タブ vs アコーディオン、低信頼時の色・順序） | PM + Developer |
| P1-REV | **OPEN** | `review_status` を WebView から **編集可能**にするか、**読取のみ**か | PM（法務・ワークフロー含む）+ Developer |

---

## 7. Wave 1 境界（一文）

Wave 1 では **`VisualDiffV2Result`（仮）** および **正規化済み v2 比較結果 → 上記 payload 木**への **純関数 mapper** を `src/domain/diff/` に置き、**WebView・postMessage には触れない**（PM バックログ Wave 1 と一致）。

---

## PM 追記用: 正本パス

マージ後、`Inbox-PM/diff-panel-webview-v2-spec.md` の Wave 0 行に次を追記すること。

`docs/future/semantic/webview-semantic-diff-v2-panel-spec.md`
