# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orchestrator Prototype -- Learning Lobby

This is the **lobby** branch of the HOP Orchestrator prototype -- a learning hub for agent orchestration patterns. Main holds the learning tools and pattern library. Each module branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson you checkout to see a working orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

An educational repository for learning agent orchestration patterns incrementally. The **lobby (main)** houses:

- `/learn` -- browse available modules and stages
- `/dojo` -- Miyagi-style pattern teacher (explains orchestration concepts)
- `/advisor` -- recommends patterns for your problem
- `docs/patterns/` -- single source of truth for pattern content (portable)
- `.claude/references/patterns/` -- structured pattern refs with 11-slot frontmatter

The orchestrator itself does NOT live on main. To run `/orchestrate`, checkout a module branch:

```bash
git checkout orchestration/1-dispatch   # Simplest: single-task dispatch loop
git checkout orchestration/7-hitl       # Latest: HITL bounce-back + persistence
```

**See:** `specs/master-plan.md` for the full roadmap, `docs/patterns/` for pattern explanations.

---

## Project Structure

```
.claude/
  commands/
    learn.md          # /learn -- browse modules and stages (lobby only)
    lobby.md          # /lobby -- signpost back to main (inherited by all branches)
  skills/
    agentic-dojo/     # /dojo -- pattern teacher
    pattern-advisor/  # /advisor -- pattern recommender
    module-branch-validator/  # Validation skill for module branch framework compliance
  references/
    patterns/         # Structured pattern refs (11-slot frontmatter)
  settings.json       # Tool permissions
  CLAUDE.md           # This file

docs/
  patterns/           # SINGLE SOURCE OF TRUTH for pattern content (portable)
  agents.md           # Agent catalog (reference only)
  plans/              # Implementation plans

specs/
  master-plan.md      # Full roadmap and stage definitions
  examples/           # Gallery of example spec outputs per stage

prompts/              # Curated test prompts per stage

tsconfig.json         # TypeScript config (needed for module branches)
biome.json            # Biome config (needed for module branches)
package.json          # Project config (simplified -- no src/ on main)
```

**Not on main:** `.claude/agents/`, `.claude/skills/orchestrator/`, `.claude/commands/orchestrate.md`, `scripts/emit-event.ts`, `src/`, `tests/`

---

## 11-Slot Pattern Contract

Pattern reference files in `.claude/references/patterns/` use a canonical 11-slot frontmatter contract. Every pattern ref must include all 11 slots.

### Frontmatter Schema

```yaml
---
slug: <kebab-case-identifier>
display_name: "<Human-readable name>"
one_liner: "<One sentence description of what the pattern does>"
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

### Slot Definitions

| Slot | Heading | Purpose |
|------|---------|---------|
| `pattern_id` | `## Pattern ID` | The slug identifier (e.g., `builder-validator`) |
| `quick_summary` | `## Quick Summary` | 2-4 sentence summary of the pattern and its key enforcement mechanism |
| `when_to_use` | `## When To Use` | Bullet list of trigger conditions |
| `core_mechanism` | `## Core Mechanism` | How the pattern works technically |
| `key_rules` | `## Key Rules` | Numbered list of invariants that must hold |
| `implementation_notes` | `## Implementation Notes` | Practical guidance for builders |
| `failure_modes` | `## Failure Modes` | What goes wrong when the pattern breaks |
| `signals_diagnostics` | `## Signals & Diagnostics` | How to know the pattern is needed, working, or failing |
| `tradeoffs` | `## Tradeoffs` | Gain vs. cost |
| `related_patterns` | `## Related Patterns` | Pattern connections (use slug names) |
| `source_anchors` | `## Source Anchors` | Branch:file:line refs to proof code (see format below) |

### Source Anchor Format

Source anchors bridge pattern docs on main to runnable proof code on module branches:

```
<branch>:<file-path>:L<start>-L<end> -- <description>
```

Example:

```markdown
## Source Anchors

Stage 1 (concept introduction):
- `orchestration/1-dispatch:.claude/skills/orchestrator/SKILL.md:L12-L25` -- HOP variables declared

Stage 4 (proof):
- `orchestration/4-hop:.claude/skills/orchestrator/SKILL.md:L33-L60` -- Team resolution algorithm
- `orchestration/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- Engineering team profile

Planned:
- Planned -- orchestration/8-parallel (not yet created)
```

The dojo displays anchors as navigation hints. The learner manually checks out the branch to see the proof code.

---

## Adding a New Pattern

1. Write source doc in `docs/patterns/<slug>.md`
2. Create `.claude/references/patterns/pattern-<slug>.md` with 11-slot frontmatter
   (copy an existing pattern file as template -- verify all 11 slots are present)
3. Add keyword row to `.claude/skills/agentic-dojo/SKILL.md` Step 2 pattern table
4. Add aliases to SKILL.md Step 2 alias table
5. Add slug to SKILL.md zero-state pattern list
6. If Pattern Advisor exists: add scoring signals for the new pattern

---

## Code Conventions

| Area | Convention |
|------|------------|
| Files | kebab-case (`my-util.ts`) |
| Functions | camelCase (`doSomething`) |
| Types | PascalCase (`MyType`) |
| Exports | Named only (no defaults) |
| Formatting | Biome (tabs, single quotes, 80-char) |
| Exports | Every exported function gets JSDoc |

---

## Key Commands

```bash
# No src/ on main -- module branches have full validate scripts
bun run check            # Biome lint + format (auto-fixes)
bun run lint             # Biome lint (read-only, no fixes)
```

---

## Branch Strategy

**Lobby + module chain.** Main is the knowledge plane -- no execution capability. Each module branch is a self-contained, runnable lesson branching cumulatively from the previous.

```bash
# Compare what each stage adds
git diff orchestration/1-dispatch..orchestration/2-dag    # What stage 2 adds
git diff orchestration/2-dag..orchestration/3-full        # What stage 3 adds

# Read a file from another branch without checking out
git show orchestration/2-dag:.claude/skills/orchestrator/SKILL.md
git show main:docs/patterns/wave-computation.md
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## Special Rules

### ALWAYS

1. Use named exports (no defaults)
2. Add JSDoc to exported functions
3. Keep `docs/patterns/` as the single source of truth for pattern content
4. Use 11-slot frontmatter in all `.claude/references/patterns/` files

### NEVER

1. Push directly to main
2. Add orchestrator execution artifacts to main (no agents, no orchestrate.md, no emit-event)
3. Use destructive git commands (`reset --hard`, `push --force`)
4. Add orchestration logic to main -- it belongs on module branches only
