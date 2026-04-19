# Runtime Inspection Boundary

`RuntimeInspectionService` まわりの責務を短く固定するページです。対象は **performance / memory の観測コマンド**で、Export や WebView の本流設計そのものは含みません。

## 役割分担

| レイヤ | 役割 | 主なファイル |
|---|---|---|
| service | パフォーマンス/メモリ観測コマンドの実処理 | `src/services/runtime-inspection-service.ts` |
| bindings | service のメソッドを command catalog 用コールバック束へ変換 | `src/services/runtime-inspection-command-bindings.ts` |
| entries | コマンド ID / title / menu の宣言 | `src/services/runtime-inspection-command-entries.ts` |
| registration | catalog を VS Code command 登録へ流すだけ | `src/services/command-manager.ts` |

## 呼び出し境界

- `CommandManager` は **runtime inspection の実処理を持たない**。受け取った bindings を `command-catalog` に渡すだけ。
- `ServiceFactory` は **`RuntimeInspectionService` の生成場所**。ここで bindings 化して `CommandManagerDependencies.runtimeInspection` に渡す。
- command 以外の箇所から performance / memory の処理が必要なら、まず `RuntimeInspectionService` か下位の monitor / tracker を直接見直す。**CommandManager 経由で再利用しない**。

## 変更ルール

1. inspection コマンドを追加するなら `runtime-inspection-command-entries.ts` と `runtime-inspection-command-bindings.ts` を先に更新する。
2. 実処理の追加は `RuntimeInspectionService` に寄せる。
3. `CommandManager` では feature registry の束ねだけを行い、個別コマンドの業務ロジックを増やさない。

## 関連

- [service-registration.md](service-registration.md)
- [observability-and-cache-boundary.md](observability-and-cache-boundary.md)
- [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)
