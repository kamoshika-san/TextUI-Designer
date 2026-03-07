# TextUI CLI 仕様書（ドラフト v0.1 / 1ページ）

## 目的
TextUI DSL を **宣言的・差分検出・冪等適用・状態管理・CI統合** 可能な運用基盤として扱うための最小CLI仕様を定義する。

---

## コマンド一覧

```bash
textui validate [--file <path>|--dir <path>] [--format yaml|json] [--strict] [--json]
textui plan     [--file <path>|--dir <path>] [--state .textui/state.json] [--out plan.json] [--json]
textui apply    [--file <path>|--dir <path>] [--state .textui/state.json] [--provider html|react|pug|vue|svelte] [--token-on-error error|warn|ignore] [--auto-approve] [--json]
textui export   [--file <path>] [--provider html|react|pug|vue|svelte] [--token-on-error error|warn|ignore] [--output <path>] [--deterministic] [--json]
textui import   openapi --input <openapi.(yml|yaml|json)> [--operation <operationId>] [--output generated/from-openapi.tui.yml] [--json]
textui state    show|pull|push|rm [--state .textui/state.json] [--json]
textui version
```

### 1) `validate`
- 役割: DSL構文 + JSON Schema + セマンティック検証。
- 主な検証項目:
  - YAML/JSONパースエラー
  - 必須プロパティ/型不整合
  - 未知コンポーネント、循環include、重複ID
- 出力:
  - human readable（デフォルト）
  - `--json` で機械可読（CI向け）

### 2) `plan`
- 役割: 現在DSLとstate比較から差分を算出。
- 差分種別:
  - `+` 作成、`~` 更新、`-` 削除
- 例:
  - `+ Button[id=submit-primary]`
  - `~ Input[id=email] (type: text -> email)`
  - `- LegacyComponent[id=legacy-banner]`
- `--out` 指定時は plan artifact を保存（PRコメント連携想定）。

### 3) `apply`
- 役割: planを実行し、生成物とstateを更新。
- 動作:
  1. validate実行
  2. plan算出
  3. 確認プロンプト（`--auto-approve`で省略）
  4. provider出力生成
  5. state更新（atomic write）

### 4) `export`
- 役割: 単体ファイルのコード生成（state非依存の簡易モード）。
- 特徴:
  - `--deterministic` 有効時、キー順・改行・属性順を固定
  - providerごとに同一入力で同一出力を保証

### 5) `state`
- `show`: state内容の表示
- `pull`: ファイルからstate読込（標準出力へ）
- `push`: 標準入力/ファイルからstate上書き
- `rm`: 特定resourceをstateから削除

### 6) `import openapi`
- 役割: OpenAPI仕様（requestBody / parameters）から TextUI DSL を生成。
- 特徴:
  - `$ref`（ローカル参照）を解決
  - 型マッピング（`email/password/number/boolean/enum`）
  - `--operation` で特定 operationId を指定可能
  - 生成DSLは `validate / plan / apply / export` にそのまま接続可能

---

## Exit Code 仕様（全コマンド共通）

| code | 意味 |
|---:|---|
| 0 | 成功（差分なし含む） |
| 1 | 実行失敗（I/O, 例外, provider実行エラー） |
| 2 | 検証失敗（validateエラー） |
| 3 | 差分あり（`plan`専用、CIで「変更検知」に利用） |
| 4 | 競合/ロック失敗（state同時更新競合） |

> CI推奨運用: `textui validate` は 0/2 を品質ゲート、`textui plan` は 0/3 で差分通知。

---

## State Schema（v1）

```json
{
  "$schema": "https://textui.dev/schemas/state-v1.json",
  "version": 1,
  "dsl": {
    "entry": "sample/01-basic/sample.tui.yml",
    "hash": "sha256:...",
    "updatedAt": "2026-03-01T12:00:00.000Z"
  },
  "provider": {
    "name": "react",
    "version": "1.0.0"
  },
  "resources": [
    {
      "id": "Input:email",
      "type": "Input",
      "path": "page.components[3]",
      "hash": "sha256:..."
    }
  ],
  "artifacts": [
    {
      "file": "generated/App.tsx",
      "hash": "sha256:...",
      "size": 12345
    }
  ],
  "meta": {
    "cliVersion": "0.1.0",
    "lastApply": "2026-03-01T12:00:00.000Z"
  }
}
```

### 設計原則（v1）
- **最小責務**: stateは「再現に必要な最小情報」のみ保持。
- **前方互換**: `version` で移行管理、未知フィールドは無視可能。
- **衝突耐性**: apply時に楽観ロック（hash比較）を行う。
- **可搬性**: パスは相対パス優先、環境依存値を避ける。

---

## 非機能要件（MVP）
- 決定論的生成（同入力/同provider/同version => 同出力）
- 実行時間目標: `validate` < 1s（中規模DSL）
- JSON出力は安定キー順（CI差分最小化）

