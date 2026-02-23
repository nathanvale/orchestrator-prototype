---
title: Codex Escalation Reference
stage: 6
applies-to: SKILL.md Steps 4b, 7b, 10
---

# Codex Escalation Reference

This reference documents the Codex CLI integration added in Stage 6. It covers difficulty signal definitions, the Codex dispatch protocol, fallback behaviour, and the ambiguity signals used during spec hardening.

---

## Difficulty Signal Definitions

The orchestrator evaluates each task against these signals in Step 4b.

### Hard Signals

Any single match tags the task as `hard`.

| Signal | Description | Example |
|--------|-------------|---------|
| **File count** | Task touches 5+ files | "Migrate the auth module across src/auth/, src/middleware/, src/routes/, src/types/, and tests/" |
| **Pattern complexity** | Requires understanding complex existing code (refactor, migration) | "Refactor class-based services to functional" |
| **Algorithmic complexity** | Non-trivial algorithms or data transformations | "Implement LRU cache with O(1) get/put" |
| **Trigger words** | Description uses "optimize", "refactor across", "migrate", "consolidate" | "Migrate user store from Redux to Zustand" |
| **Acceptance criteria count** | Task has 5+ acceptance criteria | Tasks with exhaustive test coverage requirements |
| **Cross-module analysis** | Requires tracing dependencies across module boundaries | "Update all callers of getUser() to use the new signature" |

### Standard Signals

All must be absent of hard signals for the task to be tagged `standard`.

| Signal | Description |
|--------|-------------|
| **Greenfield** | Task creates new files that do not yet exist |
| **Narrow scope** | Modifies 1-2 files |
| **Pattern following** | Implements a pattern already established in the codebase |
| **Clear I/O** | Has unambiguous inputs, outputs, and error cases |

### Scoring Rule

If ANY hard signal matches, the task is `hard`. Otherwise it is `standard`.

**The difficulty field is advisory.** The orchestrator applies judgment. A task that touches 5 files to add JSDoc comments follows an existing pattern with clear scope -- tag it `standard` despite the file count. A task that creates one new file but requires deep cross-module analysis is `hard`.

---

## Codex Availability Check

Run once in Step 4b, cache the result for the orchestration run.

```bash
which codex 2>/dev/null
```

- Exit 0 with a path: Codex is installed. Set `CODEX_ENABLED = true`.
- Exit 1 (no output): Codex is not installed. Set `CODEX_ENABLED = false`.
- `--no-codex` flag was present: `CODEX_ENABLED = false` regardless of install status.

The `codex.checked` event records both `available` (install status) and `noCodexFlag` (whether the user disabled it). This lets the dashboard distinguish "not installed" from "user override".

---

## Codex Dispatch Protocol

When a task is tagged `hard` and `CODEX_ENABLED == true`, dispatch via Codex CLI instead of the standard builder.

### Invocation

```bash
codex exec --full-auto '<full task description and acceptance criteria>'
```

**Prompt content:** Pass the full hardened task description (post-Step-7b). Include:
- Subject line
- All file paths
- Function signatures where specified
- All acceptance criteria (verbatim from spec)
- Any audit trail notes from spec hardening

**Timeout:** 300,000ms (5 minutes). Hard tasks may require extended analysis.

### Success Path

Exit code 0 -- Codex completed the task.

1. Emit `codex.completed`.
2. Skip standard builder dispatch entirely.
3. Proceed directly to validator dispatch (Step 10, validator section).

The validator always runs regardless of which builder path was used.

### Failure Path

Non-zero exit code or timeout -- Codex did not complete the task.

1. Emit `codex.fallback` with the reason (`"exit code N"` or `"timeout"`).
2. Fall through to standard builder dispatch.
3. The fallback does NOT count against the 3-retry cap. It is a routing decision, not a task failure.

### Not-Installed Path

If `CODEX_ENABLED == false` because Codex is not installed:

