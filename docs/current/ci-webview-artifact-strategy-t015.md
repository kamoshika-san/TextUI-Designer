# WebView 成果物（`media/`）運用の見直し — T-015

**チケット**: T-015（任意・優先度低）  
**前提**: **T-002** により `npm run check:webview-media-drift` が **コミット済み `media/`** と **`npm run build-webview` 出力**の一致を CI で保証している。

## 1. 現状整理（何が `media/` に入り、誰が参照するか）

| パス（例） | 生成元 | 主な消費者 |
|------------|--------|------------|
| `media/webview.js` | `vite build`（`npm run build-webview`） | 拡張機能ランタイム（WebView 読み込み） |
| `media/index.html` | 同上 | 同上 |
| `media/assets/index-*.css` | 同上（ハッシュ付きファイル名） | 同上 |

| レイヤ | 役割 |
|--------|------|
| **ローカル / リリース** | ソース変更後は `build-webview` → **`git add media/`** でコミット（T-002 のエラーメッセージと同趣旨） |
| **CI（`webview-media-drift`）** | checkout → `npm ci` → `check:webview-media-drift`（内部で `build-webview` 実行後に `git diff media/`） |
| **CI（`build` / VSIX）** | `compile` + `package` のみ。**このジョブでは `build-webview` は再実行しない**（コミット済み `media/` をパッケージが取り込む前提）。`.github/workflows/ci.yml` 内コメント参照。 |
| **`package.json`** | `vscode:prepublish` / `package:vsix` は **`build-webview` を含む** → ローカル／release で **ビルド直後の `media/`** が VSIX に入る。 |

## 2. build-on-CI 方式（検討メモ）

**定義（本メモ）**: リポジトリに **`media/` を常時コミットしない**運用にし、CI（または release パイプライン）で `build-webview` を実行して **成果物だけ**を後続ジョブ／VSIX へ渡す。

### 2.1 キャッシュ戦略（`actions/cache` / `setup-node` cache）

| 長所 | 短所 |
|------|------|
| `npm ci` ＋依存取得の短縮 | **WebView のバンドル成果物そのもの**はキャッシュ世代管理が必要（キー設計ミスで stale リスク） |
| GitHub Actions 上で追加コストが小さい | キャッシュヒット失敗時は毎回フル `build-webview` で時間がかかる |

### 2.2 Artifact upload 戦略（`actions/upload-artifact` / `download-artifact`）

| 長所 | 短所 |
|------|------|
| ジョブ間で **明示的な依存**（`needs`）にできる | ストレージ・保持日数・転送コスト |
| release ワークフローと **同じバンドル**を共有しやすい | **ローカル clone のみ**では `media/` が空／古い可能性（開発者体験の再設計が必要） |

## 3. VSIX パッケージングとの整合（チェックリスト）

現行（artifact commit 前提）で満たしていること:

- [ ] `vscode:prepublish` に **`build-webview`** が含まれている（`package.json`）。
- [ ] `package:vsix` に **`build-webview`** が含まれている。
- [ ] 拡張機能の **`files` / 取り込み設定**に **`media/**/*`** が含まれる（`package.json` の `files` 等）。
- [ ] CI の **`webview-media-drift`** が **`check:webview-media-drift`** を実行している（`.github/workflows/ci.yml`）。

build-on-CI へ移行する場合に **追加で必要**になりうること:

- [ ] **VSIX 組み立てジョブ**が、**必ず** `build-webview` の後（または artifact 取得後）に実行されること。
- [ ] **ローカル開発**用に、`media/` が無い／古いときの **単一の公式手順**（例: `npm run build-webview` の必須化）をドキュメント化すること。
- [ ] **オフライン**や **fork CI** でも同じ成果物に到達できるか（再現性）。

## 4. 意思決定（本スプリントの結論）

### 推奨: **段階移行**（当面は **artifact commit を維持**）

| 選択肢 | 本スプリントでの判定 |
|--------|----------------------|
| **artifact commit を当面維持** | **採用（フェーズ 0）** — T-002 が既に「ソースとコミット済み成果物のズレ」を抑止しており、VSIX パイプライン（`build` ジョブが `build-webview` を再実行しない設計）とも **矛盾なく整合**している。 |
| **即時廃止（`media/` 非コミット化）** | **非採用** — VSIX・ローカル・CI の **三点の契約を同時に書き換える**必要があり、本チケットの優先度（低）とコストが見合わない。 |
| **段階移行** | **推奨** — 次フェーズで (1) CI 上の **並行ビルド＋ artifact** の PoC、(2) VSIX が **artifact 経由でも**同じ内容になる検証、(3) 開発者向け手順の一本化、の順で進められる。 |

### 採用条件（build-on-CI へ進むためのゲート例）

- VSIX を **`build-webview` 非実行ジョブ**だけで組み立てる場合でも、**常に同一バイト列**になる検証が自動化されている。
- `media/` 非コミット時の **初回 clone 体験**（必須コマンド 1 本以内推奨）が合意されている。
- **T-002 の代替**（「コミットとの diff」から「期待ハッシュ」または「artifact 署名」へ）が定義されている。

### 次スプリントへの入力（PM / Architect 向けメモ）

- **実装スプリント**では、上記ゲートのうち **1 つ**を選び PoC 化する（例: `build` 前ジョブで `build-webview` → artifact upload → `build` が download して `package`、**まだ**リポジトリの `media/` は残す「二重ソース期間」）。
- **T-002 を変える場合**は PM 承認と **移行チケット**を分離する（本ドキュメントでは **無効化しない**）。

## 5. 関連

- `scripts/check-webview-media-drift.cjs`（T-002）
- `.github/workflows/ci.yml` — `webview-media-drift` / `build` ジョブのコメント
- `package.json` — `build-webview`, `check:webview-media-drift`, `vscode:prepublish`, `package:vsix`
