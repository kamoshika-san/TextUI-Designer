# RF4 naming cleanup inventory

Small naming cleanup notes for `T-20260322-335`. This page prefers low-risk, mechanical fixes over broad renames.

## Applied in this slice

| Item | Old name | New / preferred name | Why |
|---|---|---|---|
| VS Code window adapter | `VsCodeWindowAdapter` | `VSCodeWindowAdapter` | Acronym casing now matches `VS Code` and reads like the rest of the codebase. A backward-compatible alias is kept for older imports and tests. |

## Deferred candidates

| Area | Current names | Why deferred |
|---|---|---|
| WebView runtime helpers | mixed `manager` / `service` / `handler` terms | Several files participate in runtime lifecycle and DI; renaming them safely would be larger than cleanup-only scope. |
| test helper factories | `*Factory`, `Test*Manager`, mock classes | Test naming is locally consistent enough, but worth revisiting separately if fixture APIs are consolidated again. |

## Rule of thumb

- Prefer a rename only when it is mechanical, local, and backward-compatible.
- If a rename would force public API churn, broad doc rewrites, or architectural debate, split it into a dedicated follow-up ticket instead of hiding it inside cleanup work.
