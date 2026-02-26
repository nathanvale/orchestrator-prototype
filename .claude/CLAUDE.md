# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Branch -- Build & Test Workbench

**You are on the `dev` branch.** This is the maintainer's workbench for building new modules, testing skills, and staging lobby content before it reaches main. Dev has capabilities that main does not -- agents, orchestrator, `/create-module` -- because it is a build environment, not a user-facing branch.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

### Dev Branch Rules

**REBASE ONLY:** Dev stays current with main via `git rebase main`. Never merge dev into main. Lobby content moves to main via feature branches (PRs), never directly from dev.

**Dev-exclusive artifacts** (these files exist ONLY on dev, never on main):

| Path | Purpose |
|------|---------|
| `.claude/agents/builder.md` | Builder agent for module construction |
| `.claude/agents/validator.md` | Validator agent for module verification |
| `.claude/skills/orchestrator/` | Orchestrator skill (dev version) |
| `.claude/commands/orchestrate.md` | `/orchestrate` command shim |
| `.claude/rules/rebase-checklist.md` | Rebase procedure (dev-only workflow) |
| `docs/` | Patterns source docs, plans, brainstorms, agents catalog |
| `specs/` | Master plan, stage definitions, examples |

**Shared with main** (these exist on both branches -- edits here get cherry-picked/PR'd to main):

| Path | Purpose |
|------|---------|
| `.claude/skills/agentic-dojo/` | Pattern teacher |
| `.claude/skills/pattern-advisor/` | Pattern recommender |
| `.claude/skills/module-branch-validator/` | Module validation |
| `.claude/references/patterns/` | 11-slot pattern refs |
| `.claude/commands/learn.md` | `/learn` command |
| `.claude/commands/lobby.md` | `/lobby` command |

### How Content Flows: Dev -> Main

```
dev (build here) --> feature branch (PR) --> main (lobby)
                     ^                        |
                     |                        |
                     +--- git rebase main ----+
```

1. Build/test on dev
2. Create a feature branch from main for the lobby changes
3. Cherry-pick or recreate the lobby-safe commits onto the feature branch
4. PR the feature branch to main
5. After merge, rebase dev onto main (see procedure below)

**NEVER merge dev directly into main.** Dev has agents and orchestrator artifacts that violate main's rules.

### Rebasing Dev onto Main

**Do NOT use plain `git rebase main`.** PRs use squash-merge, so replaying already-merged commits causes conflict hell. Always use `--onto`:

```bash
git fetch origin main
MERGE_BASE=$(git merge-base dev origin/main)
git rebase --onto origin/main $MERGE_BASE dev
# resolve conflicts (CLAUDE.md is the usual one)
git push origin dev --force-with-lease
```

**Full checklist with conflict resolution:** `.claude/rules/rebase-checklist.md`

---

## Orchestrator Prototype -- Learning Lobby

This repo is the HOP Orchestrator prototype -- a learning hub for agent orchestration patterns. Main holds the learning tools and pattern library. Each module branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson you checkout to see a working orchestrator at that complexity level.

---

## What This Repo Is

An educational repository for learning agent orchestration patterns incrementally. The **lobby (main)** houses:

- `/learn` -- browse available modules and stages
- `/dojo` -- Miyagi-style pattern teacher (explains orchestration concepts)
- `/advisor` -- recommends patterns for your problem
- `.claude/references/patterns/` -- single source of truth for pattern content (11-slot frontmatter)

The orchestrator itself does NOT live on main. To run `/orchestrate`, checkout a module branch:

```bash
git checkout orchestration/1-dispatch   # Simplest: single-task dispatch loop
git checkout orchestration/9-browser    # Latest: Browser validation + Ralph Wiggum loop
```

**See:** `.claude/references/patterns/` for pattern content and source anchors.

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
  references/
    patterns/         # Single source of truth for pattern content (11-slot frontmatter)
  settings.json       # Tool permissions
  CLAUDE.md           # This file

prompts/              # Curated test prompts per stage

tsconfig.json         # TypeScript config (needed for module branches)
biome.json            # Biome config (needed for module branches)
package.json          # Project config (simplified -- no src/ on main)
```

**Not on main:** `.claude/agents/`, `.claude/skills/orchestrator/`, `.claude/commands/orchestrate.md`, `scripts/emit-event.ts`, `src/`, `tests/`, `docs/`, `specs/`

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

### Source Anchor Resolution

Agents and humans resolve source anchors to view proof code on module branches:

```bash
# View a specific anchor range
git show orchestration/4-hop:.claude/skills/orchestrator/SKILL.md | sed -n '33,60p'

# View an entire reference file
git show orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md
```

Source anchors use the format `<branch>:<file-path>:L<start>-L<end>`. The `sed -n` command extracts the line range. For anchors without line numbers, `git show` displays the entire file.

---

## Adding a New Pattern

1. Create `.claude/references/patterns/pattern-<slug>.md` with 11-slot frontmatter
   (copy an existing pattern file as template -- verify all 11 slots are present)
2. Add keyword row to `.claude/skills/agentic-dojo/SKILL.md` Step 2 pattern table
3. Add aliases to SKILL.md Step 2 alias table
4. Add slug to SKILL.md zero-state pattern list
5. If Pattern Advisor exists: add scoring signals for the new pattern

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
git show main:.claude/references/patterns/pattern-wave-computation.md
```

---

## Special Rules

### ALWAYS

1. Use named exports (no defaults)
2. Add JSDoc to exported functions
3. Use `.claude/references/patterns/` as the single source of truth for pattern content
4. Use 11-slot frontmatter in all pattern reference files
5. Use feature branches + PRs to move lobby content from dev to main

### NEVER

1. Push directly to main
2. Merge dev into main (use feature branch PRs instead)
3. Add orchestrator execution artifacts to main (no agents, no orchestrate.md, no emit-event)
4. Use destructive git commands (`reset --hard`, `push --force`)
5. Add orchestration logic to main -- it belongs on module branches only

### Dev Branch Permissions

On dev, these are **allowed** (unlike main):
- `.claude/agents/` -- builder and validator agents
- `.claude/skills/orchestrator/` -- orchestrator with dynamic skill injection
- `.claude/commands/orchestrate.md` -- orchestrate command
- `docs/plans/` -- work-in-progress implementation plans
- Running `/orchestrate`, `/create-module`, and build workflows
