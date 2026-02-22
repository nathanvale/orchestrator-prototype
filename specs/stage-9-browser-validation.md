# Plan: Stage 9 - Browser Validation

## Task Description

Stage 9 adds browser-based validation to the orchestrator. When a task produces UI-facing output (HTML pages, React components, CSS changes, frontend routes), the validator can launch a browser, navigate to the relevant page, take screenshots, and verify visual/functional correctness. This introduces a new validation tier: beyond "does the code pass static checks" to "does the UI actually look and behave correctly." The "Ralph Wiggum Loop" is the iterative screenshot-analyze-fix cycle where the orchestrator takes a screenshot, analyzes it for issues, dispatches a builder to fix them, and repeats until the UI matches expectations.

**Reference:** [Master Plan - Stage 9](./master-plan.md#stages-6-9-advanced-capabilities)

---

## Objective

When complete:

1. The orchestrator detects UI-facing tasks during decomposition and tags them with `validation: browser` (vs the default `validation: static`)
2. Browser-tagged tasks get an additional validation pass after the standard haiku validator: a browser validator that launches a page, takes a screenshot, and analyzes the result
3. The Ralph Wiggum Loop enables iterative visual refinement: screenshot -> analyze -> fix -> screenshot -> analyze (up to N iterations)
4. Browser validation uses the chrome-devtools MCP tools (navigate_page, take_screenshot, evaluate_script) for headless browser interaction
5. A `dev-server` configuration in the spec file tells the orchestrator how to start and reach the development server
6. Browser validation is opt-in per task -- only tasks tagged `validation: browser` get browser checks
7. The standard static validator (haiku) still runs for all tasks -- browser validation is additive, not a replacement
8. New pattern docs: `docs/patterns/browser-validation.md`
9. New reference doc: `.claude/skills/orchestrator/references/browser-validation.md`

---

## Problem Statement

Stages 1-8 validate builder output through static analysis: the haiku validator reads files, checks that exports exist, verifies function signatures match the spec, and runs tests. This is sufficient for backend code, library code, and type definitions. But for UI-facing code, static validation misses an entire class of defects:

- A component renders but is visually broken (wrong layout, missing styles, overlapping elements)
- CSS changes look correct in code but produce unexpected visual results at certain viewport sizes
- A page loads but shows a blank screen due to a runtime error
- An interactive element exists in the DOM but is not visible or clickable
- Colors, spacing, or typography don't match the design specification

These are not bugs that a file-reader can catch. They require rendering the page in a browser and looking at it. Stage 9 adds this capability by integrating browser automation into the validation step.

### The Ralph Wiggum Loop

Named after the iterative "look at it, notice something wrong, fix it, look again" cycle, the Ralph Wiggum Loop is a screenshot-driven refinement pattern:

1. Take a screenshot of the rendered page
2. Analyze the screenshot for visual/functional issues
3. If issues found: dispatch builder to fix them, then go to step 1
4. If no issues: VERDICT: PASS

This loop catches visual regressions that static validation cannot detect. It also enables the orchestrator to do visual QA without a human reviewer -- the LLM can analyze screenshots for layout issues, missing elements, broken styling, and accessibility problems.

---

## Solution Approach

### 1. UI Task Detection

Add a classification step during task decomposition (extending Step 4) that tags tasks as UI-facing or non-UI:

**UI signals:**
- Task description mentions HTML, CSS, JSX, TSX, React components, Svelte, Vue
- Task targets files in directories like `src/components/`, `src/pages/`, `src/views/`, `src/routes/` (frontend-conventional paths)
- Task mentions visual terms: "button", "form", "layout", "style", "modal", "page", "render", "display"
- Task acceptance criteria reference visual outcomes: "shows a list", "displays a form", "renders correctly"

**Non-UI signals:**
- Task targets type definitions, utility functions, API handlers, test files
- Task description is purely about data structures, logic, or server-side behavior
- No visual terms in description or acceptance criteria

Each task gets a `validation` field: `static` (default) or `browser`.

### 2. Dev Server Configuration

Browser validation requires a running development server. The orchestrator needs to know:

- How to start the server: the command (e.g., `bun run dev`, `npm run dev`)
- What port to expect: where the server listens (e.g., `http://localhost:3000`)
- How to know it's ready: a health check URL or "wait for stdout" pattern

This is specified in the HOP Configuration block as new variables:

```
DEV_SERVER_CMD:   bun run dev
DEV_SERVER_URL:   http://localhost:3000
DEV_SERVER_READY: "ready in" | http://localhost:3000/health
```

If no DEV_SERVER_CMD is configured, browser validation is disabled (tasks tagged `browser` fall back to static-only validation with a warning).

**Server lifecycle:**
- Start the dev server before the first browser-tagged task in a wave
- Keep it running for the duration of the wave (browser tasks may span multiple tasks)
- Stop the dev server after the wave completes (or after all browser tasks are validated)
- If the server is already running (port occupied), skip starting it

### 3. Browser Validation Protocol

For tasks tagged `validation: browser`, after the standard haiku validator runs, dispatch a browser validation pass:

**Step 1: Ensure dev server is running**
- Check if DEV_SERVER_URL is reachable
- If not: start DEV_SERVER_CMD via Bash (background), wait for DEV_SERVER_READY signal
- Emit `browser.server_started` event

**Step 2: Navigate to the relevant page**
- Determine the URL from the task description (e.g., "the /users page" -> `http://localhost:3000/users`)
- Use `chrome-devtools: navigate_page` to load the URL
- Wait for the page to be fully loaded

**Step 3: Take a screenshot**
- Use `chrome-devtools: take_screenshot` to capture the rendered page
- Store the screenshot path for analysis

**Step 4: Analyze the screenshot**
- Read the screenshot using the Read tool (Claude is multimodal -- it can analyze images)
- Compare against the task's acceptance criteria:
  - Are the expected elements visible?
  - Is the layout correct (no overlapping, proper spacing)?
  - Are colors and typography consistent?
  - Is the page responsive at the expected viewport size?
  - Are there any obvious visual defects (blank areas, broken images, misaligned text)?

**Step 5: Verdict**
- If all visual criteria pass: `BROWSER VERDICT: PASS`
- If issues found: `BROWSER VERDICT: FAIL` with specific visual issues listed

### 4. The Ralph Wiggum Loop

When browser validation returns FAIL, the orchestrator enters the Ralph Wiggum Loop -- an iterative screenshot-analyze-fix cycle:

```
[Take Screenshot]
       |
       v
[Analyze for Issues] ---> No issues --> BROWSER VERDICT: PASS
       |
     Issues found
       |
       v
[Dispatch Builder with visual feedback]
       |
       v
[Builder fixes CSS/layout/component]
       |
       v
[Take Screenshot] (loop back)
```

**Loop mechanics:**
1. The orchestrator dispatches the builder with the screenshot and a description of the visual issues
2. The builder fixes the issues
3. The orchestrator takes a new screenshot
4. The orchestrator analyzes the new screenshot
5. If still failing: loop again (up to MAX_VISUAL_ITERATIONS, default 3)
6. If passing: emit `browser.loop_passed`
7. If max iterations reached: emit `browser.loop_exhausted`, escalate to user (same as retry exhaustion)

**Builder prompt for visual fixes:**
```
Your implementation of task <task-id> passed static validation but has visual issues.

Screenshot: <path to screenshot>

Visual issues found:
- <issue 1: e.g., "Submit button is hidden behind the footer">
- <issue 2: e.g., "List items have no spacing between them">

Fix these visual issues. Focus on CSS/layout changes. Do not change functionality.
```

**Token efficiency:** The Ralph Wiggum Loop is expensive -- each iteration involves a screenshot (image tokens), analysis (LLM reasoning), and a builder dispatch. The MAX_VISUAL_ITERATIONS cap (default 3) prevents runaway costs. The orchestrator should attempt the easiest fixes first and escalate to the user if the visual issues persist.

### 5. Functional Browser Checks

Beyond visual validation, the browser can verify functional behavior:

- **Console errors:** Use `chrome-devtools: list_console_messages` to check for JavaScript errors
- **Network failures:** Use `chrome-devtools: list_network_requests` to check for failed API calls
- **Element existence:** Use `chrome-devtools: evaluate_script` to verify DOM elements exist
- **Interactive behavior:** Use `chrome-devtools: click`, `chrome-devtools: fill` to test form interactions

These functional checks run alongside visual checks. A page that looks correct but throws console errors still gets `BROWSER VERDICT: FAIL`.

### 6. Updated Dispatch Protocol

The 14-step protocol gains sub-steps within Step 10 for browser validation:

| Step | Name | Change for Stage 9 |
|------|------|---------------------|
| 4 | Decompose into Tasks | **CHANGED** -- adds `validation: static|browser` tagging |
| 6 | Write Spec File | **CHANGED** -- task entries include `validation` field |
| 10 | Execute Waves | **CHANGED** -- browser validation after static validation for browser-tagged tasks |
| 10e | **Browser Validation** | **NEW** sub-step within Step 10 |
| 10f | **Ralph Wiggum Loop** | **NEW** sub-step within Step 10 (if browser FAIL) |
| 11 | Update Spec File | **CHANGED** -- includes browser validation stats |
| 12 | Report Result | **CHANGED** -- reports browser validation results |

### 7. New HOP Configuration Variables

```
DEV_SERVER_CMD:        (optional) command to start the dev server
DEV_SERVER_URL:        (optional) base URL for the dev server
DEV_SERVER_READY:      (optional) ready signal (stdout pattern or health URL)
MAX_VISUAL_ITERATIONS: 3 (default) max Ralph Wiggum Loop iterations
```

### 8. New Observability Events

| Event | When |
|-------|------|
| `browser.detected` | After UI task detection -- reports which tasks are browser-validated |
| `browser.server_started` | When the dev server is started for browser validation |
| `browser.server_stopped` | When the dev server is stopped after browser validation |
| `browser.screenshot` | When a screenshot is taken |
| `browser.analyzed` | After screenshot analysis -- reports findings |
| `browser.loop_started` | When the Ralph Wiggum Loop begins |
| `browser.loop_iteration` | Each iteration of the loop |
| `browser.loop_passed` | When the loop succeeds (visual issues resolved) |
| `browser.loop_exhausted` | When max iterations reached without passing |

### 9. Interaction with Existing Features

- **Fast path:** Browser validation applies to fast-path tasks too, if they are UI-facing
- **Parallel execution (Stage 8):** Browser-tagged tasks within a wave can run their static validation in parallel, but browser validation requires a shared dev server -- browser validation runs sequentially after all parallel merges complete
- **Retry protocol:** Browser FAIL triggers the Ralph Wiggum Loop (not the standard retry). If the loop exhausts, it escalates to the user (same as retry exhaustion)
- **Codex escalation (Stage 6):** Hard + browser-tagged tasks route to Codex for implementation but still get browser validation afterward
- **Spec hardening (Stage 6):** Browser-tagged tasks get their visual acceptance criteria hardened (e.g., "looks good" -> "submit button is visible, form fields are aligned, no console errors")

---

## Relevant Files

### Existing Files to Modify

- `.claude/skills/orchestrator/SKILL.md` -- add UI task detection in Step 4, browser validation sub-steps (10e, 10f) in Step 10, DEV_SERVER HOP Configuration variables, update Steps 11 and 12 with browser stats
- `.claude/skills/orchestrator/references/dag-execution.md` -- add Browser Validation section, Ralph Wiggum Loop protocol, UI task detection heuristics, add Stage 9 events to catalog, update event sequence examples
- `.claude/commands/orchestrate.md` -- document `--no-browser` flag to disable browser validation
- `.claude/CLAUDE.md` -- update project description for Stage 9 (final stage), update "What This Stage Does NOT Do" section
- `docs/agents.md` -- add browser validator role (not a separate agent file -- the orchestrator itself performs browser validation using chrome-devtools MCP tools)
- `specs/master-plan.md` -- mark Stage 9 complete, add file tables, update status, update "Current Status" to reflect all stages complete

### New Files

- `.claude/skills/orchestrator/references/browser-validation.md` -- browser validation reference: UI detection heuristics, dev server lifecycle, screenshot analysis protocol, Ralph Wiggum Loop mechanics, chrome-devtools tool usage, token efficiency guidance
- `docs/patterns/browser-validation.md` -- pattern doc for browser-based validation in agent orchestration
- `specs/stage-9-browser-validation.md` -- this file (stage spec)
- `prompts/stage-9/ui-component.md` -- test prompt that creates a UI component (expect browser validation)
- `prompts/stage-9/backend-only.md` -- test prompt that creates backend code (expect static-only validation, no browser)
- `specs/examples/stage-9-browser-validation.md` -- example spec output showing browser validation events, Ralph Wiggum Loop, screenshots

---

## Implementation Phases

### Phase 1: Foundation (Reference + Pattern Doc)

Create the browser-validation.md reference document and the pattern doc. These define the mechanics before SKILL.md references them.

1. Create browser-validation.md reference with UI detection heuristics, dev server lifecycle, screenshot analysis protocol, Ralph Wiggum Loop mechanics, chrome-devtools tool catalog, token efficiency guidance
2. Create browser-validation.md pattern doc

### Phase 2: Core Implementation (SKILL.md + DAG Reference Updates)

Modify SKILL.md to add UI task detection, browser validation sub-steps, and the Ralph Wiggum Loop. Update dag-execution.md with the new sections.

1. Update SKILL.md Step 4 with UI task detection (validation: static|browser tagging)
2. Update SKILL.md HOP Configuration with DEV_SERVER and MAX_VISUAL_ITERATIONS variables
3. Add SKILL.md Step 10e (Browser Validation) and Step 10f (Ralph Wiggum Loop)
4. Update SKILL.md Steps 11 and 12 with browser validation stats
5. Update dag-execution.md with Browser Validation section, Ralph Wiggum Loop, UI detection, Stage 9 events

### Phase 3: Integration + Polish

Update supporting files, create test prompts, update master plan.

1. Update orchestrate.md with --no-browser flag
2. Update CLAUDE.md project description (final stage)
3. Update agents.md with browser validation notes
4. Create test prompts (UI component, backend-only)
5. Create example spec output
6. Update master-plan.md -- mark Stage 9 complete, mark all stages complete

---

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| All validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |

### Team Members

- Builder
  - Name: builder-reference
  - Role: Create the browser-validation.md reference document and the browser-validation.md pattern doc
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Update SKILL.md with UI task detection, browser validation sub-steps, Ralph Wiggum Loop, and dag-execution.md updates
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Update supporting files (orchestrate.md, CLAUDE.md, agents.md), create test prompts, example spec, update master plan
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage9
  - Role: Validate all Stage 9 files for correctness, consistency, and completeness
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create Browser Validation Reference Document
- **Task ID**: create-browser-reference
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Create `.claude/skills/orchestrator/references/browser-validation.md` with these sections:

**UI Task Detection Heuristics:**
- Define the signals for `validation: browser` classification:
  - File extensions: `.tsx`, `.jsx`, `.svelte`, `.vue`, `.html`, `.css`, `.scss`
  - Directory patterns: `src/components/`, `src/pages/`, `src/views/`, `src/routes/`, `src/layouts/`, `app/`
  - Description keywords: "component", "page", "button", "form", "modal", "layout", "style", "render", "display", "responsive", "viewport"
  - Acceptance criteria keywords: "shows", "displays", "renders", "visible", "centered", "aligned", "responsive"
- Classification rule: if ANY UI signal matches, tag as `validation: browser`
- Override: task description can explicitly opt out with "no browser validation needed" or the `--no-browser` flag disables globally

**Dev Server Lifecycle:**
- Configuration via HOP variables: DEV_SERVER_CMD, DEV_SERVER_URL, DEV_SERVER_READY
- Start protocol:
  1. Check if DEV_SERVER_URL is already reachable (port occupied check)
  2. If reachable: skip starting, emit `browser.server_started { alreadyRunning: true }`
  3. If not reachable: start DEV_SERVER_CMD via Bash in background
  4. Wait for DEV_SERVER_READY signal:
     - If string pattern (e.g., "ready in"): watch stdout for the pattern
     - If URL (e.g., "http://localhost:3000/health"): poll until 200 response
  5. Timeout: 30 seconds. If server doesn't start, emit warning and skip browser validation
- Stop protocol: after all browser-tagged tasks in the wave are validated, stop the dev server process
- Error handling: if server crashes mid-validation, log error, skip remaining browser checks, fall back to static-only

**Screenshot Analysis Protocol:**
- How to take screenshots:
  - Use `chrome-devtools: navigate_page` with the task's target URL
  - Wait for network idle (no pending requests for 500ms)
  - Use `chrome-devtools: take_screenshot` to capture the page
  - Default viewport: 1280x720 (can be overridden in task description)
- How to analyze screenshots:
  - Read the screenshot file using the Read tool (multimodal analysis)
  - Compare against the task's visual acceptance criteria
  - Check for: element visibility, layout correctness, color/typography consistency, responsive behavior, blank areas, broken images, overlapping elements
- Screenshot storage: save to `specs/screenshots/<orchestration-id>/<task-id>-<iteration>.png`

**Ralph Wiggum Loop Mechanics:**
- Entry condition: browser validation returns issues
- Loop:
  1. Emit `browser.loop_started { taskId, maxIterations }`
  2. Dispatch builder with screenshot and issue description
  3. Builder fixes CSS/layout/component
  4. Take new screenshot
  5. Analyze new screenshot
  6. Emit `browser.loop_iteration { taskId, iteration, issuesRemaining }`
  7. If no issues: emit `browser.loop_passed`, exit loop
  8. If issues remain and iteration < MAX_VISUAL_ITERATIONS: go to step 2
  9. If max iterations reached: emit `browser.loop_exhausted`, escalate to user
- Builder prompt template for visual fixes (include screenshot path and issue list)
- Escalation: same as retry exhaustion -- AskUserQuestion with skip/guide/abort options
- The Ralph Wiggum Loop is separate from the standard retry protocol:
  - Standard retry: builder code is wrong (VERDICT: FAIL from static validator)
  - Ralph Wiggum Loop: builder code is correct but visually broken (BROWSER VERDICT: FAIL)
  - A task can go through standard retries AND then the Ralph Wiggum Loop

**Chrome-DevTools Tool Catalog:**
- `navigate_page` -- load a URL in the browser
- `take_screenshot` -- capture the visible page as an image
- `evaluate_script` -- run JavaScript in the page context (for DOM checks)
- `list_console_messages` -- check for JavaScript errors
- `list_network_requests` -- check for failed network requests
- `click` -- click an element (for interactive testing)
- `fill` -- fill a form field (for form testing)
- `resize_page` -- change viewport size (for responsive testing)
- `wait_for` -- wait for a selector or condition
- Note: these are MCP tools from the chrome-devtools server. The orchestrator uses them directly during browser validation (not through a separate agent)

**Functional Browser Checks:**
- Console error check: `list_console_messages` -- any error-level messages -> FAIL
- Network failure check: `list_network_requests` -- any 4xx/5xx responses -> FAIL (with exceptions for expected 404s)
- Element existence check: `evaluate_script("document.querySelector('<selector>')?.textContent")` -- verify expected elements exist
- These run before visual analysis -- a page with console errors fails regardless of visual appearance

**Token Efficiency Guidance:**
- Screenshot analysis is expensive (~1000-2000 tokens per screenshot for multimodal analysis)
- The Ralph Wiggum Loop can consume 3-6x more tokens than standard validation
- MAX_VISUAL_ITERATIONS = 3 by default to cap costs
- Token estimation (Stage 3) should account for browser validation: add ~3000 tokens per browser-tagged task (base), ~6000 per iteration of the Ralph Wiggum Loop
- The `--no-browser` flag disables browser validation entirely for cost-conscious runs

**New Observability Events:**
- `browser.detected` -- after UI task detection: `{ orchestrationId, browserTasks: ["task-a", "task-b"], staticTasks: ["task-c"] }`
- `browser.server_started` -- when dev server starts: `{ orchestrationId, cmd, url, alreadyRunning }`
- `browser.server_stopped` -- when dev server stops: `{ orchestrationId }`
- `browser.screenshot` -- when screenshot taken: `{ orchestrationId, taskId, url, screenshotPath, iteration }`
- `browser.analyzed` -- after analysis: `{ orchestrationId, taskId, issuesFound, issues: [...] }`
- `browser.loop_started` -- when Ralph Wiggum Loop begins: `{ orchestrationId, taskId, maxIterations }`
- `browser.loop_iteration` -- each loop iteration: `{ orchestrationId, taskId, iteration, issuesRemaining }`
- `browser.loop_passed` -- loop succeeded: `{ orchestrationId, taskId, iterations }`
- `browser.loop_exhausted` -- max iterations reached: `{ orchestrationId, taskId }`

### 2. Create Browser Validation Pattern Doc
- **Task ID**: create-browser-pattern
- **Depends On**: none
- **Assigned To**: builder-reference
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1)
- Create `docs/patterns/browser-validation.md` with:
  - **What It Is:** an additional validation tier that launches a browser, renders UI-facing code, and verifies visual and functional correctness through screenshots, DOM inspection, and console/network checks
  - **How We Use It Here:** UI task detection during decomposition, dev server lifecycle management, screenshot-based visual analysis, the Ralph Wiggum Loop for iterative visual refinement, functional checks (console errors, network failures, element existence)
  - **The Ralph Wiggum Loop:**
    - Named for the iterative "look, notice, fix, look again" cycle
    - Screenshot -> analyze -> dispatch builder to fix -> screenshot -> analyze
    - Capped at MAX_VISUAL_ITERATIONS to prevent token runaway
    - Separate from standard retry (retry = code wrong, Ralph Wiggum = code right but visually broken)
  - **Why Browser Validation Matters:**
    - Static validation can't catch visual regressions (layout breaks, missing styles, blank pages)
    - LLMs are multimodal -- they can analyze screenshots for visual issues without a human reviewer
    - The gap between "code that passes tests" and "UI that looks correct" is where most frontend bugs hide
  - **The Two Validation Tiers:**
    - Tier 1 (static): haiku reads files, checks exports, runs tests -- all tasks get this
    - Tier 2 (browser): screenshot analysis, DOM checks, console errors -- only browser-tagged tasks get this
    - Both tiers must pass for a browser-tagged task to receive VERDICT: PASS
  - **Token Cost Reality:**
    - Browser validation is expensive: ~3000 tokens per screenshot analysis
    - The Ralph Wiggum Loop multiplies this by iteration count
    - The `--no-browser` flag exists for cost-sensitive runs
    - Token estimation accounts for browser validation separately
  - **Community Sources:** Playwright visual regression testing, Chromatic (Storybook visual testing), Percy.io snapshot testing, Vercel's agent-browser for headless automation, Copilot Workspace's preview rendering, design-implementation review patterns
  - **Related Documents:** links to SKILL.md, browser-validation reference, dag-execution.md, difficulty-routing.md (hard + UI tasks)

