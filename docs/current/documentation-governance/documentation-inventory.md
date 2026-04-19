# Documentation Inventory

Updated: 2026-03-28

## Scope

- Coverage target: `README.md`, `docs/*.md`, `docs/adr/*.md`
- Coverage result: `111/111` entries covered
- Directory coverage:
  - repo root entry docs: `1`
  - `docs/`: `102`
  - `docs/adr/`: `8`
- Missing canonical destinations already visible in current state:
  - no missing canonical destinations currently identified in the covered scope

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

- Location: `docs/current/documentation-governance/documentation-information-architecture.md`
- Purpose: docs taxonomy and destination map for future cleanup
- Updated: `2026-03-27`
- Owner: `Maintainer`
- Frequency: `monthly`
- Members:
  - `docs/current/documentation-governance/documentation-information-architecture.md (2026-03-27)`

### 3. Workflow And Onboarding

- Location: workflow and setup guidance under `docs/`
- Purpose: explain how to install, configure, and safely modify the project
- Updated: `2026-03-20..2026-03-28`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/workflow-onboarding/adding-built-in-component.md (2026-03-27)`
  - `docs/current/workflow-onboarding/api-compat-policy.md (2026-03-22)`
  - `docs/current/workflow-onboarding/LOCAL_INSTALLER.md (2026-03-22)`
  - `docs/current/workflow-onboarding/SETTINGS.md (2026-03-20)`
  - `docs/current/workflow-onboarding/component-add-contract.md (2026-03-21)`
  - `docs/current/workflow-onboarding/completion-descriptor-authoring.md (2026-03-22)`
  - `docs/current/workflow-onboarding/dsl-include-resolution.md (2026-03-21)`
  - `docs/current/workflow-onboarding/DEBUG_TROUBLESHOOTING.md (2026-03-20)`

### 4. Runtime Boundary Guides

- Location: boundary and subsystem ownership guides under `docs/`
- Purpose: explain which runtime lane owns extension, CLI, MCP, exporter, cache, and inspection behavior
- Updated: `2026-03-21..2026-03-24`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/runtime-boundaries/extension-boundary-guide.md (2026-03-23)`
  - `docs/current/runtime-boundaries/cli-boundary-guide.md (2026-03-21)`
  - `docs/current/runtime-boundaries/mcp-boundary-guide.md (2026-03-21)`
  - `docs/current/runtime-boundaries/exporter-boundary-guide.md (2026-03-24)`
  - `docs/current/runtime-boundaries/runtime-inspection-boundary.md (2026-03-23)`
  - `docs/current/runtime-boundaries/observability-and-cache-boundary.md (2026-03-21)`
  - `docs/current/runtime-boundaries/cache-common-policy.md (2026-03-22)`
  - `docs/current/runtime-boundaries/mcp-integration.md (2026-03-20)`
  - `docs/current/runtime-boundaries/export-webview-runtime-coupling-inventory.md (2026-03-21)`

### 5. Service, Schema, And Pipeline References

