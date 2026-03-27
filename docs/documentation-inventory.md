# Documentation Inventory

Updated: 2026-03-27

## Scope

- Coverage target: `README.md`, `docs/*.md`, `docs/adr/*.md`
- Coverage result: `109/109` entries covered
- Directory coverage:
  - repo root entry docs: `1`
  - `docs/`: `100`
  - `docs/adr/`: `8`
- Missing canonical destinations already visible in current state:
  - `CONTRIBUTING.md` does not exist
  - standalone setup page does not exist
  - testing landing page does not exist

## Proposed Owner Keys

- `Maintainer`: daily project docs, runtime docs, onboarding, operations
- `Reviewer`: CI, test, and quality-gate docs
- `Architect`: ADR and architecture-decision records

## Inventory Families

### 1. Entry

- Location: `README.md`
- Purpose: project entry and quick links
- Updated: `2026-03-22`
- Owner: `Maintainer`
- Frequency: `monthly`
- Members:
  - `README.md (2026-03-22)`

### 2. Information Architecture

- Location: `docs/documentation-information-architecture.md`
- Purpose: docs taxonomy and destination map for future cleanup
- Updated: `2026-03-27`
- Owner: `Maintainer`
- Frequency: `monthly`
- Members:
  - `docs/documentation-information-architecture.md (2026-03-27)`

### 3. Workflow And Onboarding

- Location: workflow and setup guidance under `docs/`
- Purpose: explain how to install, configure, and safely modify the project
- Updated: `2026-03-20..2026-03-27`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/adding-built-in-component.md (2026-03-27)`
  - `docs/api-compat-policy.md (2026-03-22)`
  - `docs/LOCAL_INSTALLER.md (2026-03-22)`
  - `docs/SETTINGS.md (2026-03-20)`
  - `docs/component-add-contract.md (2026-03-21)`
  - `docs/completion-descriptor-authoring.md (2026-03-22)`
  - `docs/dsl-include-resolution.md (2026-03-21)`
  - `docs/DEBUG_TROUBLESHOOTING.md (2026-03-20)`

### 4. Runtime Boundary Guides

- Location: boundary and subsystem ownership guides under `docs/`
- Purpose: explain which runtime lane owns extension, CLI, MCP, exporter, cache, and inspection behavior
- Updated: `2026-03-21..2026-03-24`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/extension-boundary-guide.md (2026-03-23)`
  - `docs/cli-boundary-guide.md (2026-03-21)`
  - `docs/mcp-boundary-guide.md (2026-03-21)`
  - `docs/exporter-boundary-guide.md (2026-03-24)`
  - `docs/runtime-inspection-boundary.md (2026-03-23)`
  - `docs/observability-and-cache-boundary.md (2026-03-21)`
  - `docs/cache-common-policy.md (2026-03-22)`
  - `docs/mcp-integration.md (2026-03-20)`
  - `docs/export-webview-runtime-coupling-inventory.md (2026-03-21)`

### 5. Service, Schema, And Pipeline References

