# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 6 adds difficulty routing and spec hardening to the 14-step dispatch protocol. Hard tasks (touching 5+ files, cross-module refactors, migrations) are escalated to Codex CLI when available. Vague task descriptions are rewritten into concrete specs with explicit file paths and measurable acceptance criteria before any agent is dispatched. The `--no-codex` flag disables Codex routing for the entire orchestration.

The prototype repo is a learning tool: checkout any stage branch to see the orchestrator at that complexity level. The living, maintained implementation lives in the plugin: `/plugin install agentic-orchestration@side-quest`.

**Learning tool first.** Built incrementally so each stage teaches one concept. When finished, it doubles as an educational resource for others.

**See:** `specs/master-plan.md` for the full roadmap, `docs/patterns/` for pattern explanations.

---

## Project Structure

```
.claude/
  agents/           # Agent definitions (builder, validator, research-builder, research-validator)
  commands/         # User-facing commands (/orchestrate, /lobby)
  skills/           # Skill definitions (orchestrator SKILL.md)
    orchestrator/
      references/   # Technical references (dag-execution.md, codex-escalation.md)
      teams/        # Team profiles (engineering.md, research.md)
  settings.json     # Tool permissions

specs/              # Spec files written by the orchestrator before agent dispatch + master plan
specs/examples/     # Gallery of example spec outputs per stage
prompts/            # Curated test prompts per stage
docs/patterns/      # Pattern docs - what, how, why (progressive per stage)
src/                # Source code (target for orchestrated tasks)
tests/              # Tests
```

---

## How to Use

```bash
# Standard orchestration -- difficulty routing and spec hardening run automatically
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"

# Hard task routing -- tasks touching 5+ files are escalated to Codex CLI
/orchestrate "refactor the user module from class-based to functional across 8 files"

# Spec hardening -- vague descriptions are rewritten before dispatch
/orchestrate "add error handling"
# The orchestrator will ask clarifying questions (Step 2), then harden
# any remaining vague criteria in Step 7b

# Disable Codex routing for this run
/orchestrate "refactor the auth module" --no-codex
# Forces all tasks through the standard Claude Code builder

# Research team
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research

# The HOP proof:
# --team research and --team engineering run the IDENTICAL 14-step protocol.
# Only BUILDER_AGENT and VALIDATOR_AGENT differ.
# Difficulty routing and spec hardening apply to all teams.
```

---

## What This Stage Adds

Stage 6 adds two new inline sub-steps to the dispatch protocol:

### Step 4b: Difficulty Assessment (new)
After task decomposition, each task is scored against hard/standard signals:
- Hard: touches 5+ files, refactor/migration keywords, 5+ acceptance criteria, cross-module analysis
- Standard: greenfield, 1-2 files, pattern-following, clear I/O

Hard-tagged tasks become candidates for Codex CLI escalation. The `codex.checked` event records whether Codex is installed.

### Step 7b: Spec Hardening (new)
After plan approval, each task description is audited for ambiguity signals:
- Vague phrases ("handle appropriately", "as needed")
- Missing file paths ("the types file")
- Unspecified error handling ("return an error")
- Unmeasurable acceptance criteria ("works correctly")

Ambiguous descriptions are rewritten with concrete file paths, specific error responses, and testable assertions. The original description is preserved in a `Pre-Hardening` subsection.

### Codex Dispatch Path (in Step 10)
For hard tasks with CODEX_ENABLED=true, the orchestrator invokes:
```
codex exec --full-auto '<full hardened task description>'
```
On Codex failure, the standard builder is used as a transparent fallback.

### New files in this stage:
- `.claude/skills/orchestrator/references/codex-escalation.md` -- Codex integration reference
- `docs/patterns/difficulty-routing.md` -- difficulty routing pattern doc
- `docs/patterns/spec-hardening.md` -- spec hardening pattern doc
- `prompts/stage-6/` -- test prompts for this stage
- Updated `SKILL.md` to ~945 lines (up from 769 in stage 5)

---

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files.
- **Research Builder** (sonnet): Researches and synthesizes from web sources. Has WebSearch and WebFetch. Writes markdown research reports, not code.
- **Research Validator** (haiku): Read-only. Spot-checks citations via WebFetch. Reports VERDICT: PASS or VERDICT: FAIL.
- **Orchestrator** (opus): Never writes code. Resolves team profile, assesses difficulty, hardens specs, dispatches agents, reports results.
- **Codex CLI** (external): Alternative builder for hard tasks. Invoked via `codex exec --full-auto`. Falls back to standard builder on failure.

---

## Team Profiles

Team profiles live in `.claude/skills/orchestrator/teams/`. The `--team` flag selects the profile.

| Team | Profile | Builder | Validator | Use For |
|------|---------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code tasks (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and analysis |

Difficulty routing and spec hardening apply to all teams. The validator always runs regardless of which builder path executed the task.

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
bun run validate         # Full quality check (lint + typecheck + test)
bun run check            # Biome lint + format (auto-fixes)
bun typecheck            # TypeScript type checking
bun test                 # Run all tests
```

---

## Branch Strategy

**Cumulative chain:** each stage branches from the previous stage. Main is the lobby -- it holds learning tools but no orchestrator.

```bash
# Diff commands for readers
git diff orchestration/5-plugin..orchestration/6-codex    # What stage 6 adds (difficulty routing, spec hardening)
git diff orchestration/4-hop..orchestration/5-plugin      # What stage 5 adds (plugin extraction docs)
git diff orchestration/3-full..orchestration/4-hop        # What stage 4 adds (team switching)
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## What This Stage Does NOT Do

This is Stage 6 (Difficulty Routing + Spec Hardening). The following capabilities are intentionally absent -- they are added in later stages:

- **No HITL bounce-back** -- the orchestrator cannot pause mid-execution to consult the user when it detects conflicting patterns or architectural decisions (Stage 7)
- **No persistent state store** -- there is no hydration checkpoint in the spec file; resuming an interrupted orchestration uses status-based idempotency only (Stage 7)
- **No `--resume` flag** -- cross-session resume is not supported (Stage 7)
- **No parallel wave execution** -- tasks within a wave run sequentially, one at a time (Stage 8)
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions (future)

---

## Special Rules

### ALWAYS

1. Run `bun run validate` before pushing
2. Use named exports (no defaults)
3. Add JSDoc to exported functions

### NEVER

1. Push directly to main
2. Use destructive git commands (`reset --hard`, `push --force`)
3. Let the orchestrator write code directly (it dispatches agents)

---

## Cross-Branch Access

To return to the lobby: `git checkout main`

On main you have access to `/learn`, `/dojo`, and `/advisor` for pattern learning.

To read files from any branch without checking out:
```bash
# Read pattern docs from main while on this branch
git show main:docs/patterns/difficulty-routing.md
git show main:docs/patterns/spec-hardening.md

# See what stage 6 adds over stage 5
git diff orchestration/5-plugin..orchestration/6-codex --stat

# See what stage 5 added over stage 4
git diff orchestration/4-hop..orchestration/5-plugin --stat
```