### 3. Validate Reference and Pattern Docs
- **Task ID**: validate-reference-patterns
- **Depends On**: create-browser-reference, create-browser-pattern
- **Assigned To**: validator-stage9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify browser-validation.md reference exists at `.claude/skills/orchestrator/references/browser-validation.md` with sections:
  - UI Task Detection Heuristics
  - Dev Server Lifecycle
  - Screenshot Analysis Protocol
  - Ralph Wiggum Loop Mechanics
  - Chrome-DevTools Tool Catalog
  - Functional Browser Checks
  - Token Efficiency Guidance
  - Observability Events (9 new events with payloads)
- Verify `docs/patterns/browser-validation.md` exists with What/How/Why/Sources sections
- Verify chrome-devtools tools referenced are valid MCP tool names (navigate_page, take_screenshot, evaluate_script, list_console_messages, list_network_requests, click, fill, resize_page, wait_for)
- Verify cross-references between the two files are consistent
- Verify UI detection heuristics are concrete (specific file extensions, directory patterns, keywords)
- Report VERDICT: PASS or VERDICT: FAIL

### 4. Update SKILL.md with Browser Validation
- **Task ID**: update-skill-md
- **Depends On**: validate-reference-patterns
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current SKILL.md thoroughly before modifying
- Update title: "HOP Orchestrator (Stage 9 - Browser Validation)" -- this is the final stage
- **HOP Configuration updates:**
  - Add DEV_SERVER_CMD, DEV_SERVER_URL, DEV_SERVER_READY, MAX_VISUAL_ITERATIONS variables
  - Document defaults: MAX_VISUAL_ITERATIONS = 3, others optional (browser validation disabled if DEV_SERVER not configured)
