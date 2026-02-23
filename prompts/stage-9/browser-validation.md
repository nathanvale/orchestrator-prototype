# Stage 9 Test Prompt: Browser Validation

**Purpose:** Test that the orchestrator detects UI tasks, starts a dev server, takes a screenshot after standard validation passes, and dispatches the browser validator. Tests the happy path where browser validation passes on the first attempt.

---

## Setup

This prompt assumes a basic React/Bun project with a working dev server configured in `package.json` under `scripts.dev`.

Ensure the dev server can start:
```bash
bun run dev &
sleep 3
curl -s http://localhost:3000 > /dev/null && echo "ready" || echo "not ready"
kill %1
```

---

## Prompt

```
/orchestrate "add a user profile card component at src/components/ProfileCard.tsx that displays an avatar image, the user's name, and email address. The card should have a white background with a subtle shadow and rounded corners. The avatar should be a circular 64px image in the top-left."
```

---

## Expected Behavior

1. **Step 1-7**: Normal orchestration flow -- decompose, write spec, harden, present plan.

2. **Step 4c (UI Detection)**: The orchestrator scans task descriptions for UI signals.
   - Task "implement-profile-card" matches: `component`, `TSX`, `style`, `visual`, `layout` (5+ signals)
   - Tagged `ui: true` in the spec Task Graph
   - `ui.detected` emitted with `uiTasks: ["implement-profile-card"]`

3. **Wave execution**: Standard builder/validator dispatch runs as usual.

4. **After standard VERDICT: PASS for implement-profile-card:**
   - BROWSER_ENABLED is `true` (no `--no-browser` flag)
   - DEV_SERVER_CMD is configured (from `package.json scripts.dev`)
   - `devserver.started` emitted
   - `npx agent-browser navigate http://localhost:3000` executes
   - `npx agent-browser screenshot --output /tmp/browser-val-<taskId>.png` executes
   - Browser validator dispatched with screenshot path

5. **Browser verdict: PASS**
   - `browser.passed` emitted
   - Task marked `completed`
   - No Ralph Wiggum loop (happy path)

6. **After all waves:** `devserver.stopped` emitted.

---

## Verification

After the orchestration completes:

```bash
# Verify the component was created
ls src/components/ProfileCard.tsx

# Verify screenshots were taken
ls /tmp/browser-val-*.png

# Check the browser validation stats in the spec file
grep -A3 "browserValidations" specs/*.md

# Verify the event log shows browser validation
grep "browser\." specs/*.md
```

The `orchestration.completed` event should show `browserValidations: 1, ralphWiggumLoops: 0, screenshotsTaken: 1, devServerStarted: true`.

---

## What This Proves

- UI task detection fires on component descriptions with 2+ UI signals
- `ui: true` tag routes to browser validation after standard VERDICT: PASS
- Dev server lifecycle management: starts once, stops after all waves
- agent-browser CLI integration: navigate + screenshot
- Browser PASS on first attempt: no Ralph Wiggum loop
- Browser stats reported in orchestration.completed event
