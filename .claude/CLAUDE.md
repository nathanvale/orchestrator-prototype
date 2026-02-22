# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 4 completes the HOP proof. On top of the Stage 3 full feature set, it adds: team switching via the `--team` flag, team profile resolution (the orchestrator reads `.claude/skills/orchestrator/teams/<name>.md` to resolve agent identities before doing anything else), and two new agents (`research-builder` with WebSearch/WebFetch, `research-validator` with WebFetch for citation verification).

The proof: run the same 12-step dispatch protocol with `--team engineering` (writes code) and `--team research` (writes research reports). The protocol steps are identical. Only `BUILDER_AGENT` and `VALIDATOR_AGENT` differ. The orchestration wrapper is domain-agnostic -- a pure function of agent identities and user prompt.

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
      references/   # Technical references (dag-execution.md)
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
# Default team (engineering) -- same as stage 3
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"

# Explicit engineering team
/orchestrate "add JSDoc to the greet function in src/hello.ts" --team engineering

# Research team -- proves the HOP pattern
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research

# The HOP proof:
# Both commands above run the IDENTICAL 12-step protocol.
# Only BUILDER_AGENT and VALIDATOR_AGENT differ.
# Orchestrator logic: unchanged.
```

---

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files.
- **Research Builder** (sonnet): Researches and synthesizes from web sources. Has WebSearch and WebFetch. Writes markdown research reports, not code.
- **Research Validator** (haiku): Read-only. Spot-checks citations via WebFetch. Reports VERDICT: PASS or VERDICT: FAIL.
- **Orchestrator** (opus): Never writes code. Resolves team profile, creates tasks, dispatches agents, reports results.

---

## Team Profiles

Team profiles live in `.claude/skills/orchestrator/teams/`. The `--team` flag selects the profile.

| Team | Profile | Builder | Validator | Use For |
|------|---------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code tasks (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and analysis |

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
git diff orchestration/3-full..orchestration/4-hop    # What stage 4 adds (team switching)
git diff orchestration/2-dag..orchestration/3-full    # What stage 3 adds
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## What This Stage Does NOT Do

This is Stage 4 (Team Switching). The following capabilities are intentionally absent -- they are added in later stages:

- **No parallel wave execution** -- tasks within a wave run sequentially, one at a time (Stage 8)
- **No difficulty routing** -- no Codex CLI escalation for hard tasks (Stage 6)
- **No spec hardening** -- vague task descriptions are not rewritten before dispatch (Stage 6)
- **No HITL bounce-back** -- the orchestrator cannot pause mid-execution to consult the user (Stage 7)
- **No persistent state store** -- resuming requires re-reading the spec file; there is no hydration checkpoint (Stage 7)
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
git show main:docs/patterns/higher-order-prompt.md

# See what stage 4 adds over stage 3
git diff orchestration/3-full..orchestration/4-hop --stat
```
