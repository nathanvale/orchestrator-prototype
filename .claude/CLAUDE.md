# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`stage/1-dispatch`, `stage/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 3 completes the Phase 1 feature set. On top of the Stage 2 DAG execution foundation, it adds: clarifying questions (the orchestrator detects vague prompts and asks the user to narrow scope before decomposing), fast path (simple single-file prompts bypass DAG decomposition entirely and go straight to a builder + validator dispatch), retry with resume (failed tasks retry up to 3 times using `resume: agentId` to preserve builder context, with user escalation if all retries fail), iterative plan refinement (after writing the spec, the orchestrator presents the task graph to the user for review and accepts modifications before dispatching any agents), and token cost estimation (estimated token cost shown by wave before the first agent is dispatched).

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
```

---

## Agent Conventions

- **Builder** (sonnet): Writes code. Reads before writing. File boundaries are absolute. Reports changes.
- **Validator** (haiku): Read-only. Reports VERDICT: PASS or VERDICT: FAIL. Never modifies files.
- **Orchestrator** (opus): Never writes code. Creates tasks, dispatches agents, reports results.

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
bun dev                  # Watch mode
bun build                # Build TypeScript to dist/
bun run check            # Biome lint + format
bun typecheck            # TypeScript type checking
bun run validate         # Full quality check
bun test                 # Run all tests
```

---

## Branch Strategy

**Cumulative chain:** each stage branches from the previous stage, not from main. Main is a bare shell (template, config, master plan) -- it never receives stage merges.

```bash
# Starting a new stage
git checkout stage/N-1-name && git checkout -b stage/N-name

# Diff commands for readers
git diff main..stage/1-dispatch              # What stage 1 adds to the shell
git diff stage/1-dispatch..stage/2-dag       # What stage 2 adds
git diff stage/2-dag..stage/3-full           # What stage 3 adds
```

See `specs/master-plan.md` "Branch Strategy" for full rules.

---

## What This Stage Does NOT Do

This is Stage 3 (Full Phase 1). The following capabilities are intentionally absent -- they are added in later stages:

- **No parallel wave execution** -- tasks within a wave run sequentially, one at a time (Stage 8)
- **No --team switching** -- builder and validator are hardcoded in HOP Configuration (Stage 4)
- **No persistent state store** -- orchestration state lives only in the spec file on disk; there is no external database or resume server (Stage 7)
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions, not actual usage reported by the API (future)

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
