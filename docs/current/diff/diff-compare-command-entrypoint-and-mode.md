# Diff Compare Command — Entrypoint と Mode Contract

このドキュメントは `textui compare` コマンドの起動経路と出力モードの責務境界を定義する。
設計目的: Epic C (DiffCompareResult) と Epic E (external JSON schema) の result contract と衝突しない command boundary を確立する。

---

## 1. Command Entrypoint 一覧

`textui compare` は起動経路によって入力ソースと出力先が異なる。以下の 3 経路を認める。

### 1-1. local compare

```bash
textui compare --before <file-or-dir> --after <file-or-dir> [--mode <mode>] [--output <file>]
```

- **入力**: ローカルファイルシステム上の 2 つの DSL ファイルまたはディレクトリ
- **用途**: 開発中のスナップショット比較、手動確認
- **デフォルト mode**: `human-readable`
- **制約**: `--before` / `--after` は両方必須

### 1-2. CI compare

```bash
textui compare --ci --base <ref> --head <ref> [--mode <mode>] [--output <file>]
```

- **入力**: git ref (ブランチ名 / コミット SHA) から DSL ファイルを解決する
- **用途**: CI パイプライン上での自動比較 (exit code で pass/fail を判定)
- **デフォルト mode**: `machine-readable`
- **制約**: git リポジトリ内で実行すること。`--base` / `--head` は両方必須
- **exit code ルール**:
  - `0`: s0-minor のみ、または diff なし
  - `1`: s1-notice 以上が 1 件以上
  - `2`: s3-critical が 1 件以上

### 1-3. PR-triggered compare

```bash
textui compare --pr --pr-payload <json-file> [--mode <mode>] [--output <file>]
```

- **入力**: PR イベント payload JSON (base SHA / head SHA を含む)
- **用途**: GitHub Actions などの PR webhook から呼び出し、review-oriented サマリを生成する
- **デフォルト mode**: `review-oriented`
- **制約**: `--pr-payload` は PR base / head のコミット SHA を含む JSON であること

---

## 2. Output Mode 定義

| mode | 主な消費者 | 出力形式 | Epic 対応 |
|------|----------|---------|----------|
| `human-readable` | 開発者 (ターミナル) | テキスト / Markdown | D2-3 narrative |
| `machine-readable` | CI / スクリプト | JSON (E1 external schema) | Epic E |
| `review-oriented` | Reviewer / PR コメント | Markdown summary | D2-3 narrative + D3 |

### 2-1. human-readable

- D2-3 の grouped narrative を markdown または plain text で出力する。
- severity ラベル (`s0-minor` / `s1-notice` / `s2-review` / `s3-critical`) を人間が読みやすい prefix に変換する。
- ターミナル出力は stdout。`--output` 指定時はファイルに書き出す。

### 2-2. machine-readable

- E1 external JSON schema に準拠した JSON を出力する。
- `DiffCompareResult` の生データではなく、E1-1 で定義する schema バージョンを持つ外部向け形式とする。
- パイプライン連携のため、stderr には出力しない。エラーのみ stderr に書く。

### 2-3. review-oriented

- D2-3 narrative + D3 presentation を組み合わせた reviewer 向け Markdown を出力する。
- PR コメントに貼り付けられるサイズ感 (< 4000 chars) を目安とする。
- `groupHint` ベースのセクション分割 (structure / behavior / presentation / ambiguity) を採用する。

---

## 3. Mode 切り替え条件

- `--mode` フラグが明示された場合はそちらを優先する。
- フラグ未指定の場合は起動経路のデフォルト mode を使用する (§1 参照)。
- 起動経路と mode の組み合わせはすべて許容する。ただし以下の警告を出す:
  - CI + `human-readable`: stderr に "WARNING: human-readable mode does not set exit code" を出力する。
  - local + `review-oriented`: stderr に "WARNING: review-oriented mode is intended for PR workflows" を出力する。

---

## 4. Epic C / E との境界

### Epic C (DiffCompareResult) との関係

- `DiffCompareResult` は **内部 result 型** であり、command の出力 boundary は超えない。
- `machine-readable` mode の JSON output は Epic E の external schema に射影した別形式とする。
- `human-readable` / `review-oriented` mode は D2-3 narrative を経由して出力する。

### Epic E (external JSON schema) との関係

- `machine-readable` mode の出力 shape は E1-1 (T-173) で定義する schema に従う。
- G1-1 は E1-1 の schema 設計が確定するまで `machine-readable` の output shape を hardcode しない。
- G1-1 が定義するのは **command boundary** のみ。serialization (E1-2) と projection (E1-3) は E1 sprint が担う。

---

## 5. 未解決事項 / 将来拡張

- `--pr-payload` の JSON 仕様は PR-triggered 経路が実装されるまでに別途定義する。
- D3 (presentation layer) が実装されるまでは `review-oriented` の出力は D2-3 narrative のみでよい。
- Interactive mode (逐次確認) は本スコープ外。G2 以降で検討する。
