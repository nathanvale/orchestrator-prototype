# Test Prompt: --no-codex Override

## Purpose

This prompt tests the `--no-codex` flag, which forces all tasks through the standard builder regardless of difficulty. Use this alongside `hard-task-routing.md` to compare event logs: same prompt, different routing.

## Prompt

```
/orchestrate "refactor the user module from class-based to functional patterns across src/models/user.ts, src/services/userService.ts, src/routes/users.ts, src/middleware/auth.ts, src/types/user.ts, tests/users.test.ts, tests/auth.test.ts, and src/index.ts" --no-codex
```

## What to Observe

### Step 1 (Flag Parsing)
- The orchestrator strips `--no-codex` from the prompt
- `CODEX_ENABLED` is set to `false` immediately

### Step 4b (Difficulty Assessment)
- Tasks are still assessed and tagged `hard` or `standard` -- difficulty assessment always runs
- The `codex.checked` event still fires but with `noCodexFlag: true`
- `CODEX_ENABLED` remains `false` regardless of whether Codex is installed

### Step 10 (Execution)
- No `codex.dispatched` events -- all tasks route to standard builder
- Hard-tagged tasks dispatch `agent.dispatched` directly, no Codex attempt
- The event log should have NO `codex.dispatched` or `codex.completed` entries

### Final Report
- "Tasks routed to Codex: 0" in the summary
- "Codex fallbacks to standard builder: 0"
- The difficulty column in the task graph still shows `hard` for the relevant tasks

## Comparing With and Without `--no-codex`

Run both versions and compare the event logs in the spec files:

**With Codex (default):**
```
difficulty.assessed    { tasks: [{ taskId: "migrate-user-store", difficulty: "hard" }, ...] }
codex.checked          { available: true, noCodexFlag: false }
...
codex.dispatched       { taskId: "2", prompt: "Migrate user store ..." }
codex.completed        { taskId: "2", exitCode: 0 }
```

**With --no-codex:**
```
difficulty.assessed    { tasks: [{ taskId: "migrate-user-store", difficulty: "hard" }, ...] }
codex.checked          { available: true, noCodexFlag: true }
...
agent.dispatched       { role: "builder", taskId: "2" }   -- no Codex attempt
```

The task graph is identical. Only the execution path differs.

## When to Use --no-codex

- Codex CLI produces incorrect results for a specific codebase
- Debugging the standard builder on a task that Codex keeps failing
- Cost control (Codex may have different pricing)
- Testing that the standard builder handles hard tasks correctly

## Notes

- `--no-codex` is a per-run flag. It does not persist to subsequent orchestrations.
- Difficulty tags still appear in the spec file even with `--no-codex`. The tags are informational for plan review, not just for routing.
- Spec hardening (Step 7b) is unaffected by `--no-codex`.
