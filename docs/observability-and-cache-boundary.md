# 観測・キャッシュと公開 API の境界（横断方針）

ロードマップ **フェーズ 4** の宣言用ドキュメント。**実装の詳細や Export 固有の整理は別ページ**に寄せ、ここでは **「何を呼び出し側が知らなくてよいか」**だけを固定する。

## 方針

**パフォーマンス観測**と**キャッシュ**は、それぞれの**責務を持つモジュールの内側**に閉じる。上位の呼び出し（コマンド、ファサード、CLI）は **安定した公開面**（メソッドの入出力契約・ユーザー向け設定）にだけ依存し、**ヒット／ミスの分岐・メトリクス用ガード・内部 TTL・キー設計**にまで手を伸ばさない。

これは **観測を本流から読み分ける**という、instrumentation 境界整理（チケット T-20260321-041）の精神と矛盾しない。実装・用語の正本は [export-instrumentation.md](export-instrumentation.md)。**ExportManager 周辺の観測と最適化の方針**は [export-manager-separation-policy.md](export-manager-separation-policy.md) を正とする（本ページは **横断の宣言**に留める）。

## 呼び出し側が知る必要がないこと（例）

- キャッシュエントリのキー構成・無効化の細部
- キャッシュヒット時に **観測用の no-op 呼び出しを省略するか**といった実装最適化
- メトリクス記録の有効条件（設定フラグの組み合わせ）の内部実装
- WebView 用と Exporter 用など、**別インスタンスのキャッシュ**の内部状態

## 呼び出し側が知るべきこと（最小）

- **どのサービスが**キャッシュや観測を**所有するか**（取り違えないこと）— 実務上の入口は [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md) のクイックスタート表
- ユーザー／運用が触る **設定キー**（例: パフォーマンスログの opt-in）— 詳細は各境界ガイドおよび [export-instrumentation.md](export-instrumentation.md) の設定表

## 関連ドキュメント

| ページ | 役割 |
|--------|------|
| [export-instrumentation.md](export-instrumentation.md) | Export / プレビューにおける **観測と本流**の区分 |
| [export-manager-separation-policy.md](export-manager-separation-policy.md) | Export の **観測と最適化**の方針（Export 固有） |
| [export-diff-metrics-naming.md](export-diff-metrics-naming.md) | diff / metrics 語の整理メモ（将来リネーム用） |
| [PERFORMANCE_MONITORING_GUIDE.md](PERFORMANCE_MONITORING_GUIDE.md) | パフォーマンス機能の利用者向け説明 |
