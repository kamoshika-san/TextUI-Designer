# DSL `$include` の解決経路（WebView と CLI / Export / Capture のパリティ）

## 目的

`$include` によるテンプレート合成は、**プレビュー（WebView）だけでなく**、CLI・HTML エクスポート・プレビュー画像キャプチャでも同じ意味になる必要があります。本稿では、実装上の**正本と入口**を列挙し、変更時の影響範囲を把握しやすくします。

## 展開ルールの正本

| 経路 | 実装 | 備考 |
|------|------|------|
| WebView プレビュー | `src/services/webview/yaml-parser.ts` の `YamlIncludeResolver` | 非同期・`fetch` 相当の読み込み |
| CLI / Export / Capture / その他 Node 同期読み | `src/dsl/yaml-include-resolver-sync.ts` の `YamlIncludeResolverSync` | `fs.readFileSync` ベース |
| 上記同期版の共通エントリ | `src/dsl/load-dsl-with-includes.ts` の `loadDslWithIncludesFromPath()` | **Node 側で DSL を読むときの推奨入口** |

同期版は WebView 版と**同じアルゴリズム**（配列内の `$include` フラット化、オブジェクトの再帰、`{{ $params.xxx }}` 置換、循環検出）を意図しています。挙動を変える場合は **両方を揃えて**レビューしてください。

## 各機能からの参照関係

1. **CLI の DSL 読み込み**  
   - `src/cli/io.ts` の `loadDslFromFile()` → `loadDslWithIncludesFromPath()`  
   - `validate` / `export` / `capture` / `plan` / `apply` など、`loadDslFromFile` を経由する処理はすべて展開後の DSL を扱います。

2. **プレビューキャプチャ（HTML 準備）**  
   - `src/utils/preview-capture/html-preparation.ts` の `parseDslFile()` → `loadDslWithIncludesFromPath()`  
   - キャプチャ用に生成する HTML 組み立てと整合させるため、CLI と同じローダを使います。

3. **検証（`validate` コマンド等）**  
   - `src/cli/command-support-shared.ts` の `validateAcrossFiles()` は、`loadDslFromFile` が **展開時に失敗**（循環参照・テンプレート欠落など）した場合にエラー issue を返します。  
   - 展開に成功したあとは、従来どおり `validateDsl()` の結果のみを集約します（未展開ツリー用の別検証は不要）。

## 変更時のチェックリスト

- [ ] `YamlIncludeResolver` と `YamlIncludeResolverSync` の挙動差がないか（最低限、代表サンプル `sample/03-include/` で確認）
- [ ] `npm run compile` と `npm test` が通ること
- [ ] 本ドキュメントおよび `docs/current/operations/MAINTAINER_GUIDE.md` の表記が入口と一致していること

## 関連ファイル

- `src/dsl/load-dsl-with-includes.ts`
- `src/dsl/yaml-include-resolver-sync.ts`
- `src/services/webview/yaml-parser.ts`（`YamlIncludeResolver`）
- `src/cli/io.ts`
- `src/utils/preview-capture/html-preparation.ts`
- `src/cli/command-support-shared.ts`