- Location: pipeline and runtime design references under `docs/`
- Purpose: document service lifecycle, schema generation, command registration, and WebView/update flows
- Updated: `2026-03-21..2026-03-27`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/schema-pipeline-from-spec.md (2026-03-27)`
  - `docs/preview-update-pipeline.md (2026-03-22)`
  - `docs/preview-update-pipeline-ports.md (2026-03-21)`
  - `docs/service-design-file-watcher.md (2026-03-21)`
  - `docs/service-design-schema-manager.md (2026-03-21)`
  - `docs/service-design-service-initializer.md (2026-03-21)`
  - `docs/service-design-webview-manager.md (2026-03-21)`
  - `docs/service-registration.md (2026-03-23)`
  - `docs/webview-update-manager-responsibilities.md (2026-03-22)`
  - `docs/contributes-commands.md (2026-03-21)`
  - `docs/package-contributes-policy.md (2026-03-21)`
  - `docs/PROVIDER_CONTRACT.md (2026-03-20)`

### 6. Testing, CI, And Release Gates

- Location: test and CI reference docs under `docs/`
- Purpose: define test lanes, smoke coverage, branch gates, import guards, and metrics checks
- Updated: `2026-03-20..2026-03-27`
- Owner: `Reviewer`
- Frequency: `per change`
- Members:
  - `docs/test-matrix.md (2026-03-22)`
  - `docs/test-setup-policy.md (2026-03-22)`
  - `docs/ci-quality-gate.md (2026-03-27)`
  - `docs/CI_TEMPLATE.md (2026-03-20)`
  - `docs/quality-gate-green-main.md (2026-03-21)`
  - `docs/real-vscode-smoke.md (2026-03-22)`
  - `docs/MANUAL_REGRESSION_TEST.md (2026-03-20)`
  - `docs/integration-test-service-factory.md (2026-03-22)`
  - `docs/new-built-in-sample-regression-stub.md (2026-03-22)`
  - `docs/ssot-import-guard-matrix.md (2026-03-27)`
  - `docs/ssot-metrics-and-ci-checks.md (2026-03-27)`
  - `docs/import-boundaries-4-lanes.md (2026-03-27)`

### 7. Operations And Maintenance

- Location: maintainer and governance docs under `docs/`
- Purpose: define recurring review, playbooks, operational checklist, and maintenance expectations
- Updated: `2026-03-21..2026-03-27`
- Owner: `Maintainer`
- Frequency: `monthly`
- Members:
  - `docs/MAINTAINER_GUIDE.md (2026-03-27)`
  - `docs/ssot-monthly-review.md (2026-03-27)`
  - `docs/ssot-violation-playbook.md (2026-03-27)`
  - `docs/ssot-exception-log-rules.md (2026-03-27)`
  - `docs/ssot-epic-completion-checklist.md (2026-03-27)`
  - `docs/compat-layer-shrinkage-checklist.md (2026-03-26)`
  - `docs/maintainability-score.md (2026-03-21)`
  - `docs/PERFORMANCE_MONITORING_GUIDE.md (2026-03-20)`
  - `docs/external-arch-team-rules.md (2026-03-21)`
  - `docs/epic-b-l5-acceptance-release1.md (2026-03-27)`

### 8. Theme, Export, And Rendering Specifications

- Location: rendering and theme design docs under `docs/`
- Purpose: capture current contracts for theme tokens, exporter behavior, rendering boundaries, and fallback observations
- Updated: `2026-03-20..2026-03-24`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/THEME_IMPLEMENTATION.md (2026-03-20)`
  - `docs/theme-resolver-responsibilities.md (2026-03-22)`
  - `docs/token-slot-model-and-theme-extension.md (2026-03-22)`
  - `docs/token-slot-naming-convention.md (2026-03-22)`
  - `docs/base-component-renderer-dispatch.md (2026-03-22)`
  - `docs/export-manager-separation-policy.md (2026-03-21)`
  - `docs/exporter-capability-map-design.md (2026-03-22)`
  - `docs/export-instrumentation.md (2026-03-22)`
  - `docs/export-diff-metrics-naming.md (2026-03-21)`
  - `docs/export-diff-observation-path.md (2026-03-22)`
  - `docs/html-exporter-primary-fallback-inventory.md (2026-03-24)`
  - `docs/hr1-fallback-shrinkage-review.md (2026-03-24)`

### 9. DSL, SSoT, And Type-System Specifications

- Location: DSL and SSoT references under `docs/`
- Purpose: capture canonical type rules, inventory snapshots, renderer/type migration notes, and type-system placement rules
- Updated: `2026-03-24..2026-03-27`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/change-amplification-dsl.md (2026-03-26)`
  - `docs/component-registration-touchpoints.md (2026-03-26)`
  - `docs/dsl-types-change-impact-audit.md (2026-03-26)`
  - `docs/dsl-types-import-boundary-layer-guard.md (2026-03-22)`
  - `docs/dsl-types-renderer-types-inventory.md (2026-03-27)`
  - `docs/dsl-types-split-inventory.md (2026-03-22)`
  - `docs/renderer-types-responsibilities.md (2026-03-26)`
  - `docs/registry-compat-layer-policy.md (2026-03-21)`
  - `docs/ssot-dsl-type-addition-rules.md (2026-03-25)`
  - `docs/ssot-renderer-components-batching-memo.md (2026-03-27)`
  - `docs/ssot-renderer-facade-sprint3-decision.md (2026-03-27)`
  - `docs/ssot-renderer-types-inventory.md (2026-03-27)`
  - `docs/ssot-renderer-types-zero-a1-inventory.md (2026-03-27)`
  - `docs/ssot-renderer-types-zero-metrics-dashboard.md (2026-03-27)`
  - `docs/ssot-sprint2-category-placement-map.md (2026-03-24)`
  - `docs/typed-codec-types-layering.md (2026-03-21)`

### 10. Active Architecture Reviews And Assessments

- Location: active design assessment docs under `docs/`
- Purpose: support current architectural reasoning, cleanup evaluation, and capability planning
- Updated: `2026-03-20..2026-03-26`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/architecture-review-D-change-amplification-canonical.md (2026-03-22)`
  - `docs/refactoring-assessment.md (2026-03-20)`
  - `docs/rf4-naming-cleanup-inventory.md (2026-03-24)`
  - `docs/rf4-parse-error-cleanup-notes.md (2026-03-24)`

### 11. Historical Notes And Archive Candidates

