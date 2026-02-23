# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Orchestrator Prototype -- Stage 9: Browser Validation + Ralph Wiggum Loop

This is the **orchestration/9-browser** branch of the HOP Orchestrator prototype. Stage 9 adds browser-based validation for UI tasks and the Ralph Wiggum visual retry loop to the complete 14-step dispatch protocol.

After a builder completes a UI task and the standard code validator issues VERDICT: PASS, the orchestrator takes a screenshot using Vercel's agent-browser CLI and dispatches the validator in browser-validation mode. If the visual check fails, the Ralph Wiggum loop kicks in -- a screenshot-fix-screenshot cycle that re-dispatches the builder with the screenshot and failure details, takes a new screenshot, and re-validates. This cycle repeats up to 3 times before escalating to HITL.

This builds on all previous stages: parallel dispatch and worktree isolation (Stage 8), HITL bounce-back (Stage 7), Codex routing (Stage 6), spec hardening (Stage 6), team switching (Stage 4), etc.

**Stack:** TypeScript, Bun, Biome, Claude Code agents/skills/commands

---

## What This Stage Adds

Stage 9 adds browser validation and the Ralph Wiggum loop to the dispatch protocol.

### UI Task Detection (Step 4c)
After decomposition, each task is scanned for UI signal keywords (React, component, layout, CSS, button, modal, etc.). Tasks matching 2+ signals are tagged `ui: true`; tasks matching 1 signal are tagged `ui: possible`. Tags are written to the spec file Task Graph table and drive routing at validation time.

### --no-browser Flag (Step 1)
`/orchestrate --no-browser` disables browser validation for the entire run. UI tasks fall back to standard code validation only. Useful for CI environments without a display, API-only projects, or when the dev server is not configured.

### Browser Validation (Step 10)
After the standard validator issues VERDICT: PASS for a `ui: true` or `ui: possible` task:
1. Check BROWSER_ENABLED and DEV_SERVER_CMD -- skip if either is absent.
2. Ensure the dev server is running (start if needed, emit `devserver.started`).
3. Take a screenshot via `npx agent-browser navigate` + `npx agent-browser screenshot`.
4. Dispatch the validator in browser-validation mode with the screenshot.
5. Parse the browser verdict: PASS marks the task complete; FAIL enters the Ralph Wiggum loop.

agent-browser is preferred over Playwright MCP for 93% context reduction -- it returns only what the agent queries rather than serializing the full DOM.

### Ralph Wiggum Loop (Step 10)
When browser validation fails with `failure_mode:visual`, the orchestrator enters a screenshot-fix-screenshot cycle (separate from the standard code retry in Step 11):
- `visualRetryCount` is tracked independently from `retryCount` (separate budgets)
- Up to 3 visual iterations before HITL escalation
- Each iteration: re-dispatch builder with screenshot + failure details + fix attempt summary, take new screenshot, re-validate
- On exhaustion: present user with the most recent screenshot, full fix history, and options (provide guidance / skip / abort)

### Dev Server Lifecycle (Step 10, Step 12)
The orchestrator manages the dev server as a shared resource:
- Started once before the first UI task validation
- Stays running across all waves (no per-task restart)
- Stopped in Step 12 cleanup after all waves complete

### New files in this stage:
- `.claude/skills/orchestrator/references/browser-validation.md` -- technical reference for agent-browser CLI
- `docs/patterns/browser-validation.md` -- pattern explanation: what, when, how
- `docs/patterns/ralph-wiggum-loop.md` -- pattern explanation: visual retry cycle
- `prompts/stage-9/` -- test prompts for this stage
- `specs/examples/stage-9-browser-validation.md` -- example output with Ralph Wiggum loop
- Updated `SKILL.md` to ~1500 lines (up from ~1251 in stage 8)

---

## What This Stage Does NOT Do

- **No visual regression testing against baselines** -- no pixel-diff comparison against saved reference screenshots (future)
- **No cross-browser testing** -- single browser only (Chromium via agent-browser)
- **No live API cost data** -- token estimation uses fixed per-dispatch assumptions (future)

---

## Project Structure

