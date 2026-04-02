# Svelte / Vue Exporter Acceptance Contract

This document fixes the minimum acceptance contract for the Sprint 1
production-ready wave of the Svelte and Vue exporters.

## 1. Required section structure

### Svelte

- Generated output must contain these top-level sections in order:
  1. `<script lang="ts">`
  2. `<main class="textui-generated">...</main>`
  3. `<style>...</style>`
- The file should end with a trailing newline.
- Blank lines between top-level sections are allowed and expected.

### Vue

- Generated output must contain these top-level sections in order:
  1. `<template>...</template>`
  2. `<script setup lang="ts">`
  3. `<style scoped>...</style>`
- The file should end with a trailing newline.
- Blank lines between top-level sections are allowed and expected.

## 2. Compatibility points that must stay aligned with HTML semantics

- Class propagation:
  classes emitted for the primary export lane must survive into Svelte/Vue
  markup unless the framework wrapper itself requires an intentional container
  difference.
- Text content:
  visible text strings from the DSL must be preserved exactly.
- Nesting structure:
  parent-child ordering and meaningful structural grouping must remain aligned
  with the current HTML export semantics.

## 3. Allowed vs not-allowed formatting drift

### Allowed

- indentation differences inside the framework wrapper
- blank-line normalization between top-level sections
- framework wrapper comments or placeholder script/style content

### Not allowed

- dropping a required top-level section
- changing visible text content
- collapsing or reordering semantic nesting
- stripping compatibility-relevant classes from generated markup without an
  explicit contract update

## 4. Fallback expectation

- If normalized extraction cannot safely isolate the intended inner markup, the
  exporter may emit the stable fallback markup block rather than returning an
  invalid file.
- Fallback behavior must preserve deterministic output and must not silently
  remove visible content.
