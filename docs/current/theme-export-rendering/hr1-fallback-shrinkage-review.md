# HR1 fallback shrinkage review

This note closes HR1 by separating what is already Primary, what **used to be** an intentional compatibility lane (now **removed**; see `T-20260420-001`), and what should move to the next epic.

## Scope reviewed

- HR1-S1 discovery and observability
- HR1-S2 Primary hardening
- HR1-S3 fallback isolation

## Achieved in HR1

| Area | Result | Evidence |
|---|---|---|
| Route inventory | Primary / Fallback entry points are listed in one place | `docs/current/theme-export-rendering/html-exporter-primary-fallback-inventory.md` |
| Fallback observability | **削除済み（T-20260420-090）** — 旧 HtmlExporter fallback レーン専用の debug ログ観測テスト | ~~`tests/unit/html-exporter-lane-observability.test.js`~~ |
| Primary default path | built-in HTML provider and preview preparation are fixed to Primary by default | `src/cli/provider-registry.ts`, `src/utils/preview-capture/html-preparation.ts`, `tests/unit/html-exporter-route-viability.test.js` |
| Explicit fallback entry | **削除済み（T-20260420-001）** — 旧内部ヘルパ経路。CLI capture は **Primary-default**（T-010）を維持 | [t017-html-export-lane-options-internal-api.md](./t017-html-export-lane-options-internal-api.md)（**アーカイブ**） |
| Fallback sprawl guard | **`src/**` に `useReactRender: false` 直書き禁止**（互換ヘルパ撤去後） | `tests/unit/html-exporter-route-viability.test.js`（entry guard describe） |
| Primary-first guidance | maintainer and built-in authoring docs treat Primary as source of truth | `docs/current/runtime-boundaries/exporter-boundary-guide.md`, `docs/current/workflow-onboarding/adding-built-in-component.md`, `docs/current/operations/MAINTAINER_GUIDE.md` |

## ~~Remaining compatibility lane~~（履歴 · T-091）

HtmlExporter の **互換レーンは撤去済み**。以下は **HR1 当時のメモ**であり現行ルールではない。

| Route / topic（当時） | 現行（2026-04） |
|---|---|
| `capture-command` fallback entry | **Primary のみ**（ヘルパ強制なし） |
| fallback-focused tests | **`html-exporter-fallback-style-lane`** は **builder / `compatibilityCss` スロット**のみ。旧 observability テストは削除 |
| fallback-only fixes | **HtmlExporter には適用外**。他 exporter の legacy は別エピック |

## What HR1 did not complete

| Topic | Status | Why not in HR1 |
|---|---|---|
| Full fallback removal | **完了（T-20260420-001 / Vault T-090）** | HR1 以降の別トラックで実施 |
| Route-by-route migration of capture | not started | HR1 validated the route and kept it explicit instead of replacing it blindly |
| Next-epic sequencing | delegated | this review is input for `T-356` rather than the backlog split itself |

## Review conclusion

1. Primary is now the documented source of truth for normal HTML export, provider output, and preview preparation.
2. Fallback is narrowed to an explicit compatibility lane instead of a drifting alternate default.
3. Future fallback-only changes should justify themselves locally; otherwise they should be challenged as Primary-path work first.

## Input for next backlog split

- Treat capture-lane replacement as a separate decision from generic HtmlExporter maintenance.
- Keep `Primary parity / hardening` and `Fallback compatibility obligations` as separate ticket families.
- Prefer tickets that either remove one explicit fallback dependency or prove that it must remain for a documented reason.