- **Step 4 changes (Decompose into Tasks):**
  - After decomposition, classify each task: `validation: static` or `validation: browser`
  - Reference browser-validation.md for detection heuristics
  - Record validation type in the task definition and spec file
  - Emit `browser.detected` event with the classification results
- **Step 6 changes (Write Spec File):**
  - Task entries include `Validation: static|browser` field
  - Task Graph table includes a Validation column
- **Step 10 changes (Execute Waves) -- add sub-steps 10e and 10f:**
  - **Step 10e: Browser Validation** (after Step 10d parallel validators, for browser-tagged tasks only):
    1. Ensure dev server is running (start if needed, reference lifecycle protocol)
    2. For each browser-tagged task that passed static validation:
       - Navigate to the task's target URL
       - Run functional checks (console errors, network failures, element existence)
       - Take screenshot
       - Analyze screenshot against visual acceptance criteria
       - If all checks pass: `BROWSER VERDICT: PASS`
       - If any check fails: `BROWSER VERDICT: FAIL` -- enter Step 10f
    3. After all browser checks: stop dev server if we started it
  - **Step 10f: Ralph Wiggum Loop** (for browser-tagged tasks with BROWSER VERDICT: FAIL):
    1. Emit `browser.loop_started`
    2. Dispatch builder with screenshot and visual issue description
    3. After builder fixes: take new screenshot, re-analyze
    4. Emit `browser.loop_iteration`
    5. If pass: emit `browser.loop_passed`, continue
    6. If fail and iterations < MAX_VISUAL_ITERATIONS: go to step 2
    7. If fail and iterations >= MAX_VISUAL_ITERATIONS: emit `browser.loop_exhausted`, escalate to user (same as retry exhaustion)
