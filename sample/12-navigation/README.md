# 12-navigation

Baseline navigation flow sample for the Phase 1 contract.

## Purpose

Use this sample when you want the smallest valid `.tui.flow.yml` example:

- simple validation and diagnostics
- baseline export smoke checks
- comparison point for v1-style authoring before Navigation v2 metadata is added

## What It Covers

- three screens: `cart`, `shipping`, `confirm`
- two forward transitions
- no explicit graph-first metadata
- no terminal metadata
- no loop policy
- no stable `transition.id`

## What It Does Not Cover

This sample is intentionally not the representative v2 example.

It does not demonstrate:

- branching
- retry or backtrack edges
- loop semantics
- terminal success or failure screens
- stable transition identity

## When To Use Another Sample

If you need a graph-first Navigation v2 reference for migration, regression, or rollout, use [`../13-enterprise-flow`](../13-enterprise-flow/README.md) instead.