1. Emit `codex.fallback` with reason `"not installed"`.
2. Fall through to standard builder dispatch immediately.

---

## Routing Decision Matrix

| Difficulty | CODEX_ENABLED | Codex Result | Builder Used |
|------------|---------------|--------------|--------------|
| standard | true | n/a | Standard builder |
| standard | false | n/a | Standard builder |
| hard | false | n/a | Standard builder |
| hard | true | exit 0 | Codex (skip standard builder) |
| hard | true | non-zero exit | Standard builder (fallback) |
| hard | true | timeout | Standard builder (fallback) |

---

## Ambiguity Signals for Spec Hardening

Used in Step 7b (full hardening pass) and Step 3b (mini-hardening pass for fast path tasks).

### Signals That Trigger Rewrite

| Signal Type | Examples |
|-------------|---------|
| **Vague phrases** | "handle appropriately", "should work", "as needed", "properly", "correctly" |
| **Filler language** | "etc.", "similar", "and so on", "and others" |
| **Missing file paths** | "the types file", "the config", "the user module" (without explicit paths) |
| **Implicit dependencies** | "also update the related tests" without naming the test file |
| **Vague acceptance criteria** | "works correctly", "handles edge cases", "is robust" |
| **Unspecified error handling** | "handle errors" or "return an error" without specifying status codes or error shapes |

### Hardening Actions

For each signal found:

1. **Resolve file paths** -- use Glob/Grep to find the actual files. Replace "the types file" with `src/types/user.ts`.
2. **Concretize vague phrases** -- replace "handle errors appropriately" with "return HTTP 400 for validation errors with `{ error: string }` body; return HTTP 500 for unexpected failures".
3. **Enumerate implicit items** -- if "similar tests" implies 3 test cases, name all 3.
4. **Add measurable criteria** -- replace "works correctly" with "returns 200 with `{ id, name, email }` for an existing user; returns 404 with `{ error: 'User not found' }` for a missing user".
5. **Specify signatures** -- if the description says "add a helper function", give it a name, parameter types, and return type.

### Audit Trail Format

```markdown
### <task-id>

- ...
- Status: pending

**Pre-Hardening Description:**
<original description verbatim>

**Description:** [hardened]
<rewritten description with resolved paths, concrete criteria, explicit error responses>

**Acceptance Criteria:** [hardened]
- <criterion 1 - concrete and measurable>
- <criterion 2 - concrete and measurable>
```

The `[hardened]` annotation makes it clear to builders and post-mortems which sections were rewritten.

---

## When to Route to Codex vs Standard Builder

Use Codex when:
- The task is a large-scale refactor touching many files
- The task requires broad codebase understanding before any changes
- The task has complex dependency chains that benefit from Codex's extended context

Use standard builder when:
- The task is greenfield (new file, clear spec)
- The task modifies 1-2 well-scoped files
- The task follows an established pattern
- Codex is not available (`--no-codex` flag or not installed)
- Codex failed on a previous attempt for this task (after fallback, use standard builder for all retries)

**Retry behaviour after Codex fallback:** If Codex fails and the standard builder is dispatched as fallback, subsequent retries (Step 11) always use the standard builder. Do not attempt Codex again for the same task after a fallback.

---

## Event Reference

| Event | Payload | When |
|-------|---------|------|
| `difficulty.assessed` | `{ tasks: [{ taskId, difficulty }] }` | After Step 4b scoring |
| `codex.checked` | `{ available: bool, noCodexFlag: bool }` | After `which codex` check |
| `codex.dispatched` | `{ taskId, prompt }` | Before invoking Codex CLI |
| `codex.completed` | `{ taskId, exitCode: 0 }` | After Codex exits 0 |
| `codex.fallback` | `{ taskId, reason }` | After Codex failure or not installed |
| `spec.hardened` | `{ tasksModified, summary }` | After Step 7b completes |
