# Release Notes v0.8.1

## Summary

v0.8.1 improves the navigation flow preview panel with full route visibility and a cleaner two-column layout.

## What's New

### Routes to here — full path display

When you select a non-entry screen in the flow preview, the panel now shows all loop-free paths from the entry screen to the selected screen. Each route displays:

- the complete screen chain (`Welcome → Company Profile → Admin Setup → Billing`)
- the trigger sequence for each step (`start / next / next`)
- the route number and step count

Previously, only a flat list of edge pairs was shown, making it hard to understand the full traversal path.

### Route pagination

When more than 5 routes exist, Prev/Next controls let you browse all routes 5 at a time. The current page and total route count are shown in the pagination bar.

### Two-column layout

The area below the screen map is now split into two columns:

- **Left**: Routes to here (or Connections for the entry screen)
- **Right**: Selected screen detail (page path, outgoing transitions, actions)

This keeps route information and screen detail visible side by side without scrolling.

## Compatibility

No breaking changes. Existing `.tui.flow.yml` files and v1-style navigation documents are unaffected.

## References

- [`docs/current/dsl-ssot-types/navigation-v2-guide.md`](./navigation-v2-guide.md)
- [`sample/13-enterprise-flow`](../sample/13-enterprise-flow/README.md)
