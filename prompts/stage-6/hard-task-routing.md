# Test Prompt: Hard Task Routing

## Purpose

This prompt triggers difficulty routing. The refactor scope (8 files, cross-module) should cause several tasks to be tagged `difficulty: hard`, which routes them to Codex CLI when available.

## Prompt

```
/orchestrate "refactor the user module from class-based to functional patterns across src/models/user.ts, src/services/userService.ts, src/routes/users.ts, src/middleware/auth.ts, src/types/user.ts, tests/users.test.ts, tests/auth.test.ts, and src/index.ts"
```

## What to Observe

### Step 4b (Difficulty Assessment)
- Tasks touching multiple files from the list should be tagged `difficulty: hard`
- Tasks that are scoped to a single file (e.g., "Update types in src/types/user.ts") may be tagged `standard`
- The `difficulty.assessed` event should show a mix of hard and standard tasks

### Step 4b (Codex Check)
- If Codex is installed: `codex.checked` emits `{ available: true }`
- If not installed: `codex.checked` emits `{ available: false }` -- all tasks route to standard builder

### Step 10 (Execution)
- Hard tasks with Codex available: `codex.dispatched` then `codex.completed` or `codex.fallback`
- Standard tasks: `agent.dispatched` directly (no Codex check)
- Validator always runs regardless of which builder path was used

### Final Report
- "Tasks routed to Codex: N" in the summary
- "Codex fallbacks to standard builder: N" (if any Codex calls failed)

## Expected Difficulty Tags

| Task | Expected Difficulty | Reason |
|------|--------------------|-|
| Migrate models/user.ts to functional | hard | Foundational file, all other tasks depend on it |
| Update userService.ts | hard | Service layer, complex dependencies |
| Update auth middleware | hard | Cross-module, security-sensitive |
| Update route handlers | standard | Mostly wiring changes, follows service pattern |
| Update types | standard | Additive change, no logic |
| Update tests | standard | Pattern-following, clear acceptance criteria |

## Notes

- The prompt is intentionally specific (file paths listed) so clarifying questions are skipped
- If Codex is not installed, all tasks fall through to standard builder -- the orchestration completes normally
- Compare the event log with and without `--no-codex` to see the routing difference
