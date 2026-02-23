# Pattern: Difficulty Routing

## What It Is

Difficulty Routing is the practice of classifying tasks by complexity before dispatch and sending hard tasks to a more powerful executor (Codex CLI) while routing standard tasks through the normal path. The validator always runs regardless of which executor handled the build step.

**The key insight:** not all tasks deserve the same executor. A task that adds JSDoc to a single function needs a focused agent. A task that refactors an authentication module across 8 files benefits from an executor with broader context and longer attention span.

---

## How It Works

The orchestrator evaluates each task against a fixed set of difficulty signals immediately after decomposition (Step 4b):

**Hard signals (any match = hard):**
- Touches 5+ files
- Requires understanding complex existing patterns (refactor, migration)
- Involves algorithmic complexity
- Uses keywords: "optimize", "refactor across", "migrate", "consolidate"
- Has 5+ acceptance criteria
- Requires cross-module dependency analysis

**Standard signals:**
- Creates new files (greenfield)
- Modifies 1-2 files
- Follows existing patterns
- Has clear input/output expectations

Each task is tagged `difficulty: standard` or `difficulty: hard`. This tag is recorded in the spec file and shown in the plan review table.

At dispatch time (Step 10), for each `hard` task:

1. Check if `CODEX_ENABLED == true` (Codex installed AND `--no-codex` flag not set)
2. If yes: invoke `codex exec --full-auto '<task description>'` with a 5-minute timeout
3. If Codex exits 0: skip standard builder, proceed to validator
4. If Codex fails or times out: emit `codex.fallback`, dispatch standard builder instead (fallback does not count against retry cap)
5. If `CODEX_ENABLED == false`: dispatch standard builder directly

The `--no-codex` flag forces all tasks through the standard builder, disabling Codex routing for the entire orchestration.

---

## Why It Matters

Without difficulty routing, every task uses the same executor regardless of complexity. This produces two failure modes:

- **Under-served hard tasks:** A focused agent dispatched on a complex refactor may miss cross-module impacts, make inconsistent changes, or lose track of scope. The validator catches individual criteria failures but cannot detect systemic drift.
- **Over-served standard tasks:** Routing simple tasks to a powerful executor wastes time and tokens. A JSDoc addition does not need extended analysis.

Difficulty routing matches executor capability to task complexity. It also surfaces complexity early -- seeing `difficulty: hard` in the plan review gives the user a chance to restructure tasks before dispatch.

---

## Fallback Is Transparent

The `codex.fallback` event is informational, not an error. The standard builder takes over and the orchestration continues. From the user's perspective, the task completes normally (or enters the retry protocol if it fails validation).

This makes Codex routing safe to enable by default: if Codex is not installed or fails, nothing breaks.

---

## The Audit Trail

The spec file's Routing section records:
```markdown
## Routing

Codex enabled: true
Codex available: true
```

The Task Graph table shows the `Difficulty` column for every task. The Execution Log records `codex.dispatched`, `codex.completed`, and `codex.fallback` events inline.

The final report summary includes:
- Tasks routed to Codex: N
- Codex fallbacks to standard builder: N

---

## Where to See It

Stage 6 (orchestration/6-codex) introduces difficulty routing:
- `orchestration/6-codex:.claude/skills/orchestrator/SKILL.md` -- Steps 4b and 10
- `orchestration/6-codex:.claude/skills/orchestrator/references/codex-escalation.md` -- full signal definitions and dispatch protocol

Compare the Stage 5 dispatch loop (no difficulty check) with Stage 6 (routing check per task):

```bash
git diff orchestration/5-plugin..orchestration/6-codex -- .claude/skills/orchestrator/SKILL.md
```

---

## Related Patterns

- **Spec Hardening** -- the quality gate that runs alongside difficulty routing. Hardened specs give Codex better instructions.
- **Builder/Validator** -- the validator always runs after Codex, maintaining the same quality assurance regardless of executor.
- **HOP (Higher-Order Prompt)** -- difficulty routing is a sub-step of the fixed HOP protocol. The routing logic is invariant; only agent identities vary per team.
