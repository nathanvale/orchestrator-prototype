# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`stage/1-dispatch`, `stage/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 6 builds on the HOP pattern established in Stage 4 (team profiles, `--team` flag switching) and the plugin extraction in Stage 5. Stage 6 adds difficulty routing (hard tasks can escalate to Codex CLI) and spec hardening (vague task descriptions are rewritten into unambiguous, implementation-ready specs before dispatch). The 14-step dispatch protocol is identical for all teams -- only agent identities and execution paths change.

Stage 7 builds on Stage 6 by adding HITL bounce-back (a structured protocol for the orchestrator to pause and consult the user mid-execution when it encounters situations that automated retry cannot resolve) and persistence (the spec file becomes a full orchestration state store with hydration checkpoints, enabling cross-session resume via the `--resume` flag).

Stage 5 extracted the working prototype into the `side-quest-plugins` marketplace as the `agentic-orchestration` plugin. The prototype repo remains as-is for educational purposes (readers can still checkout any stage branch), but the living, evolving orchestrator now lives in the plugin. Install with `/plugin install agentic-orchestration@side-quest`.

**Learning tool first.** Built incrementally so each stage teaches one concept. When finished, it doubles as an educational resource for others.

**See:** `specs/master-plan.md` for the full roadmap, `docs/patterns/` for pattern explanations.

---

## Project Structure

```
.claude/
  agents/           # Agent definitions (builder, validator, etc.)
  commands/         # User-facing commands (/orchestrate)
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
# Clarifying questions (vague prompt)
/orchestrate "add authentication"
# The orchestrator will:
# 1. Detect the prompt is vague (no files, no strategy specified)
# 2. Ask clarifying questions (auth strategy, target files, session handling)
# 3. Re-parse with enriched context, then decompose and execute

# Fast path (simple prompt)
/orchestrate "add JSDoc to the greet function in src/hello.ts"
# The orchestrator will:
# 1. Detect this is a single, simple change (1 file, < 20 lines)
# 2. Skip DAG decomposition -- dispatch builder + validator directly
# 3. Report result

# Full flow (multi-task with plan review)
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"
# The orchestrator will:
# 1. Decompose into tasks with dependency waves
# 2. Write a spec file, present the plan for your review
# 3. Show estimated token cost
# 4. Execute wave by wave with retry on failures
# 5. Report enhanced summary with retry stats and cost

# Retry scenario
# If a builder fails validation, the orchestrator:
# 1. Retries the builder up to 3x (using resume to preserve context)
# 2. If still failing after 3 retries, asks you what to do
# 3. Options: skip the task, provide guidance, or abort

# Team switching (Stage 4)
/orchestrate "research top 5 TS testing frameworks" --team research
# The orchestrator will:
# 1. Parse --team research from the prompt
# 2. Read the research team profile to resolve agent identities
# 3. Dispatch research-builder (with WebSearch/WebFetch) and research-validator
# 4. Same 14-step protocol, different agents

# Codex routing (Stage 6)
/orchestrate "refactor the auth module from class-based to functional across 8 files"
# The orchestrator will:
# 1. Decompose into tasks, assess difficulty (some tagged as 'hard')
# 2. Harden spec descriptions (resolve file paths, concrete acceptance criteria)
# 3. Route hard tasks to Codex CLI (if installed), standard tasks to Claude Code builder
# 4. Fall back to standard builder if Codex is unavailable

# Disable Codex routing
/orchestrate "refactor the auth module" --no-codex
# Forces all tasks through the standard Claude Code builder

# Bounce-back scenario (Stage 7)
/orchestrate "add a user module using class-based OOP patterns"
# If the builder detects conflicting patterns in existing code:
# 1. The orchestrator pauses and presents the conflict
# 2. You choose: proceed with classes, switch to functional, or restructure
# 3. The orchestrator resumes with your decision

# Resume interrupted orchestration (Stage 7)
/orchestrate --resume specs/rest-api.md
# The orchestrator will:
# 1. Read the spec file's Hydration Checkpoint
# 2. Skip completed tasks
# 3. Re-dispatch in-progress tasks
# 4. Continue from the last checkpoint
```

