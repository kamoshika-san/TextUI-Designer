# ADR 0001: DocumentAnalysisService の導入（初稿）

## ステータス

**提案（Proposed）** — 実装は別チケット。外部アーキ Phase 4 の意図合意用。

## コンテキスト

現状、少なくとも次の経路で **YAML/JSON の parse・スキーマ・キャッシュ**が重複しうる。

- プレビュー用 `YamlParser`（WebView 経路）
- 診断用 `DiagnosticValidationEngine` 等
- 補完用の schema / cache ロード

これにより、**同一ドキュメントでも画面ごとに解釈差**（valid/invalid の不一致、エラー表現差、include / normalize のズレ）が生じうる。

## 決定（初稿）

**`DocumentAnalysisService`（仮称）** を、テキスト 1 本分の解析〜検証入力までを束ねる **単一の上流境界**として新設する方向を採用する（詳細 API は実装チケットで確定）。

## 責務（パイプライン上の段階）

次を **一連の責務**としてこのサービスに集約する想定とする。

1. **read text** — エディタ／ワークスペースからの生テキスト取得（呼び出し元は薄く保つ）
2. **parse YAML/JSON** — 構文レベルのパース
3. **include resolve** — `$include` 等の展開・解決（プロジェクト方針に従う）
4. **normalized DSL 生成** — 下流が期待する形への正規化
5. **schema kind 判定** — テンプレ／テーマ／通常 UI 等の種別
6. **schema validation** — Ajv 等による検証
7. **diagnostics 入力化** — エディタ診断・補完が再利用できる結果形式へ

**Ajv / schema cache** は診断専用に閉じず、**document analysis レイヤで共有**する方向を目指す。補完は **分析結果の再利用**に寄せ、自前の重複ロードを減らす。

## T-042（DSL include の CLI / Export / Capture パリティ）との関係

T-042 は **CLI・Export・Capture** 経路で **`$include` 解決の挙動を揃える**ことを完了させた。本 ADR の `DocumentAnalysisService` は、**エディタ上のプレビュー・診断・補完**など「同一ファイルを複数機能が読む」領域で、**parse / include / validate を単一の上流に寄せる**ための構想である。

つまり T-042 は **バッチ／エクスポート系のパリティ**、本サービスは **IDE 内の一貫したドキュメント解釈**を主眼とし、**正規化・解決済み DSL** を下流（プレビュー送信、診断コレクション、補完エンジン）へ渡すことで、**別経路ごとの subtle なズレ**を減らす。両者は対立せず、**include 解決のルール**を共有する前提で設計する（実装時は共通化可能なモジュールの抽出を検討する）。

## 結果

### プラス

- preview / diagnostics / completion の **解釈差の縮小**
- schema cache・検証ロジックの **重複削減**
- 新機能追加時の **触る場所の明確化**

### マイナス / リスク

- 既存 3 経路の **段階的な寄せ道**が必要で、移行コストが大きい
- サービス境界が肥大化すると **新たな god object** になりうる → 内部を段階的に分割する前提で設計レビューを行う

## 関連

- チーム運用ルール（解析の一本化）: [../external-arch-team-rules.md](../external-arch-team-rules.md)
