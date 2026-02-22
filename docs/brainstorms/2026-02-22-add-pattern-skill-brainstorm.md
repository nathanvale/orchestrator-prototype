---
date: 2026-02-22
topic: add-pattern-skill
---

# Add Pattern Skill: Atomic Pattern Pipeline for the Agentic Dojo

## What We're Building

A single slash command (`/dojo:add-pattern`) that takes a pattern idea from raw notes to a fully integrated, battle-tested dojo pattern in one invocation. It dogfoods the orchestrator's own builder/validator dispatch to create the pattern -- eating its own cooking.

**The funnel:**
```
Input (notes/plan/inline idea)
  -> Collision check (does pattern already exist?)
  -> Read & map content to slot contract
  -> Generate plan (show user for approval)
  -> Dispatch builder:
       - Create pattern file (.claude/references/patterns/)
       - Wire SKILL.md routing (aliases, keywords, zero-state)
       - Wire advisor SKILL.md
       - Create/identify proof code
       - Set source anchors pointing to real code lines
  -> Dispatch validator:
       - Slot contract conformance
       - SKILL.md wiring consistency
       - Source anchors resolve to real files + real lines
       - Proof code is relevant to the pattern
       - VERDICT: PASS / FAIL
  -> Done. Pattern is live in the dojo.
```

## Why This Approach

### Full pipeline, one command

Every time you context-switch between commands, you burn working memory. For ADHD, momentum is everything. The flow from "I just learned something" to "it's in the dojo" needs to be one unbroken ride. One command, one approval checkpoint, one completion dopamine hit.

Three separate invocations (`/brainstorm` then `/plan` then `/add-pattern`) means the pattern idea dies in the gap between step 2 and step 3. One command with an approval gate in the middle preserves momentum without sacrificing control.

### Dogfooding the orchestrator

The add-pattern skill uses the dojo's own patterns to build new patterns:
- **Builder/Validator** -- separate creation from verification
- **Dispatch Loop** -- orchestrator sequences builder then validator
- **Retry with Resume** -- if validator says FAIL, builder retries with context
- **Spec as Source of Truth** -- the plan generated before dispatch is the contract

This means observability works too -- dispatches post to the observability server, and you can watch the pattern being built on the dashboard.

### Patterns are immutable

Once a pattern passes validation and enters the dojo, it's locked. There is no `/dojo:update-pattern` skill. This is a deliberate design choice:
- Every pattern in the dojo is trustworthy -- no drift, no silent edits
- The validator's PASS is a permanent stamp of quality
- If a pattern needs a minor fix (typo, shifted line numbers), that's a manual edit (see "Pattern Maintenance" below)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single source of truth | `.claude/references/patterns/` only | Kill `docs/patterns/`. Humans read patterns through `/dojo`, not raw files. The slot contract format serves the HOP system. |
| Input flexibility | Any markdown file or inline conversation | The skill extracts what maps to slots. Could be brainstorm notes, a plan doc, research notes, or a description in the conversation. |
| Collision check | Hard block if pattern slug exists | Patterns are immutable. No overwrite, no merge, no versioning. If it exists, stop cold. |
| Proof code requirement | Proof is part of the build | The builder creates proof code as part of the pattern. Source anchors point to real files with real line numbers. No pattern ships without proof. |
| Proof code location | Wherever it naturally fits | No dedicated `src/patterns/` directory. The builder/validator pattern's proof IS the agent files. The HOP pattern's proof IS the orchestrator SKILL.md. New patterns create proof wherever makes sense for that pattern. Source anchors are pointers, not copies. |
| Build method | Orchestrate with builder/validator dispatch | Dogfoods the dojo's own patterns. Builder creates, validator independently verifies. Retry with resume on failure. |
| Update mechanism | None (manual escape hatch) | No update skill. Manual edits for minor fixes. See "Pattern Maintenance" section. |

## The Slot Contract

Every pattern file must conform to this frontmatter + section structure:

```yaml
---
slug: <kebab-case>
display_name: "<Human Readable Name>"
one_liner: "<Single sentence description>"
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---
```

The builder maps input content to these slots. The validator checks every slot key exists in the file.

## Source Anchors Contract

Source anchors point to real files with real line numbers in this repo:

```markdown
## Source Anchors

- `.claude/agents/builder.md:L1-L25` -- Builder agent definition with tool constraints
- `.claude/agents/validator.md:L1-L20` -- Validator with disallowedTools enforcement
- `.claude/skills/orchestrator/SKILL.md:L45-L62` -- Dispatch loop that sequences them
```

**Validator checks:**
1. Each referenced file exists
2. Each referenced line range is within the file's bounds
3. The content at those lines is relevant to the pattern (the validator reads the lines and confirms they demonstrate the pattern's core mechanism)

## Pattern Maintenance (Escape Hatch)

Patterns are immutable by design -- no update skill exists. For minor fixes, edit manually:

| What changed | File to edit | Scope |
|---|---|---|
| Slot content (typo, better wording) | `.claude/references/patterns/pattern-<slug>.md` | One section in one file |
| Alias wrong or missing | `.claude/skills/agentic-dojo/SKILL.md` alias table | One table row |
| Keyword wrong or missing | `.claude/skills/agentic-dojo/SKILL.md` keyword table | One table row |
| Source anchor line numbers shifted | `.claude/references/patterns/pattern-<slug>.md` Source Anchors section | Update line numbers |
| Advisor scoring issue | `.claude/skills/pattern-advisor/SKILL.md` | One keyword row |

Worst case: 3 files. Best case (most common): just the pattern file.

No duplication exists -- the pattern file is the single source of truth, SKILL.md has routing pointers only.

## Validator Checklist

The validator checks all of these on every add-pattern run:

- [ ] Pattern slug is unique (not in alias table, keyword table, or existing pattern files)
- [ ] Pattern file exists at `.claude/references/patterns/pattern-<slug>.md`
- [ ] YAML frontmatter has all required fields (slug, display_name, one_liner, slots)
- [ ] All 11 slot keys exist in the frontmatter slots map
- [ ] All 11 sections (## headings) exist in the file body
- [ ] No section is empty (each has at least one line of content)
- [ ] Alias table in dojo SKILL.md has at least one alias for the new pattern
- [ ] Keyword table in dojo SKILL.md has a row for the new pattern with file path
- [ ] Zero-state pattern list in dojo SKILL.md includes the new slug
- [ ] Source anchors reference files that exist in the repo
- [ ] Source anchor line ranges are within file bounds
- [ ] Source anchor content is relevant to the pattern
- [ ] Advisor SKILL.md can reference the new pattern (if advisor exists)

## Open Questions

- **Should the skill also run `/dojo explain <new-pattern>` as a smoke test after PASS?** Would confirm the full routing chain works end-to-end, but adds token cost.
- **Should `docs/patterns/` be deleted now or archived?** The slot contract files in `.claude/references/patterns/` are the single source of truth. The `docs/patterns/` files are redundant. Could delete them or keep as historical artifacts on the stage branches.
- **What happens to the "Adding a New Pattern" checklist in CLAUDE.md?** It currently describes a manual process. Should it point to `/dojo:add-pattern` instead, with the manual steps as fallback?

## Next Steps

-> `/workflows:plan` for implementation details
