# HTML Exporter Responsibilities

`HtmlExporter` is a thin primary-path orchestrator. It should not grow a second renderer stack.

## Responsibility Split

| Responsibility | Owner | Notes |
|---|---|---|
| DSL image source resolution | `HtmlExporter.resolveLocalImageSourcesForExport` | Export-only file copy concern. |
| Theme variable/style block generation | `theme-definition-resolver` and `theme-style-builder` | Produces CSS string input to the document builder. |
| Component rendering | `react-static-export` | The source-of-truth HTML body path. |
| Document shell and CSS assembly | `html-template-builder` | Wraps body, theme styles, WebView CSS, and optional compatibility CSS slot. |
| Format dispatch and caching | `ExportManager` / export pipeline | Chooses exporter and handles cache/metrics. |

## Non-Responsibilities

- Do not reintroduce `BaseComponentRenderer`.
- Do not import `src/exporters/legacy/**`.
- Do not create a second HTML component renderer in `HtmlExporter`.
- Do not hide `useReactRender: false` behind a new feature flag.

## Golden Coverage

Representative primary HTML coverage should include:

- text and semantic layout;
- forms and buttons;
- table structure;
- components historically covered by string renderers.

Use focused structural assertions instead of full-document snapshots unless the change explicitly targets the document shell.