- **Steps 11 and 12 changes:**
  - Step 11: include browser validation stats in Result section (tasks browser-validated, Ralph Wiggum iterations, loop outcomes)
  - Step 12: report browser validation results alongside static validation results
- **Update "What This Stage Does NOT Do":**
  - This is the final stage -- remove or replace this section with "Completed Capabilities" listing all 9 stages
  - Or: note remaining future enhancements not covered (e.g., "No live API cost data", "No persistent state database")

### 5. Update dag-execution.md Reference
- **Task ID**: update-dag-reference
- **Depends On**: validate-reference-patterns
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 4)
- Read current dag-execution.md thoroughly before modifying
- Update header: "Introduced in: Stage 2 (updated in Stage 3, Stage 6, Stage 7, Stage 8, Stage 9)"
- Add "Browser Validation" section after Parallel Execution:
  - Reference browser-validation.md for the full protocol
  - Summarize: UI-facing tasks get an additional browser validation pass after static validation
  - Document the `validation: static|browser` task field
  - Document dev server lifecycle (start before browser tasks, stop after)
  - Document the Ralph Wiggum Loop as a sub-protocol within Step 10
- Add "UI Task Detection" section:
  - Reference browser-validation.md for heuristics
  - Show how detection integrates with decomposition (Step 4)
  - Note that detection extends difficulty scoring (Stage 6): a task can be both `hard` and `browser`