```
.claude/
  agents/           # Agent definitions (builder, validator, research-builder, research-validator)
  commands/         # User-facing commands (/orchestrate, /lobby)
  skills/           # Skill definitions (orchestrator SKILL.md)
    orchestrator/
      references/   # Technical references (dag-execution.md, codex-escalation.md,
      |             #   hitl-protocol.md, browser-validation.md)
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
# UI task -- expect browser validation after builder creates the component
/orchestrate "add a user profile card component with avatar, name, and email"

# Layout bug fix -- may trigger Ralph Wiggum loop (screenshot, identify, fix, re-screenshot)
/orchestrate "fix the layout bug where the sidebar overlaps the main content"

# API task -- no browser validation (no UI signals in task descriptions)
/orchestrate "add a REST API endpoint" --no-browser

# Parallel dispatch + browser validation for UI-tagged tasks
/orchestrate "add GET /users, POST /users, DELETE /users"

# Force sequential execution (Stage 8 behavior) -- useful for debugging
/orchestrate "add GET /users, POST /users, DELETE /users" --sequential

# Hard task routing -- tasks touching 5+ files escalated to Codex CLI
/orchestrate "refactor the user module from class-based to functional across 8 files"

# Research team
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research

# Resume an interrupted orchestration
/orchestrate --resume specs/profile-card.md
```

---

## Agent Conventions

- **Builder** (sonnet): Writes code and fixes visual issues. In the Ralph Wiggum loop, reads the screenshot and failure details to make targeted CSS/layout corrections. File boundaries are absolute.
- **Validator** (haiku): Two modes in Stage 9 -- standard code validation (read files, check exports, types, tests) and browser validation (analyze screenshot, check layout, report visual issues with `failure_mode:visual`). Never modifies files.
- **Research Builder** (sonnet): Researches and synthesizes from web sources. Writes markdown research reports, not code.
- **Research Validator** (haiku): Spot-checks citations via WebFetch. Reports VERDICT: PASS or VERDICT: FAIL.
- **Orchestrator** (opus): Never writes code. Decides parallel vs. sequential dispatch per wave. Detects UI tasks, manages browser validation routing. Runs the Ralph Wiggum loop. Manages dev server lifecycle. Detects bounce triggers, pauses for human input, writes hydration checkpoints, resumes from checkpoint on --resume.
- **Codex CLI** (external): Alternative builder for hard tasks. Invoked via `codex exec --full-auto`. Falls back to standard builder on failure.

---

## Team Profiles

Team profiles live in `.claude/skills/orchestrator/teams/`. The `--team` flag selects the profile.

| Team | Profile | Builder | Validator | Use For |
|------|---------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code tasks (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and analysis |

Difficulty routing, spec hardening, HITL bounce-back, hydration, parallel dispatch, and browser validation apply to all teams.

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
git diff orchestration/8-parallel..orchestration/9-browser    # What stage 9 adds (browser + Ralph Wiggum)
git diff orchestration/7-hitl..orchestration/8-parallel       # What stage 8 adds (parallel + worktrees)
git diff orchestration/6-codex..orchestration/7-hitl          # What stage 7 adds (HITL + hydration)
git diff orchestration/5-plugin..orchestration/6-codex        # What stage 6 adds (difficulty routing, spec hardening)
git diff orchestration/4-hop..orchestration/5-plugin          # What stage 5 adds (plugin extraction docs)
git diff orchestration/3-full..orchestration/4-hop            # What stage 4 adds (team switching)
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
git show orchestration/9-browser:docs/patterns/browser-validation.md
git show orchestration/9-browser:docs/patterns/ralph-wiggum-loop.md

# See what stage 9 adds over stage 8
git diff orchestration/8-parallel..orchestration/9-browser --stat

# Read the full SKILL.md from this stage
git show orchestration/9-browser:.claude/skills/orchestrator/SKILL.md

# Compare the SKILL.md between stages
git diff orchestration/8-parallel..orchestration/9-browser -- .claude/skills/orchestrator/SKILL.md

# Read the browser validation reference (new in stage 9)
git show orchestration/9-browser:.claude/skills/orchestrator/references/browser-validation.md

# Read the HITL reference (introduced in stage 7)
git show orchestration/7-hitl:.claude/skills/orchestrator/references/hitl-protocol.md
```