- Location: pipeline and runtime design references under `docs/`
- Purpose: document service lifecycle, schema generation, command registration, and WebView/update flows
- Updated: `2026-03-21..2026-03-27`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/services-webview/schema-pipeline-from-spec.md (2026-03-27)`
  - `docs/current/services-webview/preview-update-pipeline.md (2026-03-22)`
  - `docs/current/services-webview/preview-update-pipeline-ports.md (2026-03-21)`
  - `docs/current/services-webview/service-design-file-watcher.md (2026-03-21)`
  - `docs/current/services-webview/service-design-schema-manager.md (2026-03-21)`
  - `docs/current/services-webview/service-design-service-initializer.md (2026-03-21)`
  - `docs/current/services-webview/service-design-webview-manager.md (2026-03-21)`
  - `docs/current/services-webview/service-registration.md (2026-03-23)`
  - `docs/current/services-webview/webview-update-manager-responsibilities.md (2026-03-22)`
  - `docs/current/services-webview/contributes-commands.md (2026-03-21)`
  - `docs/current/services-webview/package-contributes-policy.md (2026-03-21)`
  - `docs/current/services-webview/PROVIDER_CONTRACT.md (2026-03-20)`

### 6. Testing, CI, And Release Gates

- Location: test and CI reference docs under `docs/`
- Purpose: define test lanes, smoke coverage, branch gates, import guards, and metrics checks
- Updated: `2026-03-20..2026-03-28`
- Owner: `Reviewer`
- Frequency: `per change`
- Members:
  - `docs/current/testing-ci/test-matrix.md (2026-03-22)`
  - `docs/current/testing-ci/test-setup-policy.md (2026-03-22)`
  - `docs/current/testing-ci/ci-quality-gate.md (2026-03-27)`
  - `docs/current/testing-ci/CI_TEMPLATE.md (2026-03-20)`
  - `docs/current/testing-ci/quality-gate-green-main.md (2026-03-21)`
  - `docs/current/testing-ci/real-vscode-smoke.md (2026-03-22)`
  - `docs/current/testing-ci/MANUAL_REGRESSION_TEST.md (2026-03-20)`
  - `docs/current/testing-ci/integration-test-service-factory.md (2026-03-22)`
  - `docs/current/testing-ci/new-built-in-sample-regression-stub.md (2026-03-22)`
  - `docs/current/testing-ci/ssot-import-guard-matrix.md (2026-03-27)`
  - `docs/current/testing-ci/ssot-metrics-and-ci-checks.md (2026-03-27)`
  - `docs/current/testing-ci/import-boundaries-4-lanes.md (2026-03-27)`

### 7. Operations And Maintenance

- Location: maintainer and governance docs under `docs/`
- Purpose: define recurring review, playbooks, operational checklist, and maintenance expectations
- Updated: `2026-03-21..2026-03-27`
- Owner: `Maintainer`
- Frequency: `monthly`
- Members:
  - `docs/current/operations/MAINTAINER_GUIDE.md (2026-03-27)`
  - `docs/current/operations/ssot-monthly-review.md (2026-03-27)`
  - `docs/current/operations/ssot-violation-playbook.md (2026-03-27)`
  - `docs/current/operations/ssot-exception-log-rules.md (2026-03-27)`
  - `docs/current/operations/ssot-epic-completion-checklist.md (2026-03-27)`
  - `docs/current/operations/compat-layer-shrinkage-checklist.md (2026-03-26)`
  - `docs/current/operations/maintainability-score.md (2026-03-21)`
  - `docs/current/operations/PERFORMANCE_MONITORING_GUIDE.md (2026-03-20)`
  - `docs/current/operations/external-arch-team-rules.md (2026-03-21)`
  - `docs/current/operations/epic-b-l5-acceptance-release1.md (2026-03-27)`

### 8. Theme, Export, And Rendering Specifications

- Location: rendering and theme design docs under `docs/`
- Purpose: capture current contracts for theme tokens, exporter behavior, rendering boundaries, and fallback observations
- Updated: `2026-03-20..2026-03-24`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/theme-export-rendering/THEME_IMPLEMENTATION.md (2026-03-20)`
  - `docs/current/theme-export-rendering/theme-resolver-responsibilities.md (2026-03-22)`
  - `docs/current/theme-export-rendering/token-slot-model-and-theme-extension.md (2026-03-22)`
  - `docs/current/theme-export-rendering/token-slot-naming-convention.md (2026-03-22)`
  - `docs/current/theme-export-rendering/base-component-renderer-dispatch.md (2026-03-22)`
  - `docs/current/theme-export-rendering/export-manager-separation-policy.md (2026-03-21)`
  - `docs/current/theme-export-rendering/exporter-capability-map-design.md (2026-03-22)`
  - `docs/current/theme-export-rendering/export-instrumentation.md (2026-03-22)`
  - `docs/current/theme-export-rendering/export-diff-metrics-naming.md (2026-03-21)`
  - `docs/current/theme-export-rendering/export-diff-observation-path.md (2026-03-22)`
  - `docs/current/theme-export-rendering/html-exporter-primary-fallback-inventory.md (2026-03-24)`
  - `docs/current/theme-export-rendering/hr1-fallback-shrinkage-review.md (2026-03-24)`

### 9. DSL, SSoT, And Type-System Specifications