---

## Architecture: Three-Tier Dispatch

The orchestrator never writes code itself. It decomposes prompts into a task DAG, writes a spec file to `specs/`, then dispatches agents wave by wave:

```
User prompt -> Orchestrator (opus) -> team profile -> spec file -> [difficulty check] -> Builder (sonnet) OR Codex CLI -> Validator (haiku)
                                                      ^                                           |
                                                      +--- retry (up to 3x, resume: agentId) ----+
```

- **Spec files** (`specs/*.md`) are the contract between orchestrator and agents. The orchestrator re-reads the spec at each wave to survive context compaction. In Stage 7, spec files also include a Hydration Checkpoint -- a serialised snapshot of orchestration state that enables cross-session resume via `--resume`.
- **HITL bounce-back** -- when the orchestrator encounters a decision that automated retry cannot resolve (conflicting patterns, ambiguous requirements, missing context), it pauses and presents the decision to the user. Execution resumes once the user responds.
- **Agents** are defined in `.claude/agents/` with model and tool constraints in YAML frontmatter.
- **Skills** in `.claude/skills/` define the orchestrator's behavior (`/orchestrate` command triggers `orchestrator/SKILL.md`).
- **Team profiles** in `.claude/skills/orchestrator/teams/` define which builder and validator agents are dispatched. The `--team` flag selects a profile; the default is `engineering`.

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files.
- **Orchestrator** (opus): Never writes code. Creates tasks, dispatches agents, reports results.
- **Research Builder** (sonnet): Researches and synthesizes information from web sources. Has WebSearch and WebFetch tools.
- **Research Validator** (haiku): Read-only. Verifies research coverage, citation quality, and source recency. Has WebFetch for source verification.
- **Codex CLI** (external): Alternative builder for hard tasks. Invoked via `codex exec --full-auto`. Falls back to standard builder on failure.

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
bun run validate         # Full quality check (lint + typecheck + test) -- run before pushing
bun run check            # Biome lint + format (auto-fixes)
bun run lint             # Biome lint (read-only, no fixes)
bun typecheck            # TypeScript type checking
bun test                 # Run all tests
bun test tests/foo.test.ts  # Run a single test file
bun test --watch         # Watch mode for tests
```

---

## Branch Strategy

**Cumulative chain:** each stage branches from the previous stage. Main holds the latest complete state. Stage branches are permanent snapshots for readers.

```bash
# Diff commands for readers
git diff stage/1-dispatch..stage/2-dag       # What stage 2 adds
git diff stage/2-dag..stage/3-full           # What stage 3 adds
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## What This Stage Does NOT Do

This is Stage 7 (HITL Bounce-Back + Persistence). The following capabilities are intentionally absent -- they are added in later stages:

- **No parallel wave execution** -- tasks within a wave run sequentially, one at a time (Stage 8)
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions, not actual usage reported by the API (future)

---

## Special Rules

### ALWAYS

1. Run `bun run validate` before pushing
2. Use named exports (no defaults)
3. Add JSDoc to exported functions

### NEVER

1. Push directly to main
2. Skip validation before commits
3. Use destructive git commands (`reset --hard`, `push --force`)
4. Let the orchestrator write code directly (it dispatches agents)

## Adding a New Pattern

1. Write source doc in `docs/patterns/<slug>.md`
2. Create `.claude/references/patterns/pattern-<slug>.md` with YAML frontmatter
   (copy an existing pattern file as template -- verify `slots` map matches
   slot contract)
3. Add keyword row to `.claude/skills/agentic-dojo/SKILL.md` Step 2 pattern table
4. Add aliases to SKILL.md Step 2 alias table
5. Add slug to SKILL.md zero-state pattern list
6. If Pattern Advisor exists: verify advisor SKILL.md can score the new pattern