- Extend Task Decomposition Rules with `validation` field (new required field for tasks)
- Extend Spec File Template with `Validation` column in Task Graph table and `Validation: static|browser` field in task entries
- Add Stage 9 events to Observability Events section:
  - All 9 new events with JSON payload templates
- Update Full Event Sequence to show a Stage 9 flow:
  - browser.detected, browser.server_started, browser.screenshot, browser.analyzed, browser.loop_started (if FAIL), browser.loop_passed, browser.server_stopped
- Update Related Documents table

### 6. Validate Skill and Reference Updates
- **Task ID**: validate-skill-updates
- **Depends On**: update-skill-md, update-dag-reference
- **Assigned To**: validator-stage9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md title includes "Stage 9"
- Verify SKILL.md HOP Configuration includes DEV_SERVER_CMD, DEV_SERVER_URL, DEV_SERVER_READY, MAX_VISUAL_ITERATIONS
- Verify SKILL.md Step 4 has UI task detection with `validation: static|browser` tagging
- Verify SKILL.md Step 6 spec file includes Validation field
- Verify SKILL.md has Steps 10e (Browser Validation) and 10f (Ralph Wiggum Loop)
- Verify SKILL.md Step 10e references chrome-devtools MCP tools
- Verify SKILL.md Step 10f has iteration cap and user escalation
- Verify SKILL.md Steps 11 and 12 include browser validation stats
- Verify SKILL.md references browser-validation.md for protocol details
- Verify dag-execution.md has Browser Validation and UI Task Detection sections
- Verify dag-execution.md event catalog includes 9 new events
- Verify dag-execution.md spec file template includes Validation column
- Verify dag-execution.md event sequence includes browser validation flow
- Report VERDICT: PASS or VERDICT: FAIL

