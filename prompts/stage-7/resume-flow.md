# Stage 7 Test Prompt: Resume Flow

**Purpose:** Test that --resume correctly hydrates state and skips completed work.

---

## How to Test Resume

Resume requires two steps: start an orchestration, interrupt it (or let it run partway), then resume.

### Step 1: Start a multi-wave orchestration

```
/orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"
```

This should produce:
- Wave 1: `define-user-types` (root task)
- Wave 2: `implement-get-users`, `implement-post-users`, `implement-get-user-by-id`
- Wave 3: `write-user-route-tests`

A spec file will be written to `specs/rest-api.md`.

### Step 2: Interrupt after Wave 1

After Wave 1 completes but before Wave 2 starts, interrupt the Claude Code session (close the terminal, or wait for a timeout). The spec file should show:
- `define-user-types`: Status = completed
- All Wave 2 tasks: Status = pending
- Hydration checkpoint: current_wave = 2

Verify the spec file exists:
```bash
cat specs/rest-api.md
```

Look for the `## Hydration Checkpoint` section. It should show:
```yaml
current_wave: 2
status: in-progress
```

### Step 3: Resume the orchestration

```
/orchestrate --resume specs/rest-api.md
```

Expected behavior:
1. Orchestrator reads the hydration checkpoint from `specs/rest-api.md`
2. Emits `orchestration.resumed` with restoreWave: 2
3. Skips Steps 2-9 entirely
4. Jumps directly to Step 10 at Wave 2
5. The `define-user-types` task shows as `completed` -- NOT re-dispatched
6. Wave 2 tasks are dispatched normally
7. Final report includes: `Resumed from: Wave 2 of specs/rest-api.md`

---

## Resume After Bounce-Back

A more advanced test: resume after a bounce-back that was left unresolved.

### Setup

Run the bounce-back test prompt first (see `bounce-back.md`). At the bounce presentation, do NOT respond -- instead close the session.

### Resume with unresolved bounce

```
/orchestrate --resume specs/<bounce-spec>.md
```

Expected behavior:
1. Orchestrator reads checkpoint
2. Finds task in `bounce_history` with `resolution: null`
3. Re-presents the bounce-back options BEFORE dispatching any new tasks
4. After user resolves, continues with the remaining orchestration

---

## Verification

After resume:
- Check the spec file to confirm `define-user-types` was NOT re-executed
- The execution log should show Wave 2 entries immediately following the resumed checkpoint
- Final report shows `resumed: true` and `Resumed from: Wave 2 of specs/rest-api.md`

---

## What This Proves

- `--resume` flag correctly parses the spec path
- Hydration algorithm restores wave position from checkpoint
- Completed tasks (status: completed) are skipped by idempotency check
- `orchestration.resumed` event is emitted with correct restore data
- Unresolved bounce-backs are re-presented before any new dispatch
- Final report includes resume stats
