# Orchestrator Prototype

An educational repository for learning agent orchestration patterns incrementally. Each git branch (`stage/1-dispatch`, `stage/2-dag`, etc.) is a standalone lesson - checkout any stage to see the orchestrator at that complexity level.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Repo Is

This is a prototype of the HOP (Higher-Order Prompt) Orchestrator - a prompt that takes other prompts as parameters, like a higher-order function. The fixed wrapper handles orchestration (task creation, agent dispatch, validation). The variable parameters handle identity (which builder, which validator, which team).

Stage 2 adds multi-task decomposition and DAG execution -- the orchestrator now breaks a prompt into a dependency graph, computes waves via topological sort (Kahn's algorithm), and dispatches agents wave by wave. A spec file is written before any agent runs and serves as the shared source of truth throughout execution.

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
# Run the orchestrator
/orchestrate "add a hello world function in src/hello.ts that exports a greet function"

# The orchestrator will:
# 1. Decompose the prompt into a task graph with dependency waves
# 2. Write a spec file to specs/ (plan before any agent is dispatched)
# 3. Create all tasks with dependency relationships visible upfront
# 4. Execute wave by wave -- dispatch Builder then Validator per task
# 5. Report the result with per-task verdicts and wave summary
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

## Special Rules

### ALWAYS

1. Run `bun run validate` before pushing
2. Use named exports (no defaults)
3. Add JSDoc to exported functions

### NEVER

1. Push directly to main
2. Use destructive git commands (`reset --hard`, `push --force`)
3. Let the orchestrator write code directly (it dispatches agents)
