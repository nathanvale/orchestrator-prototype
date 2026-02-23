# Stage 9 Test Prompt: --no-browser Override

**Purpose:** Test that the `--no-browser` flag correctly disables browser validation for the entire run, even when tasks are tagged `ui: true`. Validates the escape hatch for API-only projects or CI environments.

---

## Setup

This prompt can run on any project with a working Bun setup. No dev server is required -- the `--no-browser` flag should prevent any browser validation from running.

---

## Prompt

```
/orchestrate "add a REST API endpoint POST /api/users that accepts { name: string, email: string }, validates both fields are present, and returns 201 with the created user object { id: string, name: string, email: string } or 400 with { error: string } if validation fails. Write the handler at src/routes/users-post.ts and add tests at tests/users-post.test.ts." --no-browser
```

---

## Expected Behavior

1. **Step 1 (Flag Parsing)**: `--no-browser` is detected, stripped from the prompt, BROWSER_ENABLED set to `false`. Emit:
   ```
   -- BROWSER_ENABLED: false (--no-browser flag)
   ```

2. **Step 4c (UI Detection)**: Even though UI detection runs:
   - Task descriptions contain no UI signals (REST API, handler, tests -- no HTML/CSS/component keywords)
   - `ui.detected` emitted with `uiTasks: [], possibleUiTasks: []`
   - No tasks tagged `ui: true`

3. **Wave execution**: Standard builder/validator dispatch runs as normal. No dev server is started.

4. **After standard VERDICT: PASS for each task:** No browser validation check -- BROWSER_ENABLED is `false`. Tasks are immediately marked `completed`.

5. **No `devserver.started` event** -- confirmed by absence in event log.

6. **`browser.skipped` may be emitted** for any `ui: possible` task if the description accidentally matches 1 UI signal, with reason "no-browser flag".

---

## Verification

After the orchestration completes:

```bash
# Verify no screenshots were taken (no /tmp/browser-val-*.png files)
ls /tmp/browser-val-*.png 2>/dev/null && echo "FAIL: screenshots found" || echo "PASS: no screenshots"

# Verify the handler and tests were created
ls src/routes/users-post.ts tests/users-post.test.ts

# Check the spec file -- should show devServerStarted: false
grep "devServerStarted" specs/*.md

# Check the orchestration.completed event
grep "orchestration.completed" specs/*.md
```

The `orchestration.completed` event should show `browserValidations: 0, ralphWiggumLoops: 0, screenshotsTaken: 0, devServerStarted: false`.

---

## Variant: --no-browser with a UI Task

To explicitly test that `--no-browser` suppresses browser validation even for `ui: true` tasks:

```
/orchestrate "add a login form component at src/components/LoginForm.tsx with email and password fields and a submit button" --no-browser
```

Expected: Task is tagged `ui: true` by Step 4c. `ui.detected` shows `uiTasks: ["implement-login-form"]`. But `browser.skipped` is emitted for that task (reason: "no-browser flag") and no screenshot is taken. Task is marked `completed` based on standard code validation only. The summary includes a warning: "Browser validation skipped -- visual correctness not verified for 1 UI task."

---

## What This Proves

- `--no-browser` flag is parsed in Step 1 and sets BROWSER_ENABLED to `false`
- BROWSER_ENABLED=false is respected unconditionally -- no browser validation runs
- Dev server lifecycle is skipped entirely (no `devserver.started`)
- UI task detection still runs (Step 4c is observability-only, not gated by BROWSER_ENABLED)
- `browser.skipped` is emitted for UI tasks when BROWSER_ENABLED is false
- Orchestration completes normally with standard code validation for all tasks