- Location: DSL and SSoT references under `docs/`
- Purpose: capture canonical type rules, inventory snapshots, renderer/type migration notes, and type-system placement rules
- Updated: `2026-03-24..2026-03-27`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/dsl-ssot-types/change-amplification-dsl.md (2026-03-26)`
  - `docs/current/dsl-ssot-types/component-registration-touchpoints.md (2026-03-26)`
  - `docs/current/dsl-ssot-types/dsl-types-change-impact-audit.md (2026-03-26)`
  - `docs/current/dsl-ssot-types/dsl-types-import-boundary-layer-guard.md (2026-03-22)`
  - `docs/current/dsl-ssot-types/dsl-types-renderer-types-inventory.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/dsl-types-split-inventory.md (2026-03-22)`
  - `docs/current/dsl-ssot-types/renderer-types-responsibilities.md (2026-03-26)`
  - `docs/current/dsl-ssot-types/registry-compat-layer-policy.md (2026-03-21)`
  - `docs/current/dsl-ssot-types/ssot-dsl-type-addition-rules.md (2026-03-25)`
  - `docs/current/dsl-ssot-types/ssot-renderer-components-batching-memo.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/ssot-renderer-facade-sprint3-decision.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-inventory.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-zero-a1-inventory.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-zero-metrics-dashboard.md (2026-03-27)`
  - `docs/current/dsl-ssot-types/ssot-sprint2-category-placement-map.md (2026-03-24)`
  - `docs/current/dsl-ssot-types/typed-codec-types-layering.md (2026-03-21)`

### 10. Active Architecture Reviews And Assessments

- Location: active design assessment docs under `docs/`
- Purpose: support current architectural reasoning, cleanup evaluation, and capability planning
- Updated: `2026-03-20..2026-03-26`
- Owner: `Maintainer`
- Frequency: `per change`
- Members:
  - `docs/current/architecture-assessments/architecture-review-D-change-amplification-canonical.md (2026-03-22)`
  - `docs/current/architecture-assessments/refactoring-assessment.md (2026-03-20)`
  - `docs/current/architecture-assessments/rf4-naming-cleanup-inventory.md (2026-03-24)`
  - `docs/current/architecture-assessments/rf4-parse-error-cleanup-notes.md (2026-03-24)`

### 11. Historical Notes And Archive Candidates

- Location: `docs/archive/`（2026-04-19 に `docs/current/historical-notes/` から退避）
- Purpose: retain prior planning context, release history, and superseded sprint notes until archive policy lands
- Updated: `2026-03-20..2026-03-28`
- Owner: `Maintainer`
- Frequency: `frozen`
- Members:
  - `docs/archive/AI_WORKFLOW_ROADMAP.md (2026-03-20)`
  - `docs/archive/application-usecase-spike-2026-03-21.md (2026-03-21)`
  - `docs/archive/architecture-review-F-boundary-roadmap.md (2026-03-21)`
  - `docs/archive/change-amplification-codegen-spike.md (2026-03-26)`
  - `docs/archive/console-logger-inventory-phase0.md (2026-03-24)`
  - `docs/archive/dev-team-10rounds-mandatory-2026-03-21.md (2026-03-21)`
  - `docs/archive/hr1-next-epic-backlog-split.md (2026-03-24)`
  - `docs/archive/RELEASE_NOTES_v0.5.0.md (2026-03-20)`
  - `docs/archive/RELEASE_NOTES_v0.6.0.md (2026-03-20)`
  - `docs/archive/RELEASE_NOTES_v0.7.2.md (2026-03-28)`
  - `docs/archive/RELEASE_NOTES_v0.7.1.md (2026-03-28)`
  - `docs/archive/RELEASE_NOTES_v0.7.0.md (2026-03-22)`
  - `docs/archive/RELEASE_NOTES_v0.7.3.md (2026-03-20)`
  - `docs/archive/RELEASE_NOTES_v0.8.0.md (2026-03-22)`
  - `docs/archive/RELEASE_NOTES_v0.8.1.md (2026-03-22)`
  - `docs/archive/RELEASE_NOTES_v0.9.2.md (2026-03-28)`
  - `docs/archive/phase1-execution-plan.md (2026-03-20)`
  - `docs/archive/semantic-meaning-core-ontology-v0-ja.md (2026-04-19)`
  - `docs/archive/ssot-renderer-sprint3-candidates.md (2026-03-27)`
  - `docs/archive/ssot-renderer-sprint3-entry-closeout.md (2026-03-27)`
  - `docs/archive/ssot-sprint1-boundary-baseline.md (2026-03-27)`
  - `docs/archive/ssot-sprint1-closeout-and-sprint2-input.md (2026-03-27)`
  - `docs/archive/ssot-sprint2-closeout-and-sprint3-input.md (2026-03-27)`
  - `docs/archive/ssot-webview-dsl-types-direct-import-poc.md (2026-03-27)`

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

- No missing canonical destinations are currently called out in the covered scope.

### Historical docs under `docs/archive/`

- `docs/archive/AI_WORKFLOW_ROADMAP.md`
- `docs/archive/application-usecase-spike-2026-03-21.md`
- `docs/archive/architecture-review-F-boundary-roadmap.md`
- `docs/archive/change-amplification-codegen-spike.md`
- `docs/archive/console-logger-inventory-phase0.md`
- `docs/archive/dev-team-10rounds-mandatory-2026-03-21.md`
- `docs/archive/hr1-next-epic-backlog-split.md`
- `docs/archive/RELEASE_NOTES_v0.5.0.md`
- `docs/archive/RELEASE_NOTES_v0.6.0.md`
- `docs/archive/RELEASE_NOTES_v0.7.2.md`
- `docs/archive/RELEASE_NOTES_v0.7.1.md`
- `docs/archive/RELEASE_NOTES_v0.7.0.md`
- `docs/archive/RELEASE_NOTES_v0.7.3.md`
- `docs/archive/RELEASE_NOTES_v0.8.0.md`
- `docs/archive/RELEASE_NOTES_v0.8.1.md`
- `docs/archive/RELEASE_NOTES_v0.9.2.md`
- `docs/archive/phase1-execution-plan.md`
- `docs/archive/semantic-meaning-core-ontology-v0-ja.md`
- `docs/archive/ssot-renderer-sprint3-candidates.md`
- `docs/archive/ssot-renderer-sprint3-entry-closeout.md`
- `docs/archive/ssot-sprint1-boundary-baseline.md`
- `docs/archive/ssot-sprint1-closeout-and-sprint2-input.md`
- `docs/archive/ssot-sprint2-closeout-and-sprint3-input.md`
- `docs/archive/ssot-webview-dsl-types-direct-import-poc.md`

### Overlap clusters likely to need consolidation

- Entry / setup overlap:
  - `README.md`
  - `docs/current/workflow-onboarding/LOCAL_INSTALLER.md`
  - `docs/current/operations/MAINTAINER_GUIDE.md`
- Built-in component guidance overlap:
  - `docs/current/workflow-onboarding/adding-built-in-component.md`
  - `docs/current/workflow-onboarding/component-add-contract.md`
  - `docs/current/workflow-onboarding/completion-descriptor-authoring.md`
  - `docs/current/dsl-ssot-types/component-registration-touchpoints.md`
  - `docs/current/testing-ci/new-built-in-sample-regression-stub.md`
- Test / CI guidance overlap:
  - `docs/current/testing-ci/test-matrix.md`
  - `docs/current/testing-ci/ci-quality-gate.md`
  - `docs/current/testing-ci/quality-gate-green-main.md`
  - `docs/current/testing-ci/CI_TEMPLATE.md`
  - `docs/current/testing-ci/real-vscode-smoke.md`
- SSoT inventory and closeout overlap:
  - `docs/current/dsl-ssot-types/dsl-types-renderer-types-inventory.md`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-inventory.md`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-zero-a1-inventory.md`
  - `docs/current/dsl-ssot-types/ssot-renderer-types-zero-metrics-dashboard.md`

### Owner metadata gap

- Current docs rarely declare explicit `Owner`, `Audience`, or `Review cadence` in-file.
- This means the inventory can propose owners, but the repo has not yet enforced page-level metadata.

## Recommended Follow-Up Seeds

1. Introduce an archive policy, then move the historical-note family out of the live `docs/` root.
2. Consolidate overlapping test / CI leaf guides further behind the testing landing page.
3. Add page metadata fields in the governance sprint so proposed owners become in-file owners.
