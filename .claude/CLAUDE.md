# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`orchestration/1-dispatch`, `orchestration/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 8 adds parallel wave execution and worktree isolation to the complete 14-step dispatch protocol. When a wave contains multiple independent tasks, the orchestrator dispatches their builders concurrently -- each in a temporary git worktree for file isolation. Results are merged after all builders complete, then validators run on the merged state. If merge conflicts occur, conflicting tasks fall back to sequential re-execution automatically.

This builds on all previous stages: HITL bounce-back (Stage 7), Codex routing (Stage 6), spec hardening (Stage 6), team switching (Stage 4), etc.

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
      references/   # Technical references (dag-execution.md, codex-escalation.md, hitl-protocol.md)
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
# Standard orchestration -- parallel dispatch runs automatically for multi-task waves
/orchestrate "add a REST API with GET /users, POST /users, and DELETE /users"
# Expect parallel dispatch for all 3 endpoint tasks in the same wave

# Force sequential execution (Stage 7 behavior) -- useful for debugging
/orchestrate "add GET /users, POST /users, DELETE /users" --sequential

# Hard task routing -- tasks touching 5+ files are escalated to Codex CLI
/orchestrate "refactor the user module from class-based to functional across 8 files"

# Disable Codex routing
/orchestrate "refactor the auth module" --no-codex

# Research team
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research

# Resume an interrupted orchestration
/orchestrate --resume specs/rest-api.md
# The orchestrator will:
# 1. Read the spec file's Hydration Checkpoint section
# 2. Restore all state: wave position, agent sessions, retry counters, bounce history, sequential mode
# 3. Re-present any unresolved bounce-backs
# 4. Skip completed tasks (idempotency)
# 5. Resume from the correct wave with the same dispatch strategy (parallel or sequential)
```

---

## What This Stage Adds

Stage 8 adds parallel wave execution and worktree isolation to the 14-step dispatch protocol.

### --sequential flag (in Step 1)
`/orchestrate --sequential` disables parallel dispatch for the entire run. Every wave executes tasks one at a time (Stage 7 behavior). Useful for debugging or when the codebase has fragile shared state.

### Parallel Dispatch Decision (in Step 10)
Before each wave, the orchestrator checks:
- If SEQUENTIAL_MODE is true: sequential dispatch (one task at a time)
- If the wave has 1 task: sequential dispatch (no benefit from parallelism)
- If the wave has 2+ tasks: parallel dispatch (all builders launched concurrently)

### Worktree Isolation (in Step 10)
Each parallel builder is dispatched with `isolation: "worktree"`. The agent framework creates a temporary git worktree -- an isolated copy of the repository at a separate path. Builders write freely without file coordination. Worktrees are cleaned up after results are merged.

### Merge Protocol (in Step 10)
After all parallel builders complete, results are merged into the main working tree in task-id order:
1. Generate a diff from each worktree: `git -C <worktree-path> diff HEAD`
2. Apply the diff to the main working tree: `git apply <diff>`
3. If apply fails (conflict): record the task for sequential re-execution

### Conflict Resolution (in Step 10)
If any merge conflicts are detected:
1. Emit `wave.conflict_detected` with the list of conflicting tasks
2. Re-execute ONLY the conflicting tasks sequentially (standard builder dispatch)
3. Emit `wave.conflict_resolved` after sequential re-execution completes

### Parallel Validators (in Step 10)
After all builders are merged and bounce-back is clear, validators are dispatched concurrently (same parallel protocol). Validators run on the merged state so they can verify cross-task consistency.

### New files in this stage:
- `docs/patterns/parallel-dispatch.md` -- parallel dispatch pattern: what, how, why
- `docs/patterns/worktree-isolation.md` -- worktree isolation pattern: isolation mechanics, merge strategy
- `prompts/stage-8/` -- test prompts for this stage
- `specs/examples/stage-8-parallel-dispatch.md` -- example output for parallel wave execution
- Updated `SKILL.md` to ~1200 lines (up from 1114 in stage 7)

---

## What This Stage Does NOT Do

- **No browser-based validation** -- validators check code, not visual output (Stage 9)
- **No visual regression testing** -- no screenshot comparison or visual diff
- **No cross-browser testing** -- validators run in the agent environment only
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions (future)

---

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes. Output scanned for bounce-back triggers. In parallel mode, runs in an isolated worktree.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files. VERDICT: PASS scanned for design-concern trigger. In parallel mode, runs on the merged state.
- **Research Builder** (sonnet): Researches and synthesizes from web sources. Has WebSearch and WebFetch. Writes markdown research reports, not code.
- **Research Validator** (haiku): Read-only. Spot-checks citations via WebFetch. Reports VERDICT: PASS or VERDICT: FAIL.
- **Orchestrator** (opus): Never writes code. Decides parallel vs. sequential dispatch per wave. Merges worktree results. Detects conflicts and falls back to sequential. Detects bounce triggers, pauses for human input, writes hydration checkpoints, resumes from checkpoint on --resume.
- **Codex CLI** (external): Alternative builder for hard tasks. Invoked via `codex exec --full-auto`. Falls back to standard builder on failure.

---

## Team Profiles

Team profiles live in `.claude/skills/orchestrator/teams/`. The `--team` flag selects the profile.

| Team | Profile | Builder | Validator | Use For |
|------|---------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code tasks (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and analysis |

Difficulty routing, spec hardening, HITL bounce-back, hydration, and parallel dispatch apply to all teams.

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
git diff orchestration/7-hitl..orchestration/8-parallel    # What stage 8 adds (parallel + worktrees)
git diff orchestration/6-codex..orchestration/7-hitl       # What stage 7 adds (HITL + hydration)
git diff orchestration/5-plugin..orchestration/6-codex     # What stage 6 adds (difficulty routing, spec hardening)
git diff orchestration/4-hop..orchestration/5-plugin       # What stage 5 adds (plugin extraction docs)
git diff orchestration/3-full..orchestration/4-hop         # What stage 4 adds (team switching)
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

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

## Return to Main

To return to the lobby: `git checkout main`

On main you have access to `/learn`, `/dojo`, and `/advisor` for pattern learning.

---

## Cross-Branch Reading

To read files from any branch without checking out:

```bash
# Read the new pattern docs introduced in this stage
git show main:docs/patterns/parallel-dispatch.md
git show main:docs/patterns/worktree-isolation.md
git show main:docs/patterns/wave-computation.md

# See what stage 8 adds over stage 7
git diff orchestration/7-hitl..orchestration/8-parallel --stat

# Read the full SKILL.md from this stage
git show orchestration/8-parallel:.claude/skills/orchestrator/SKILL.md

# Compare the SKILL.md between stages
git diff orchestration/7-hitl..orchestration/8-parallel -- .claude/skills/orchestrator/SKILL.md

# Read the HITL reference (introduced in stage 7)
git show orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md
```
