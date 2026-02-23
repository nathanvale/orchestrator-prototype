# Example Spec Output: Stage 9 - Browser Validation + Ralph Wiggum Loop

This is an example of what the orchestrator produces when a UI task is validated with browser-based screenshot validation, and the initial browser check fails, triggering the Ralph Wiggum visual retry loop.

**Stage:** 9 (Browser Validation + Ralph Wiggum Loop)

---

## Prompt

```
/orchestrate "add a user profile card component at src/components/ProfileCard.tsx that displays a circular 64px avatar image, the user's name in 18px bold, and their email in 14px gray text. Card has white background, shadow, rounded corners."
```

---

## Execution Summary

**Wave 1:** 1 task (sequential -- define types)
**Wave 2:** 2 tasks (parallel -- implement component + write tests)

Browser validation triggered for: `implement-profile-card` (tagged `ui: true`)
Ralph Wiggum loop: 1 iteration (fixed on second attempt)

Total worktrees created: 2
Parallel waves: 1
Browser validations: 1
Screenshots taken: 2
Dev server started: true

---

## Spec File Written

`specs/profile-card.md`

---

## Complete Spec File Output

Below is the full content of `specs/profile-card.md` as written by the orchestrator, then updated through execution.

---

```markdown
# Orchestration Spec: Profile Card

## Prompt

add a user profile card component at src/components/ProfileCard.tsx that displays a circular 64px avatar image, the user's name in 18px bold, and their email in 14px gray text. Card has white background, shadow, rounded corners.

## Team

engineering (builder: builder, validator: validator)

## Routing

Codex enabled: true
Codex available: false

## Task Graph

| Task ID | Subject | Dependencies | Wave | Difficulty | UI | Status |
|---------|---------|-------------|------|------------|----|--------|
| define-user-types | Define User type with name, email, avatarUrl in src/types/user.ts | (none) | 1 | standard | false | completed |
| implement-profile-card | Implement ProfileCard component in src/components/ProfileCard.tsx | define-user-types | 2 | standard | true | completed |
| write-card-tests | Write tests for ProfileCard component in tests/profile-card.test.ts | define-user-types | 2 | standard | false | completed |

## Tasks

### define-user-types

- Subject: Define User type with name, email, avatarUrl in src/types/user.ts
- Dependencies: (none)
- Wave: 1
- Difficulty: standard
- UI: false
- Status: completed
- Retries: 0

**Description:**
Create `src/types/user.ts` with one named export: `User`.

`User`:
- `id: string` -- UUID
- `name: string` -- display name
- `email: string` -- email address
- `avatarUrl: string` -- URL to avatar image

No runtime logic. Types only. JSDoc on the exported type.

**Acceptance Criteria:**
- `src/types/user.ts` exists with named export `User`
- All four fields present with correct types
- JSDoc comment on the `User` type
- No default exports

### implement-profile-card

- Subject: Implement ProfileCard component in src/components/ProfileCard.tsx
- Dependencies: define-user-types
- Wave: 2
- Difficulty: standard
- UI: true
- Browser validation URL: /
- Status: completed
- Retries: 0
- Visual retries: 1

**Description:**
Create `src/components/ProfileCard.tsx` with a named export `ProfileCard`.

Import `User` from `../types/user.ts`.

Props: `{ user: User }`

Visual requirements (hardened from prompt):
- Avatar: `<img>` tag, `border-radius: 50%`, exactly `width: 64px; height: 64px`, positioned top-left of card body
- Name: `font-size: 18px; font-weight: bold;` below avatar
- Email: `font-size: 14px; color: #6b7280;` (Tailwind gray-500) below name
- Card wrapper: `background: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.12); border-radius: 12px; padding: 24px;`

**Acceptance Criteria:**
- `src/components/ProfileCard.tsx` exists with named export `ProfileCard`
- Component renders avatar, name, and email from props
- CSS matches visual spec above (inline styles or Tailwind classes)
- JSDoc on the `ProfileCard` export
- No default exports

**Pre-Hardening:** "displays a circular 64px avatar image, the user's name in 18px bold, and their email in 14px gray text. Card has white background, shadow, rounded corners."

**Hardening applied [hardened]:** Added exact pixel values, color code, border-radius value, and padding. Added explicit avatar position requirement. Specified CSS approach (inline styles or Tailwind).

### write-card-tests

- Subject: Write tests for ProfileCard component in tests/profile-card.test.ts
- Dependencies: define-user-types
- Wave: 2
- Difficulty: standard
- UI: false
- Status: completed
- Retries: 0

**Description:**
Create `tests/profile-card.test.ts` with tests for the `ProfileCard` component.

Import `ProfileCard` from `src/components/ProfileCard.tsx`.

Tests:
- Renders with a valid user object (no errors thrown)
- Avatar img tag has `border-radius: 50%` and width/height of 64px
- Name is rendered in a child element with bold font weight
- Email text is present and uses gray color

**Acceptance Criteria:**
- `tests/profile-card.test.ts` exists
- All 4 test cases pass with `bun test`

