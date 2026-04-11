# TextUI Designer Samples

Samples are the fastest way to learn the DSL and to validate rollout assumptions before touching production-like files.

Each sample directory contains its own `README.md`. Start with the sample that matches the question you are trying to answer.

## Recommended Starting Points

| Sample | Use it for | Primary file |
|---|---|---|
| [01-basic](01-basic/) | Smallest page DSL preview and export smoke path | `sample.tui.yml` |
| [02-theme](02-theme/) | Theme authoring and token application | `theme-demo.tui.yml` |
| [03-include](03-include/) | `$include` and template composition | `include-sample.tui.yml` |
| [05-theme-inheritance](05-theme-inheritance/) | Theme inheritance | `inheritance-demo.tui.yml` |
| [06-token](06-token/) | Token reference usage | `token-demo.tui.yml` |
| [12-navigation](12-navigation/) | Baseline Phase 1 navigation flow | `app.tui.flow.yml` |
| [13-enterprise-flow](13-enterprise-flow/) | Representative Navigation v2 graph-first flow | `app.tui.flow.yml` |

## Navigation Sample Roles

The repository now uses two navigation samples on purpose.

### `12-navigation`

Use [`12-navigation`](12-navigation/README.md) when you need:

- the smallest valid navigation flow
- baseline validation and export checks
- a v1-style comparison point before graph-first metadata is added

### `13-enterprise-flow`

Use [`13-enterprise-flow`](13-enterprise-flow/README.md) when you need:

- Navigation v2 migration examples
- branch / retry / loop / terminal semantics
- graph-aware CLI and MCP checks
- exporter and semantic diff regression coverage

As a rule of thumb:

- migration or rollout discussion: start with `13-enterprise-flow`
- baseline or compatibility smoke check: start with `12-navigation`

## Validation Flow

When you add or change a sample:

1. Validate the changed sample files.
2. Update the sample-local `README.md` when the sample's purpose changes.
3. Update this index if the recommended starting points or navigation sample roles change.
4. Re-run the sample validation lane and any related regression checks.

## Notes

- Generated artifacts do not belong in `sample/`.
- Intentionally failing samples should be called out explicitly in the owning README and validation expectations.
- For Navigation v2 authoring guidance, continue with [`../docs/navigation-v2-guide.md`](../docs/navigation-v2-guide.md).