### 7. Update orchestrate.md Command
- **Task ID**: update-command
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 8, 9, 10)
- Read current orchestrate.md before modifying
- Add `--no-browser` flag documentation (disables browser validation, all tasks get static-only validation)
- Update usage examples showing browser validation for UI tasks
- Note that browser validation requires chrome-devtools MCP server to be configured

### 8. Update CLAUDE.md Project Description
- **Task ID**: update-claude-md
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 9, 10)
- Update project description to reflect Stage 9 (final stage -- all 9 stages complete)
- Update "How to Use" with examples showing browser validation
- Update "Architecture" to mention the two validation tiers (static + browser)
- Replace "What This Stage Does NOT Do" with a section reflecting the completed system -- note any remaining future enhancements outside the 9-stage scope
- Update the stage reference from "Stage 3" to "Stage 9" throughout

### 9. Update agents.md
- **Task ID**: update-agents-md
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 8, 10)
- Read current agents.md before modifying
- Add "Stage 9: Browser Validation" section:
  - Browser validation is NOT a separate agent -- it's performed by the orchestrator using chrome-devtools MCP tools
  - The orchestrator itself takes screenshots, analyzes them, and dispatches builders for visual fixes
  - The standard validator (haiku) still runs for static checks
  - Document the two-tier validation: static (haiku agent) + browser (orchestrator with chrome-devtools)