## Execution Log

### Wave 1

**define-user-types** -- PASS

Builder completed. Created `src/types/user.ts` with `User` type. All fields present. JSDoc added. No default exports.

Validator verdict: VERDICT: PASS

No UI tag -- skip browser validation.

### Wave 2 (Parallel Dispatch)

Dispatch strategy: PARALLEL (2 tasks, SEQUENTIAL_MODE=false)

wave.parallel_start: { waveNumber: 2, taskIds: ["implement-profile-card", "write-card-tests"], taskCount: 2 }

Both builders dispatched concurrently with worktree isolation.

Worktrees created:
- `/tmp/hop-w2-implement-profile-card` -- builder for implement-profile-card
- `/tmp/hop-w2-write-card-tests` -- builder for write-card-tests

All 2 builders completed. No bounce-back triggers detected.

Merge results:
- `implement-profile-card` diff applied cleanly
- `write-card-tests` diff applied cleanly
- No conflicts detected

All 2 validators dispatched concurrently on merged state.

Verdicts (standard code validation):
- implement-profile-card: VERDICT: PASS
- write-card-tests: VERDICT: PASS

wave.parallel_complete: { parallelTasks: 2, conflictTasks: 0, sequentialFallbacks: 0 }

#### Browser Validation: implement-profile-card

Task tagged `ui: true`. BROWSER_ENABLED=true. DEV_SERVER_CMD configured.

Dev server started: `bun run dev` (PID 18240)
Server ready at http://localhost:3000

Screenshot taken: `/tmp/browser-val-3.png`
Browser validator dispatched.

**VERDICT: FAIL failure_mode:visual**
> "Avatar image is not circular -- appears as a square. border-radius:50% does not appear to be applied. Name renders correctly. Email renders correctly."

#### Ralph Wiggum Loop: implement-profile-card

ralph_wiggum.iteration: { taskId: "3", iteration: 1, maxIterations: 3 }

Builder re-dispatched with:
- Screenshot: `/tmp/browser-val-3.png`
- Failure: "Avatar image is not circular -- border-radius:50% not applied"
- Previous attempts: (none yet)

Builder fix: Added `style={{ borderRadius: '50%' }}` directly to `<img>` tag (was relying on CSS class that was stripped by bundler).

New screenshot taken: `/tmp/browser-val-3-attempt-1.png`

Browser validator re-validates.

**VERDICT: PASS**
> "Avatar is now circular (64x64px, border-radius 50%). Name in bold 18px. Email in gray 14px. Card has white background with shadow and rounded corners. All visual criteria met."

ralph_wiggum.passed: { taskId: "3", iterations: 1 }

implement-profile-card marked completed.

#### write-card-tests

No UI tag. Marked completed immediately after standard VERDICT: PASS.

Dev server stopped: PID 18240

## Result

All 3 tasks completed across 2 waves.

Team: engineering (builder: builder, validator: validator)

Execution summary:
- Tasks passed on first attempt: 3
- Tasks passed after retry: 0
- Tasks skipped after retry exhaustion: 0
- Total retries performed: 0
- Tasks routed to Codex: 0
- Codex fallbacks to standard builder: 0
- Tasks hardened during spec hardening: 1
- Bounce-backs: 0 total
- Bounce resolutions: 0 proceeded with guidance, 0 restructured, 0 skipped
- parallelWaves: 1
- sequentialFallbacks: 0
- totalWorktrees: 2
- browserValidations: 1
- ralphWiggumLoops: 1
- screenshotsTaken: 2
- devServerStarted: true

Files created or modified:
- `src/types/user.ts` -- User type definition
- `src/components/ProfileCard.tsx` -- ProfileCard component
- `tests/profile-card.test.ts` -- component tests

Fast path: no
Clarifying questions asked: 0
Resumed from: (not a resumed run)

## Hydration Checkpoint

```yaml
orchestration_id: orch-1708900000000
team: engineering
current_wave: completed
status: completed
agent_sessions: {}
retry_state:
  define-user-types: { attempts: 0, last_verdict: "PASS" }
  implement-profile-card: { attempts: 0, last_verdict: "PASS", visual_retries: 1, last_browser_verdict: "PASS" }
  write-card-tests: { attempts: 0, last_verdict: "PASS" }
bounce_history: []
codex_available: false
sequential_mode: false
browser_enabled: true
dev_server_started: true
dev_server_pid: 18240
parallel_waves: 1
total_worktrees: 2
sequential_fallbacks: 0
browser_validations: 1
ralph_wiggum_loops: 1
screenshots_taken: 2
timestamp: 2026-02-23T14:00:00.000Z
```
```

---

## Event Log

```
team.resolved               { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }
orchestration.started       { prompt: "add a user profile card component...", team: "engineering" }
clarification.skipped       { reason: "component spec with explicit visual requirements" }
fast_path.evaluated         { triggered: false, reason: "3 tasks across 2 waves" }
decomposition.completed     { taskCount: 3, waveCount: 2 }
difficulty.assessed         { tasks: [{ taskId: "define-user-types", difficulty: "standard" }, { taskId: "implement-profile-card", difficulty: "standard" }, { taskId: "write-card-tests", difficulty: "standard" }] }
ui.detected                 { uiTasks: ["implement-profile-card"], possibleUiTasks: [], browserEnabled: true }
codex.checked               { available: false, noCodexFlag: false }
spec.written                { specPath: "specs/profile-card.md", team: "engineering" }
checkpoint.written          { currentWave: 1 }
plan.presented              { taskCount: 3, waveCount: 2, team: "engineering" }
plan.approved               { orchestrationId: "orch-1708900000000" }
spec.hardened               { tasksModified: 1, summary: "added exact pixel values, color codes, and CSS property values to ProfileCard description" }
tokens.estimated            { estimatedTokens: 13500, breakdown: { wave1: 4500, wave2: 9000 } }

