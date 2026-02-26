# Generation Script Spec (Template)

## Goal
Transform `docs/patterns/*.md` into slot-conforming files in `.claude/references/patterns/`.

## Input
- `docs/patterns/*.md`

## Output
- `.claude/references/patterns/pattern-<slug>.md`

## Transformations
- Map `What It Is` → `Core Mechanism`
- Map `How We Use It Here` → `Implementation Notes`
- Map `Where It Comes From` → `Source Anchors`
- Map `Related Documents` → `Related Patterns` table
- Add `Quick Summary`, `Key Rules`, `When To Use`, `Failure Modes`, `Signals & Diagnostics`, `Tradeoffs`
- Collapse unique sections into `Implementation Notes` or `Variations`

## Schema Validation
- Required H2 headings exist
- Non-empty slot content
- Related Patterns table shape
- Fail with explicit error per missing slot

## CLI
- `bun run generate-patterns`
- Flags: `--dry-run`, `--pattern <slug>`, `--validate-only`

## Incremental
- Regenerate only changed source docs
- New doc creates new pattern file
