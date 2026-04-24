# WebView Mode Separation

## Goal

Reduce Preview cognitive load by giving each WebView mode one primary user question and one primary job.

## Mode Responsibilities

| Mode | Primary user question | Primary job | Keep out of the main surface |
|---|---|---|---|
| Preview | How does this screen look now? | Render the current screen and support Jump-to-DSL | Diff details, export controls, conflict explanations |
| Flow | Where can this screen go? | Show navigation structure and linked screen traversal | Export format controls, structural diff details |
| Diff | What changed and why does it matter? | Show structural and semantic changes with evidence | Live-edit controls, export destination choices |
| Export | What will be generated and where will it go? | Select format, dry-run output, and save/export | Flow route exploration, diff conflict analysis |

## State Retention

- Retain active file, selected screen, theme, font size, and Jump-to-DSL settings across mode switches.
- Retain Flow selected node when moving between Flow and Preview for linked screens.
- Retain Diff comparison inputs within Diff mode, but do not leak conflict panels into Preview.
- Retain Export format and dry-run output within Export mode, but keep Preview focused on rendering.
- Reset transient empty/error messages when changing modes so the next mode starts with its own guidance.

## Labels And Empty States

- Use mode labels: `Preview`, `Flow`, `Diff`, `Export`.
- Empty Preview: ask for an active `.tui.yml` file.
- Empty Flow: ask for an active `.tui.flow.yml` file.
- Empty Diff: ask for previous and next files.
- Empty Export: ask for an active TextUI file and an export format.
- Error messages should state the failed mode first, then the recovery action.

## Cross-Mode Links

- Preview may link to Jump-to-DSL, Export Preview, and Flow Preview, but those controls should be secondary.
- Flow may open a linked screen in Preview and return to the map.
- Diff may link to source YAML and Preview for inspection.
- Export may link back to Preview for visual confirmation.

## Reviewer Checklist

- The user can identify the active mode from the first visible label.
- The primary action in each mode answers the mode question.
- Preview does not show persistent Diff, Conflict, or Export panels by default.
- A future implementation can split work by mode without changing diff or export algorithms.
