# Pattern: Spec Hardening

## What It Is

Spec Hardening is a pre-dispatch quality gate that audits each task description for ambiguity, resolves vague language into concrete specifics, and preserves the original text in an audit trail. A hardened spec gives the builder unambiguous instructions and measurable acceptance criteria.

**The core idea:** the orchestrator decomposed the task, but decomposition does not guarantee precision. "Handle errors" is a valid task description -- it just does not tell the builder what error codes to return, what the response body should look like, or which callsites are affected. Spec hardening closes that gap before the builder is dispatched.

---

## How It Works

After plan approval, the orchestrator runs a hardening pass on every task (Step 7b). For each task, it scans for ambiguity signals:

**Signals that trigger rewrite:**

| Signal | Example (before) | Example (after) |
|--------|-----------------|-----------------|
| Vague phrases | "handle errors appropriately" | "return HTTP 400 with `{ error: string }` for validation failures; HTTP 500 for unexpected errors" |
| Missing file paths | "update the types file" | "update `src/types/user.ts`" |
| Filler language | "add JSDoc and similar" | "add JSDoc to `createUser`, `getUser`, `deleteUser`" |
| Vague acceptance criteria | "works correctly" | "returns 200 with `{ id, name, email }` for existing user; returns 404 with `{ error: 'User not found' }` for missing user" |
| Unspecified error handling | "handle errors" | "return HTTP 400 `{ error: 'Invalid email' }` for malformed email; HTTP 409 `{ error: 'Email already exists' }` for duplicate" |

**Actions taken per signal:**
1. Resolve file paths using Glob/Grep on the actual codebase
2. Replace vague phrases with concrete expectations
3. Enumerate implicit items explicitly
4. Replace unmeasurable criteria with testable assertions
5. Add function signatures and return types where missing

**Tasks with no ambiguity signals are unchanged.** The hardening pass emits `spec.hardened` with `tasksModified: 0` to signal a clean pass.

**Audit trail:** The original description is preserved in a `Pre-Hardening` subsection. Hardened sections are annotated `[hardened]`. This makes it easy to compare the original decomposition intent against the rewritten spec in post-mortem review.

---

## Fast Path Coverage

The mini-hardening pass in Step 3b applies the same signal list to single-task fast-path dispatches. Spec hardening is not skipped for simple tasks -- it just runs inline before the builder is dispatched rather than as a separate numbered step.

---

## Why It Matters

Builder agents are capable but not omniscient. A builder reading "handle errors appropriately" in a spec must make a judgment call: which errors? What HTTP codes? What response body shape? Every judgment call the builder makes is a source of validator failure -- because the validator also has to decide what "appropriately" means, and it may decide differently.

Hardened specs reduce this ambiguity surface. They shift judgment calls from the builder to the orchestrator, which has the full user prompt context, the codebase, and the ability to ask clarifying questions before committing to a spec.

The pattern also benefits hard tasks routed to Codex CLI. Codex operates autonomously -- passing it a hardened spec with explicit file paths and acceptance criteria produces better results than passing a vague decomposition.

---

## The Audit Trail

The spec file shows both the original and hardened descriptions:

```markdown
### add-error-handling

- Subject: Add error handling to the user API
- Difficulty: standard
- Status: pending
- Retries: 0

**Pre-Hardening Description:**
Add error handling to the user routes. Handle errors appropriately and
update the types file as needed.

**Description:** [hardened]
Add structured error handling to `src/routes/users.ts`.

For POST /users:
- If email is invalid: return HTTP 400 `{ error: 'Invalid email format' }`
- If email already exists: return HTTP 409 `{ error: 'Email already registered' }`
- On database failure: return HTTP 500 `{ error: 'Internal server error' }`

Update `src/types/api.ts` to export `ErrorResponse = { error: string }`.

**Acceptance Criteria:** [hardened]
- POST /users with invalid email returns 400 with `{ error: 'Invalid email format' }`
- POST /users with duplicate email returns 409 with `{ error: 'Email already registered' }`
- `ErrorResponse` type is exported from `src/types/api.ts`
- All error branches are covered by tests in `tests/users.test.ts`
```

---

## Where to See It

Stage 6 (orchestration/6-codex) introduces spec hardening:
- `orchestration/6-codex:.claude/skills/orchestrator/SKILL.md` -- Steps 7b and 3b
- `orchestration/6-codex:.claude/skills/orchestrator/references/codex-escalation.md` -- full ambiguity signal list

The spec file template in Stage 6 adds the `[hardened]` annotation convention. Compare spec files from Stage 5 (no hardening) to Stage 6 (post-hardening) examples:

```bash
git diff orchestration/5-plugin..orchestration/6-codex -- specs/examples/
```

---

## Related Patterns

- **Difficulty Routing** -- uses the hardened spec as input to the Codex dispatch. Hardened specs give Codex better context for hard tasks.
- **Spec as Source of Truth** -- the spec file is the authoritative contract between orchestrator and agents. Hardening improves that contract's precision.
- **Builder/Validator** -- the validator checks against acceptance criteria in the spec. Measurable criteria (from hardening) produce consistent, reliable verdicts.
