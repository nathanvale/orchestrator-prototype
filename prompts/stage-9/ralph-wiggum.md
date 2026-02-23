# Stage 9 Test Prompt: Ralph Wiggum Loop

**Purpose:** Test the screenshot-fix-screenshot retry cycle. This prompt describes a layout bug fix that requires visual iteration -- the builder is likely to not get it right on the first fix attempt, triggering at least one Ralph Wiggum loop iteration.

---

## Setup

This prompt assumes a React project where a layout bug exists: the sidebar overlaps the main content area due to a missing `margin-left` on the content container.

Ensure:
1. The dev server is configured in `package.json` (the orchestrator will start it automatically)
2. A basic layout exists at `src/components/Layout.tsx` with a sidebar and main content area
3. The bug is reproducible: `bun run dev` and navigate to `http://localhost:3000` -- the sidebar visually overlaps the content

---

## Prompt

```
/orchestrate "fix the layout bug in src/components/Layout.tsx where the sidebar (240px wide, fixed left) overlaps the main content area. The main content should start at x=240px and fill the remaining viewport width. The fix should work at all viewport sizes from 768px to 1440px wide."
```

---

## Expected Behavior

1. **Step 1-7**: Normal orchestration flow.

2. **Step 4c (UI Detection)**: Task description contains `layout`, `sidebar`, `width`, `viewport` (4+ UI signals). Tagged `ui: true`.

3. **Wave 1 execution**: Builder implements the CSS fix (likely `margin-left: 240px` on the main content container). Standard validator issues VERDICT: PASS (code structure is correct).

4. **Browser validation for implement-layout-fix:**
   - Dev server started
   - Screenshot taken at `http://localhost:3000`
   - Browser validator evaluates layout: checks sidebar position and content start position
   - **Expected: VERDICT: FAIL failure_mode:visual** -- initial fix often has a subtle issue (e.g., sidebar is fixed but content scrolls under it, or the fix works at 1440px but breaks at 768px)

5. **Ralph Wiggum loop fires:**
   - `ralph_wiggum.iteration` emitted with `iteration: 1, maxIterations: 3`
   - Builder re-dispatched with screenshot + failure details
   - Builder makes targeted CSS correction
   - New screenshot taken at `/tmp/browser-val-<taskId>-attempt-1.png`
   - Browser validator re-validates

6. **Expected: VERDICT: PASS on iteration 2** (simple CSS layout bugs typically resolve in 1-2 iterations)
   - `ralph_wiggum.passed` emitted with `iterations: 2`
   - Task marked `completed`

7. **After all waves:** `devserver.stopped` emitted.

---

## What to Observe

The key observable in this test is the `fixAttemptSummary` evolution. After the orchestration, check the spec file's Execution Log:

```bash
cat specs/*.md | grep -A20 "Ralph Wiggum"
```

You should see:
- The initial failure description (what the browser validator found wrong)
- Iteration 1 fix summary (what the builder changed)
- Whether iteration 2 passed or required another iteration

---

## Verification

```bash
# Verify screenshots were taken
ls /tmp/browser-val-*.png

# Check Ralph Wiggum stats
grep "ralphWiggumLoops" specs/*.md

# Verify layout fix files were modified
git diff HEAD -- src/components/Layout.tsx

# Check the event log
grep "ralph_wiggum\." specs/*.md
```

The `orchestration.completed` event should show `ralphWiggumLoops >= 1, screenshotsTaken >= 2`.

---

## What This Proves

- Ralph Wiggum loop triggers on VERDICT: FAIL failure_mode:visual
- Each iteration includes screenshot + failure details + fix attempt summary
- `visualRetryCount` is tracked separately from `retryCount`
- Loop exits on first PASS (does not run all 3 iterations unnecessarily)
- `ralph_wiggum.passed` event fired with iteration count
- Screenshots named correctly: `/tmp/browser-val-<id>-attempt-<n>.png`