- Location: historical notes currently still living in `docs/`
- Purpose: retain prior planning context, release history, and superseded sprint notes until archive policy lands
- Updated: `2026-03-20..2026-03-27`
- Owner: `Maintainer`
- Frequency: `frozen`
- Members:
  - `docs/AI_WORKFLOW_ROADMAP.md (2026-03-20)`
  - `docs/application-usecase-spike-2026-03-21.md (2026-03-21)`
  - `docs/architecture-review-F-boundary-roadmap.md (2026-03-21)`
  - `docs/change-amplification-codegen-spike.md (2026-03-26)`
  - `docs/console-logger-inventory-phase0.md (2026-03-24)`
  - `docs/dev-team-10rounds-mandatory-2026-03-21.md (2026-03-21)`
  - `docs/hr1-next-epic-backlog-split.md (2026-03-24)`
  - `docs/RELEASE_NOTES_v0.5.0.md (2026-03-20)`
  - `docs/RELEASE_NOTES_v0.6.0.md (2026-03-20)`
  - `docs/RELEASE_NOTES_v0.7.0.md (2026-03-22)`
  - `docs/ssot-renderer-sprint3-candidates.md (2026-03-27)`
  - `docs/ssot-renderer-sprint3-entry-closeout.md (2026-03-27)`
  - `docs/ssot-sprint1-boundary-baseline.md (2026-03-27)`
  - `docs/ssot-sprint1-closeout-and-sprint2-input.md (2026-03-27)`
  - `docs/ssot-sprint2-closeout-and-sprint3-input.md (2026-03-27)`
  - `docs/ssot-webview-dsl-types-direct-import-poc.md (2026-03-27)`

### 12. ADR Catalog

- Location: `docs/adr/*.md`
- Purpose: record architecture decisions that act as canonical long-lived spec references
- Updated: `2026-03-21..2026-03-27`
- Owner: `Architect`
- Frequency: `on decision`
- Members:
  - `docs/adr/0001-document-analysis-service.md (2026-03-21)`
  - `docs/adr/0002-dsl-yaml-parse-shared-kernel.md (2026-03-21)`
  - `docs/adr/0003-dsl-types-canonical-source.md (2026-03-27)`
  - `docs/adr/0004-component-definition-graph-canonical.md (2026-03-21)`
  - `docs/adr/0005-exporter-unsupported-and-phased-rollout.md (2026-03-22)`
  - `docs/adr/0006-token-style-property-and-default-token-slot-compatibility.md (2026-03-22)`
  - `docs/adr/0007-export-diff-purpose.md (2026-03-22)`
  - `docs/adr/0008-component-definition-generation-alignment.md (2026-03-22)`

## Current Findings

### Missing canonical destinations

- `CONTRIBUTING.md` is missing even though the IA target model expects it as the workflow home.
- setup is still spread across `README.md`, `docs/LOCAL_INSTALLER.md`, and maintainer-oriented pages.
- test entry information is spread across `docs/test-matrix.md`, `docs/ci-quality-gate.md`, `docs/quality-gate-green-main.md`, and `docs/real-vscode-smoke.md`; no single landing page exists.

### Historical docs mixed into the live root

- `docs/AI_WORKFLOW_ROADMAP.md`
- `docs/application-usecase-spike-2026-03-21.md`
- `docs/architecture-review-F-boundary-roadmap.md`
- `docs/change-amplification-codegen-spike.md`
- `docs/console-logger-inventory-phase0.md`
- `docs/dev-team-10rounds-mandatory-2026-03-21.md`
- `docs/hr1-next-epic-backlog-split.md`
- `docs/RELEASE_NOTES_v0.5.0.md`
- `docs/RELEASE_NOTES_v0.6.0.md`
- `docs/RELEASE_NOTES_v0.7.0.md`
- `docs/ssot-renderer-sprint3-candidates.md`
- `docs/ssot-renderer-sprint3-entry-closeout.md`
- `docs/ssot-sprint1-boundary-baseline.md`
- `docs/ssot-sprint1-closeout-and-sprint2-input.md`
- `docs/ssot-sprint2-closeout-and-sprint3-input.md`
- `docs/ssot-webview-dsl-types-direct-import-poc.md`

### Overlap clusters likely to need consolidation

- Entry / setup overlap:
  - `README.md`
  - `docs/LOCAL_INSTALLER.md`
  - `docs/MAINTAINER_GUIDE.md`
- Built-in component guidance overlap:
  - `docs/adding-built-in-component.md`
  - `docs/component-add-contract.md`
  - `docs/completion-descriptor-authoring.md`
  - `docs/component-registration-touchpoints.md`
  - `docs/new-built-in-sample-regression-stub.md`
- Test / CI guidance overlap:
  - `docs/test-matrix.md`
  - `docs/ci-quality-gate.md`
  - `docs/quality-gate-green-main.md`
  - `docs/CI_TEMPLATE.md`
  - `docs/real-vscode-smoke.md`
- SSoT inventory and closeout overlap:
  - `docs/dsl-types-renderer-types-inventory.md`
  - `docs/ssot-renderer-types-inventory.md`
  - `docs/ssot-renderer-types-zero-a1-inventory.md`
  - `docs/ssot-renderer-types-zero-metrics-dashboard.md`

### Owner metadata gap

- Current docs rarely declare explicit `Owner`, `Audience`, or `Review cadence` in-file.
- This means the inventory can propose owners, but the repo has not yet enforced page-level metadata.

## Recommended Follow-Up Seeds

1. Create `CONTRIBUTING.md` and move branch / PR / review expectations out of `README.md` and maintainer-oriented docs.
2. Create one setup page and treat `README.md` as an entry page only.
3. Introduce an archive policy, then move the historical-note family out of the live `docs/` root.
4. Consolidate test / CI guidance behind one landing page.
5. Add page metadata fields in the governance sprint so proposed owners become in-file owners.
