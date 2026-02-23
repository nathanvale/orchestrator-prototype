# Browser Validation

**Introduced in: Stage 9**

---

## What It Is

Browser Validation extends the builder-validator pattern for UI-facing tasks by replacing static file analysis with a live browser check. After a builder completes a UI task, the validator navigates to the rendered page using Vercel's agent-browser CLI, takes a screenshot, evaluates DOM state, and asserts visual and functional correctness.

Standard validation -- reading output files and checking exports, types, and logic -- cannot verify that a component renders correctly, that a layout is aligned, or that an interactive element behaves as expected in the browser. Browser validation closes this gap by making the validator's check as close to "what the user sees" as possible.

---

## When To Use

- When the task produces UI output -- a component, page, layout, or visual interaction
- When acceptance criteria include visual or layout requirements ("button should be centered", "modal should appear on top of the overlay")
- When a dev server is running or can be started by the orchestrator
- When the `--no-browser` flag has NOT been passed
- When the agent-browser CLI is available in the project environment

Non-UI tasks continue to use standard validation (static analysis). Browser validation is opt-in per task, tagged in the spec file.

---

## How It Works

### Dev Server Lifecycle

The orchestrator manages the dev server as a shared resource for the entire orchestration session:

1. Before the first UI task validation, start the dev server: `bun run dev` (or the configured dev command). Record the PID.
2. The dev server stays running across all waves and tasks -- do not restart it per task.
3. After all browser-validation tasks complete, stop the dev server (send SIGTERM to the PID).

Before dispatching the first UI task, verify the dev server is accepting connections:

```bash
curl -s http://localhost:3000 > /dev/null && echo "ready" || echo "not ready"
```

If not ready after a short wait, emit `browser-validation.skipped` and fall back to `--no-browser` mode.

### Per-Task Browser Validation

After the builder completes a UI-tagged task:

1. Validator receives: task description, URL to visit, visual acceptance criteria
2. Navigate: `agent-browser navigate http://localhost:3000/path`
3. Wait for render: poll for a DOM readiness signal or wait for the expected element to appear
4. Screenshot: `agent-browser screenshot`
5. Evaluate DOM: `agent-browser evaluate '<selector>'` for any specific element checks
6. Assert: compare screenshot and DOM state against acceptance criteria
7. Emit `VERDICT: PASS` or `VERDICT: FAIL failure_mode:visual reason:"<description>"` with screenshot attached

### Why agent-browser

Vercel's agent-browser CLI provides a ~93% context reduction versus Playwright-style automation:

- Playwright serializes the entire DOM, producing thousands of tokens per page check
- agent-browser returns only what the agent asks for: a screenshot, an element's text, a selector's computed style
- This keeps the validator's context window usage bounded even on large pages

### `--no-browser` Flag

When `--no-browser` is passed:
- Skip all browser validation
- Fall back to static file analysis for UI tasks
- Emit a warning in the orchestration summary: "Browser validation skipped -- visual correctness not verified"

Useful when: running in CI without a display, dev server not configured, or user prefers faster (non-visual) validation.

### Tagging UI Tasks

Tasks are tagged `ui: true` in the spec file's Task table during spec hardening (Stage 6). The orchestrator checks this flag at validation time to route to browser validation vs. standard validation.

Example spec entry:
```
| implement-header | wave: 2 | ui: true | url: /dashboard |
```

---

## Key Rules

1. Dev server is a shared resource -- start once, stop once per orchestration run.
2. Browser validation only triggers for tasks tagged `ui: true` in the spec.
3. Screenshot must be attached to `VERDICT: FAIL` reports -- the builder needs it for the Ralph Wiggum Loop.
4. If dev server fails to start, skip browser validation for ALL remaining tasks (not just the current one) and emit a session-level warning.
5. `--no-browser` must be respected unconditionally.
6. DOM evaluation uses specific selectors from acceptance criteria -- never a full-page DOM dump.

---

## Failure Modes

- **Dev server not started before validation:** Validator receives "connection refused". Always start and verify the dev server before the first UI task.
- **Screenshot taken before render completes:** Shows a loading spinner instead of the rendered component. Add a wait for a DOM readiness signal or a short fixed delay before screenshotting.
- **`--no-browser` ignored in CI:** The orchestration hangs waiting for a dev server that cannot start in the environment.
- **Screenshot not attached to failure report:** Builder receives a text description of the visual issue but no screenshot. The Ralph Wiggum Loop depends on the screenshot for targeted fixes.
- **Dev server not stopped after run:** Stale processes accumulate. Register a cleanup handler to send SIGTERM to the recorded PID on exit.

---

## Tradeoffs

| Advantage | Disadvantage |
|-----------|-------------|
| Catches visual regressions that static analysis cannot detect | Requires a running dev server -- added orchestration complexity |
| Provides screenshots for actionable failure reports | Sequential validators (even with parallel dispatch) -- no parallelism benefit |
| 93% context reduction vs Playwright (agent-browser) | Adds latency per UI task vs. static validation |
| `--no-browser` escape hatch preserves fast-path option | Dev server is a single point of failure for all UI tasks |

---

## Where It Comes From

**Headless browser testing in CI:** Tools like Puppeteer, Playwright, and Cypress have made browser-based assertions standard in frontend CI pipelines. Browser validation brings the same "render it and check it" approach into agent orchestration, replacing human visual review with an automated validator.

**Visual regression testing:** Tools like Percy and Chromatic diff screenshots against baselines to detect visual regressions. Browser validation uses the same screenshot mechanism but for first-run acceptance checks rather than regression diffs.

**agent-browser:** Vercel's agent-browser CLI is designed specifically for AI agents operating in browser environments. Its context efficiency (returning only what the agent queries) makes it practical to embed browser checks in agent validation loops without consuming most of the context window.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The base pattern that browser-validation extends |
| [`docs/patterns/ralph-wiggum-loop.md`](ralph-wiggum-loop.md) | The visual retry loop triggered when browser validation fails |
| [`docs/patterns/iterative-refinement.md`](iterative-refinement.md) | Pre-execution gate for clarifying vague visual acceptance criteria |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 9 overview |
