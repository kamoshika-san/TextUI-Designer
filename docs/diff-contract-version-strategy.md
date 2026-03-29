# Diff Contract Version Strategy (E3-1)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-179`

## Purpose

This document defines the versioning and compatibility strategy for the external
diff result contract (`diff-result-external`).  It determines what constitutes
an additive vs breaking change, when the `schemaVersion` value must change, and
what consumers must do when facing an unknown version.

It specifies:
- the change classification taxonomy (additive / breaking / cosmetic)
- the version bump policy
- the consumer fallback strategy minimum requirement
- the alignment with the E1-2 serialization policy

It does not specify:
- how a migration path is implemented (E3-3 checklist / future E3 migration work)
- CLI rendering behavior for old artifacts (E2-1)
- PR export backward compatibility (future E3 concern)

---

## 1. Current version baseline

| Field | Value |
|---|---|
| `schemaVersion` | `'diff-result-external/v0'` |
| JSON Schema | `schemas/diff-result-external-v0.json` |
| TypeScript type | `DiffResultExternal` in `src/core/textui-diff-result-external.ts` |

This document applies to all changes from `v0` forward.

---

## 2. Change classification taxonomy

### 2.1 Additive change

An additive change adds capability without removing or reinterpreting existing
fields.  Consumers that do not know about the new field continue to work
correctly by ignoring it.

**Additive change criteria (all must be true):**

- No existing required field is removed.
- No existing field's semantic meaning changes.
- No existing enum value is removed or reinterpreted.
- The new field is optional (`?` in TypeScript; not in `required[]` in JSON Schema).

**Examples of additive changes:**
- Adding `diagnostics?: DiffDiagnosticsExternal` (E1-2 extension)
- Adding `summary?: DiffNarrativeSummaryExternal` (E1-2 extension)
- Adding `producedAt?: string` to `DiffResultProducer`
- Adding a new optional field to `DiffExternalEvent`

**Version bump required**: No.  The `schemaVersion` string stays at
`'diff-result-external/v0'` for all additive changes.

### 2.2 Breaking change

A breaking change removes or reinterprets existing contract fields in a way
that causes consumers reading `v0` artifacts with `v1` logic (or vice versa)
to produce wrong results or throw errors.

**Breaking change criteria (any one is sufficient):**

- A required field is removed.
- A field's type changes in an incompatible way (e.g., `string` → `string[]`).
- An existing enum value is removed or semantically reinterpreted.
- A previously optional field becomes required.
- The discriminator `kind` value changes.
- The `additionalProperties: false` constraint is violated by a rename.

**Examples of breaking changes:**
- Removing `events[]` or making it optional
- Renaming `pairingReason` to `matchReason`
- Redefining `fallbackMarker: 'none'` to mean something different
- Changing `eventCount` from a count to an array

**Version bump required**: Yes.  Create a new `schemaVersion` value
(e.g., `'diff-result-external/v1'`) and a new JSON Schema file
(`schemas/diff-result-external-v1.json`).

### 2.3 Cosmetic change

A cosmetic change has no semantic effect on consumers.

**Cosmetic change examples:**
- Updating a JSON Schema `$comment` or `description` string
- Adding TypeScript JSDoc comments to an existing type
- Re-ordering fields within an interface (no structural effect in JSON)

**Version bump required**: No.

---

## 3. Version bump policy

### 3.1 When to bump

A `schemaVersion` bump is required **only** for breaking changes (section 2.2).
All other changes (additive, cosmetic) must not bump the version.

### 3.2 How to bump

1. Create a new `schemaVersion` literal type:
   ```ts
   export type DiffResultExternalSchemaVersion = 'diff-result-external/v0' | 'diff-result-external/v1';
   ```
2. Create a new JSON Schema file: `schemas/diff-result-external-v1.json`.
3. Update `DiffResultExternal` to use the new version where applicable.
4. Document the breaking change in a migration guide (separate E3 artifact).
5. Keep the old schema file for consumers that need to validate existing artifacts.

### 3.3 Version coexistence

When multiple `schemaVersion` values are active:
- Consumers must read `schemaVersion` before deserializing.
- The diff engine produces only the latest version for new runs.
- Old artifacts (stored as `*.diff.json`) retain their original `schemaVersion`
  and must not be auto-upgraded silently.

---

## 4. Consumer fallback strategy

This section defines the minimum fallback requirements for consumers of the
external diff contract.

### 4.1 Known version

When `schemaVersion` equals a version the consumer was built for:
- Deserialize normally.
- Validate against the matching JSON Schema.

### 4.2 Unknown version (newer than consumer)

When `schemaVersion` is unrecognized:
- Do not throw an unhandled error.
- Emit a `DiffWorkflowError` with `errorKind: 'schema-validation-error'` and
  `userMessage` explaining the version mismatch.
- Do not attempt partial deserialization (risk of silent wrong results).

### 4.3 Stale artifact (older version)

When reading a stored artifact with a version older than the consumer's current
version:
- If the change between versions was additive only: continue reading normally
  (backward compatible).
- If the change was breaking: treat as `DiffWorkflowError.resultState: 'stale'`
  and report to the caller.

### 4.4 Minimum fallback contract

Every consumer of `DiffResultExternal` must implement at minimum:
1. Read `schemaVersion` before processing any other field.
2. Reject unknown versions with a typed error (not an exception).
3. Never silently ignore a schema validation failure.

---

## 5. Alignment with E1-2 serialization policy

The E1-2 serialization policy established that:
- `diagnostics` and `summary` are additive optional top-level fields.
- Adding them does not require a `schemaVersion` bump.

This is consistent with section 2.1 (additive change) of this document.  The
E1-2 fields are scheduled to be added to `schemas/diff-result-external-v0.json`
as optional properties.

---

## 6. What this document does NOT define

- The E3-2 representative baseline for schema versions (separate doc)
- The E3-3 PR/release checklist for contract changes (separate doc)
- Migration tooling for upgrading stored artifacts (future E3 work)
- Semantic versioning of the `textui-diff-core` engine itself (separate concern)