task.created                { taskId: "1", subject: "Define User type" }
task.created                { taskId: "2", subject: "Implement ProfileCard component" }
task.created                { taskId: "3", subject: "Write ProfileCard tests" }

spec.reread                 { waveNumber: 1 }
wave.started                { waveNumber: 1, taskIds: ["define-user-types"] }
  -- 1 task: sequential dispatch
  agent.dispatched          { role: "builder", taskId: "1", model: "sonnet" }
  checkpoint.written        { currentWave: 1 }
  agent.completed           { role: "builder", taskId: "1" }
  agent.dispatched          { role: "validator", taskId: "1", model: "haiku" }
  agent.completed           { role: "validator", taskId: "1" }
  verdict.received          { taskId: "1", verdict: "PASS" }
  -- no ui tag: skip browser validation, mark completed
  checkpoint.written        { currentWave: 1 }
wave.completed              { waveNumber: 1, verdicts: { "define-user-types": "PASS" } }
checkpoint.written          { currentWave: 2 }

spec.reread                 { waveNumber: 2 }
wave.started                { waveNumber: 2, taskIds: ["implement-profile-card", "write-card-tests"] }
  -- 2 tasks, SEQUENTIAL_MODE=false: parallel dispatch
  wave.parallel_start       { waveNumber: 2, taskIds: [...], taskCount: 2 }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet", isolation: "worktree" }
  agent.dispatched          { role: "builder", taskId: "3", model: "sonnet", isolation: "worktree" }
  -- both builders running concurrently ...
  agent.completed           { role: "builder", taskId: "2" }
  agent.completed           { role: "builder", taskId: "3" }
  -- merge worktree diffs: no conflicts
  -- bounce-back detection: no triggers
  agent.dispatched          { role: "validator", taskId: "2", model: "haiku", isolation: "worktree" }
  agent.dispatched          { role: "validator", taskId: "3", model: "haiku", isolation: "worktree" }
  agent.completed           { role: "validator", taskId: "2" }
  agent.completed           { role: "validator", taskId: "3" }
  verdict.received          { taskId: "2", verdict: "PASS" }   -- standard code validation PASS
  verdict.received          { taskId: "3", verdict: "PASS" }
  -- taskId: "3" (write-card-tests) has no ui tag: mark completed
  -- taskId: "2" (implement-profile-card) tagged ui:true: proceed to browser validation
  devserver.started         { pid: 18240, cmd: "bun run dev" }
  browser.validation_started { taskId: "2", screenshotPath: "/tmp/browser-val-2.png" }
  -- VERDICT: FAIL failure_mode:visual -- avatar not circular
  ralph_wiggum.iteration    { taskId: "2", iteration: 1, maxIterations: 3 }
  agent.dispatched          { role: "builder", taskId: "2", model: "sonnet" }  -- re-dispatch with screenshot
  agent.completed           { role: "builder", taskId: "2" }
  -- new screenshot: /tmp/browser-val-2-attempt-1.png
  browser.validation_started { taskId: "2", screenshotPath: "/tmp/browser-val-2-attempt-1.png" }
  -- VERDICT: PASS -- all visual criteria met
  ralph_wiggum.passed       { taskId: "2", iterations: 1 }
  wave.parallel_complete    { waveNumber: 2, parallelTasks: 2, conflictTasks: 0, sequentialFallbacks: 0 }
wave.completed              { waveNumber: 2, verdicts: { "implement-profile-card": "PASS", "write-card-tests": "PASS" } }
checkpoint.written          { currentWave: "completed" }
devserver.stopped           { pid: 18240 }

orchestration.completed     { verdict: "PASS", team: "engineering", taskCount: 3, retriesTotal: 0,
                              fastPath: false, clarifyingQuestionsAsked: 0, codexTasks: 0,
                              codexFallbacks: 0, tasksHardened: 1, bounceBackTotal: 0,
                              parallelWaves: 1, totalWorktrees: 2, sequentialFallbacks: 0,
                              browserValidations: 1, ralphWiggumLoops: 1, screenshotsTaken: 2,
                              devServerStarted: true, resumed: false }
```