- Note that builders dispatched during the Ralph Wiggum Loop get visual feedback (screenshots + issue descriptions) in their prompts

### 10. Create Test Prompts and Example Spec
- **Task ID**: create-test-prompts
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 7, 8, 9)
- Create `prompts/stage-9/ui-component.md`:
  - A prompt that creates a UI component (e.g., "create a user profile card component in src/components/UserCard.tsx with name, email, avatar, and an edit button")
  - Expected behavior: task tagged `validation: browser`, static validation runs first, then browser validation takes screenshot and analyzes
  - Document expected events: browser.detected, browser.server_started, browser.screenshot, browser.analyzed
  - If the component has visual issues: expect Ralph Wiggum Loop
- Create `prompts/stage-9/backend-only.md`:
  - A prompt that creates backend code (e.g., "add a /health endpoint that returns { status: 'ok' }")
  - Expected behavior: task tagged `validation: static`, NO browser validation
  - Document expected events: browser.detected (with this task in staticTasks, NOT browserTasks)
  - This verifies that browser validation is correctly opt-in, not applied to everything
- Create `specs/examples/stage-9-browser-validation.md`:
  - Example spec output showing:
    - Task Graph with Validation column (some tasks static, some browser)
    - Task entries with `Validation: browser` field
    - Execution Log showing browser validation events: screenshot taken, analyzed, issues found
    - Ralph Wiggum Loop: 2 iterations, visual fix dispatched, screenshot retaken, BROWSER VERDICT: PASS
    - Result section with browser validation stats (tasks browser-validated: 2, Ralph Wiggum iterations: 3, loops passed: 2)

### 11. Update Master Plan
- **Task ID**: update-master-plan
- **Depends On**: update-command, update-claude-md, update-agents-md, create-test-prompts
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current `specs/master-plan.md` thoroughly
- Update Stage 9 status from "Planned" to "Complete" in the status table
- Update the overall "Current Status" section to reflect that all 9 stages are now complete
- Add a complete file table for Stage 9 (matching format of Stages 1-3):
  - List all new and modified files with commit group assignments
- Add verification section for Stage 9:
  1. UI task detection: orchestrate a frontend task -- expect `validation: browser` tag
  2. Backend-only: orchestrate a backend task -- expect `validation: static` only, no browser events
  3. Ralph Wiggum Loop: orchestrate a UI task with visual issues -- expect screenshot-fix-screenshot loop
  4. --no-browser flag: orchestrate a UI task with --no-browser -- expect static-only validation
- Add a "Project Complete" section noting all 9 stages are implemented
- Remove "Next step" (there is no Stage 10)

