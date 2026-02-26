---
slug: browser-validation
display_name: "Browser Validation"
one_liner: "For UI-facing tasks, the validator uses the agent-browser CLI to take screenshots and assert visual/functional correctness after a builder completes."
intel_date: null
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

browser-validation

## Quick Summary

Browser Validation extends the builder-validator pattern for UI-facing tasks by giving the validator a browser tool instead of (or in addition to) code analysis. After a builder completes a UI task, the validator navigates to the relevant page using Vercel's agent-browser CLI, takes a screenshot, evaluates DOM state, and asserts visual and functional correctness. If the browser check fails, the same retry and escalation mechanics as standard validation apply -- including the Ralph Wiggum Loop for iterative visual fixes. The `--no-browser` flag skips browser validation when no dev server is configured.

## When To Use

- When the task produces UI output -- a component, page, layout, or visual interaction -- that cannot be verified by static analysis alone
- When acceptance criteria include visual correctness ("the button should be blue", "the modal should appear centered"), not just functional correctness ("the API returns 200")
- When a dev server is running or can be started by the orchestrator as part of the validation lifecycle
- When the agent-browser CLI is available in the project environment
- When the `--no-browser` flag has NOT been passed (skip browser validation if the user opts out or no dev server is configured)

## Core Mechanism

Browser validation replaces the standard "read and analyze output files" validator with a sequence that involves a live browser:

**Dev server lifecycle:**
1. Before the first browser-validation task in a wave, the orchestrator starts the dev server: `bun run dev` (or the project's configured dev command). The dev server PID is recorded.
2. The dev server stays running for the entire orchestration session -- it is not restarted between tasks.
3. After all browser-validation tasks complete, the orchestrator stops the dev server.

**Per-task browser validation:**
1. Validator receives the task description, the URL to visit, and the acceptance criteria for the visual check.
2. Validator navigates to the URL using agent-browser: `agent-browser navigate <url>`.
3. Validator takes a screenshot: `agent-browser screenshot`.
4. Validator evaluates DOM state for functional checks: `agent-browser evaluate '<selector>'`.
5. Validator asserts the screenshot and DOM state against the visual acceptance criteria.
6. Validator emits `VERDICT: PASS` or `VERDICT: FAIL <reason>` with the screenshot attached to the failure report.

**agent-browser CLI advantage:**
Vercel's agent-browser CLI provides a 93% context reduction versus Playwright by returning only the information the agent needs (screenshots, element state, text content) rather than full DOM serialization. This keeps the validator's context window usage low even for complex pages.

**`--no-browser` flag:**
When `--no-browser` is passed, the validator falls back to static file analysis for UI tasks. A warning is emitted in the orchestration summary noting that visual correctness was not verified.

## Key Rules

1. The dev server is a shared resource -- start once, stop once. Never start a new dev server per task.
2. Browser validation is only triggered for tasks tagged as UI-facing in the spec file. Non-UI tasks use standard validation.
3. The screenshot must be included in the `VERDICT: FAIL` report -- the builder cannot fix a visual issue without seeing what the validator saw.
4. If the dev server fails to start, skip browser validation for all remaining tasks and emit a `browser-validation.skipped` event with the error.
5. The `--no-browser` flag must be respected unconditionally -- never run browser validation if the user has opted out.
6. DOM evaluation uses specific selectors from the acceptance criteria -- not a full-page DOM dump.

## Implementation Notes

**Tagging UI tasks:** Tasks are tagged `ui: true` in the spec file's Task table during spec hardening (Stage 6). The orchestrator checks this flag before deciding whether to run browser validation or standard validation.

**URL resolution:** The validator constructs the URL from the dev server base URL (typically `http://localhost:3000`) and the page path specified in the task's acceptance criteria. The orchestrator injects the base URL into the validator's context.

**agent-browser availability check:** Before the first browser-validation task, check that `agent-browser` is available: `which agent-browser`. If not found, emit a warning and fall back to `--no-browser` mode for the session.

**Context efficiency:** The agent-browser screenshot is a binary attached to the task context, not base64 in the prompt. This keeps the token cost of browser validation bounded regardless of page complexity.

**Interaction with parallel dispatch:** In a parallel wave with multiple UI tasks, each builder has its own worktree but shares the single dev server. The validators run sequentially after merge (they do not need worktrees -- they only read via the browser). This means browser validation is never parallelized within a wave.

## Failure Modes

- **Dev server not started before validation:** Validator navigates to a URL that returns a connection error. Always start the dev server before the first UI validation task and verify it is accepting connections.
- **Screenshot taken before render completes:** A screenshot taken immediately after navigation may show a loading state rather than the rendered output. Add a short wait or poll for a DOM readiness signal before screenshotting.
- **`--no-browser` flag ignored:** Running browser validation in a CI environment without a dev server configured causes the orchestration to hang waiting for a connection that never comes.
- **Screenshot not attached to failure report:** The builder receives a `VERDICT: FAIL` with a text description of the visual issue but no screenshot. The builder cannot reproduce the visual state and cannot fix it effectively.
- **Dev server not stopped after orchestration:** Stale dev server processes accumulate across runs. Register a cleanup handler to send SIGTERM to the recorded PID on orchestrator exit.

## Signals & Diagnostics

- **Pattern is needed:** Builders produce UI components that pass unit tests but render incorrectly in the browser; visual regressions are not caught by existing validation; acceptance criteria include visual or layout requirements.
- **Pattern is working:** `browser-validation.started` event fires before first UI task; screenshots appear in validator failure reports; `VERDICT: PASS` events for UI tasks include a screenshot thumbnail reference; dev server is started once and shared across all UI tasks in the run.
- **Pattern is failing:** Validator emits `VERDICT: FAIL` with "connection refused" (dev server not running); screenshots show loading spinners instead of rendered content (premature screenshot); browser validation runs despite `--no-browser` flag.

## Tradeoffs

**Gain:** Catches visual regressions, layout issues, and rendering errors that static analysis cannot detect. Provides the builder with a screenshot when visual failures occur, making the fix actionable. Uses agent-browser's 93% context reduction to keep validator context windows bounded.

**Cost:** Requires a running dev server -- adds orchestration complexity and a shared resource that can become a bottleneck or failure point. Browser validation is sequential within a wave (validators run after merge), so it does not benefit from parallel dispatch. Adds latency per UI task compared to static validation.

## Related Patterns

- **builder-validator** -- the base pattern that browser-validation extends; replaces the validator's static analysis with a live browser check
- **ralph-wiggum-loop** -- the visual retry loop that runs when browser validation emits `VERDICT: FAIL`; browser-validation provides the screenshots that ralph-wiggum-loop uses to drive iterative fixes
- **iterative-refinement** -- pre-execution clarification gate; if acceptance criteria for visual tasks are vague, iterative-refinement should surface that before dispatch rather than leaving it to browser-validation to catch

## Source Anchors

Stage 9 (concept introduction and proof):
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md:L810-L860` -- Browser validation protocol: eligibility check, dev server lifecycle, agent-browser screenshot, browser validator dispatch
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md:L26-L27` -- BROWSER_ENABLED and DEV_SERVER_CMD HOP variables
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md:L50` -- --no-browser flag parsing in Step 1
- `orchestration/9-browser:.claude/skills/orchestrator/SKILL.md:L263-L289` -- Step 4c: UI task detection with signal keyword matching
- `orchestration/9-browser:.claude/skills/orchestrator/references/browser-validation.md` -- Agent-browser CLI patterns, token efficiency tips, dev server lifecycle
