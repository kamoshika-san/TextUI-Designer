# Documentation Consolidation Rules

Updated: 2026-03-27
Owner: Maintainer
Audience: Maintainer, Reviewer, PM, TM
Review cadence: monthly

## Goal

Define one rule set for deciding whether a page stays canonical, becomes a supporting leaf, is marked historical, or is superseded. This keeps cleanup work aligned with the documentation inventory and information architecture instead of rewriting pages ad hoc.

## Inputs

- `docs/documentation-inventory.md`
- `docs/documentation-information-architecture.md`

## Page States

| State | Meaning | Update policy |
|---|---|---|
| Canonical | The one page that answers the main question for a topic and reader lane | keep current, accept routine edits |
| Supporting | A leaf page that contains detail, matrices, or subsystem-specific rules under a canonical page | keep current, but do not restate the full overview |
| Historical | A frozen note kept for context, release history, or past planning | do not extend with current procedure text |
| Superseded | A page retained temporarily only to point readers to the replacement | do not add new behavior or guidance |

## Decision Flow

1. Classify the page into one IA lane before editing it.
2. Identify the reader question the page is supposed to answer.
3. Check whether another page already answers the same question for the same reader lane.
4. Choose one canonical page for that question and downgrade the others to supporting, historical, or superseded.
5. Only after the state is clear, decide whether the page should be rewritten, linked, or later moved.

## One Topic, One Canonical Page

1. If two pages serve the same reader and answer the same operational question, only one of them may remain canonical.
2. A canonical page may link to supporting pages, but it must not duplicate their procedure text line by line.
3. Supporting pages are allowed when they hold narrow material such as:
   - subsystem boundary detail
   - guard matrices
   - inventories and measurements
   - sample-specific implementation notes
4. Historical pages must not stay on the default reader path for current work.

## Merge vs Keep Separate

Keep pages separate when all of the following are true:

- the reader lane is different
- the maintenance owner is different, or the update trigger is different
- the detailed page would make the overview page harder to scan

Merge or shrink pages when any of the following are true:

- both pages repeat the same setup, command, or review steps
- both pages are being updated for the same change almost every time
- readers must open multiple pages to complete one routine task
- one page is just a stale restatement of another canonical page

## Redirect And Replacement Rules

When a page stops being canonical, it must leave a visible forward pointer.

- Historical pages must say why they are kept and which current page replaces their operational guidance, if one exists.
- Superseded pages must name the replacement page in the first visible section.
- Cross-links are not enough if the old page still reads like active guidance; the status must be explicit.
- If a future archive move happens, the moved page must still keep the same replacement or retention note.

## Minimum Metadata Before Archive Or Supersede

Before a page can be archived or marked superseded, capture at least:

- current state: `historical` or `superseded`
- reason for the state change
- replacement page, or explicit `historical only` note
- last meaningful update date
- owner for future questions

If any of those are missing, the page is not ready for archive-style handling.

## Minimum Metadata For New Or Rewritten Canonical Pages

New or heavily rewritten canonical pages should declare:

- `Updated`
- `Owner`
- `Audience`

`Review cadence` is recommended for governance, testing, operations, and high-drift specification pages.

## Current Repo Guidance

- `README.md` should stay an entry page, not a second home for full setup and contribution detail.
- Boundary guides may stay split by subsystem because they answer different ownership questions.
- Inventory and metrics pages can stay separate from policy pages, but they must link back to one canonical policy page.
- Release notes, sprint closeout notes, and spike documents belong to the historical lane once archive handling is available.
- Missing destinations already identified by the inventory, such as `CONTRIBUTING.md` and a setup landing page, should be created before live workflow prose is spread further.

## Immediate Use In Epic D

Use this rule set to:

1. decide which overlap clusters from the inventory should merge versus stay as overview-plus-leaf
2. define the scoring basis for prioritization work in `DOC-004`
3. keep future archive moves consistent once a historical folder policy is introduced

## Out Of Scope Here

- moving files
- rewriting `README.md`
- creating `CONTRIBUTING.md`
- assigning numerical priority scores