### 12. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-master-plan
- **Assigned To**: validator-stage9
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all new files exist:
  - `.claude/skills/orchestrator/references/browser-validation.md`
  - `docs/patterns/browser-validation.md`
  - `prompts/stage-9/ui-component.md`
  - `prompts/stage-9/backend-only.md`
  - `specs/examples/stage-9-browser-validation.md`
- Verify all modified files reference Stage 9:
  - SKILL.md title includes "Stage 9"
  - SKILL.md HOP Configuration includes DEV_SERVER variables
  - SKILL.md Step 4 has UI task detection
  - SKILL.md has Steps 10e and 10f
  - dag-execution.md has Browser Validation and UI Task Detection sections
  - dag-execution.md event catalog has 9 new events
  - dag-execution.md spec file template includes Validation field
  - orchestrate.md has --no-browser flag
  - CLAUDE.md reflects Stage 9 / final stage
  - agents.md has browser validation section
  - master-plan.md shows Stage 9 as complete and all stages complete
- Verify cross-references are consistent:
  - SKILL.md references browser-validation.md for protocol details
  - browser-validation reference events match dag-execution.md catalog
  - Pattern doc links are valid relative paths
  - Chrome-devtools tool names are consistent across all files
- Verify Ralph Wiggum Loop has iteration cap and user escalation
- Verify dev server lifecycle has start, ready-wait, and stop protocols
- Verify token efficiency guidance accounts for browser validation costs
- Run `bun run validate` to verify no lint/typecheck/test regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. SKILL.md Step 4 classifies tasks as `validation: static` or `validation: browser` using concrete heuristics
2. SKILL.md HOP Configuration includes DEV_SERVER_CMD, DEV_SERVER_URL, DEV_SERVER_READY, MAX_VISUAL_ITERATIONS
3. SKILL.md Step 10e performs browser validation: navigate, screenshot, analyze, functional checks
4. SKILL.md Step 10f implements the Ralph Wiggum Loop: screenshot -> analyze -> dispatch builder -> screenshot (capped at MAX_VISUAL_ITERATIONS)
5. Browser validation is additive -- static validation (haiku) still runs for all tasks
6. Browser validation is opt-in -- only tasks tagged `validation: browser` get browser checks
7. The `--no-browser` flag disables browser validation entirely
8. Dev server lifecycle is managed: start before browser tasks, stop after
9. 9 new observability events are documented and emitted at correct points
10. browser-validation.md reference contains the full protocol, heuristics, loop mechanics, and token guidance
11. Pattern doc explains browser validation and the Ralph Wiggum Loop with community context
12. Test prompts exercise both browser validation (UI component) and static-only (backend code)
13. Master plan shows Stage 9 as complete and all 9 stages complete
14. `bun run validate` passes with no regressions

---

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

---

## Notes

- **Browser validation requires the chrome-devtools MCP server.** If the MCP server is not configured in the user's Claude Code settings, browser validation is unavailable. The orchestrator should detect this and fall back to static-only validation with a warning.
- **The Ralph Wiggum Loop is expensive.** Each iteration involves a screenshot (multimodal tokens), analysis, and a builder dispatch. MAX_VISUAL_ITERATIONS = 3 is conservative. For complex UIs, users can increase this, but the cost grows linearly.
- **Browser validation runs sequentially even in parallel mode (Stage 8).** The dev server is a shared resource -- multiple browser validations hitting it simultaneously could cause flaky results. Browser validation for all tasks in a wave runs sequentially after all parallel merges complete.
- **The orchestrator performs browser validation directly -- not via a separate agent.** The orchestrator has access to chrome-devtools MCP tools and can read screenshots (multimodal). A separate "browser validator" agent would add dispatch overhead without benefit. The orchestrator is the right actor because it has the full task context and can coordinate the Ralph Wiggum Loop without round-tripping through another agent.
- **Stages 4-8 dependency:** This plan assumes Stages 4-8 are complete. The SKILL.md being modified already has --team switching (Stage 4), plugin extraction (Stage 5), Codex escalation and spec hardening (Stage 6), HITL bounce-back and persistence (Stage 7), and parallel execution with worktrees (Stage 8). If executing before those stages, apply changes to the current SKILL.md and note that those features are absent.
- **No TypeScript code changes are required for Stage 9.** This is a pure prompt/docs/reference stage. The emit-event.ts script already handles arbitrary event payloads. Browser automation is handled by chrome-devtools MCP tools.
- **This is the final stage.** After Stage 9, the HOP Orchestrator has all planned capabilities: dispatch loop, DAG execution, retry, clarifying questions, fast path, plan refinement, token estimation, team switching, plugin extraction, Codex escalation, spec hardening, HITL bounce-back, persistence/hydration, parallel execution, worktree isolation, and browser validation. The master plan is complete.
- **The "Ralph Wiggum" name is a working title.** It describes the loop's behavior: look at it, notice something wrong, fix it, look again. It's catchy and memorable for educational purposes. In production documentation, it could be called "Visual Refinement Loop" or "Screenshot-Driven Fix Loop."
