# repo root 配置ルール（軽量版）

このドキュメントは、`repo root` の探索ノイズを減らし、正式な入口と一時検証物を分離するための最小ルールを定義する。

## 目的

- 新規参入者や AI が `repo root` を見たときに誤誘導されない状態を維持する。
- 一時検証物の置き場所を明示し、意図しないコミットを防ぐ。

## `repo root` 直下に置くもの

- プロジェクトの正式入口（例: `README.md`, `package.json`, `tsconfig.json`）
- 全体設定・メタデータ（例: `LICENSE`, `CHANGELOG.md`）
- 全体ディレクトリ（例: `src/`, `tests/`, `docs/`, `scripts/`）

## `repo root` 直下に置かないもの

- 単発の検証スクリプト（`tmp-*.js`, `test-*.js` など）
- 手元確認用の一時設定ファイル（`test-*.json` など）
- 生成物やローカル専用アーティファクト

## 一時検証物の置き場所

- 再利用する実験スクリプト: `scripts/experimental/`
- テスト専用の入力データ・固定サンプル: `tests/fixtures/`
- 継続利用しない検証物: 削除（履歴は Git で追跡する）

## 運用メモ

- `repo root` に ad hoc な検証ファイルを追加しない。
- 検証で必要なファイルを残す場合は、用途を README / docs で説明できる状態にする。
