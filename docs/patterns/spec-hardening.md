# Spec Hardening

**Introduced in: Stage 6**

---

## What It Is

A pre-dispatch rewrite pass that eliminates ambiguity from task descriptions and acceptance criteria before any builder receives them. The orchestrator scans each task in the approved plan for vague language, missing file paths, and unmeasurable criteria, then rewrites the descriptions into concrete, implementation-ready specs.

Spec hardening is the orchestrator's quality gate on its own output. The decomposition step (Step 4) generates task descriptions that are "good enough" for the orchestrator to reason about. The hardening step (Step 7b) transforms those descriptions into specs that are "good enough for a builder to implement without guessing."

---

## How We Use It Here

After plan approval (Step 7) and before token estimation (Step 8), the orchestrator performs a hardening pass on every task description.

### Ambiguity Signals

These signals trigger a rewrite:

- **Vague phrases:** "handle appropriately", "should work", "as needed"
- **Filler language:** "etc.", "similar", "and so on"
- **Missing file paths:** "the types file" instead of `src/types/user.ts`
- **Implicit dependencies:** "uses the existing service" without naming it
- **Vague acceptance criteria:** "works correctly", "handles edge cases"
- **Unspecified error handling:** "handle errors" without response format

### Rewrite Rules

For each signal found:

1. Resolve file paths by reading the codebase (Glob/Grep to find actual paths)
2. Replace vague language with concrete expectations
3. Enumerate implicit items (replace "etc." with the full list)
4. Add measurable acceptance criteria
5. Specify function signatures where descriptions say "a function to..."
6. Specify error responses where descriptions say "handle errors"

### Audit Trail

Hardening preserves the original description for transparency:

- Original description goes in a "Pre-Hardening" subsection
- Hardened sections are marked with `[hardened]` annotation
- The original is always preserved -- hardening is additive, never destructive

### Before/After Example

**Before:**
```
Description: Migrate the auth module to use the new token service. Handle errors appropriately. Update tests etc.

Acceptance Criteria:
- Auth module works with new token service
- Tests pass
```

**After:**
```
Pre-Hardening:
> Migrate the auth module to use the new token service. Handle errors appropriately. Update tests etc.

Description: [hardened]
Migrate src/auth/auth-module.ts to import and call src/services/token-service.ts instead of inline JWT
logic. Replace generateToken() with tokenService.create() and verifyToken() with tokenService.verify().
On TokenExpiredError, return 401 with { error: "token_expired" }. On TokenInvalidError, return 401 with
{ error: "token_invalid" }. Update tests/auth/auth-module.test.ts and
tests/auth/token-integration.test.ts.

Acceptance Criteria: [hardened]
- src/auth/auth-module.ts imports from src/services/token-service.ts
- No remaining references to inline JWT logic in auth-module.ts
- TokenExpiredError returns 401 with { error: "token_expired" }
- TokenInvalidError returns 401 with { error: "token_invalid" }
- tests/auth/auth-module.test.ts passes
- tests/auth/token-integration.test.ts passes
```

### Fast Path

Spec hardening also applies to fast-path tasks. Even a single task benefits from unambiguous descriptions. In the fast path, a mini-hardening pass runs in Step 3b before builder dispatch.

---

## Why Spec Hardening

**Reduces retry rates:** The most common cause of builder failures in Stages 1-5 is ambiguous specifications. The builder makes an assumption, the validator rejects it, and the retry loop corrects iteratively. Each retry costs tokens and time. Hardening catches these gaps at plan time -- one orchestrator reasoning pass replaces multiple retry cycles.

**Makes acceptance criteria machine-verifiable:** Validators can give more precise verdicts when criteria are concrete. "Returns 401 with { error: 'token_expired' }" is verifiable. "Handles errors appropriately" is not. Hardened criteria reduce both false passes (validator misses a problem because the criterion is vague) and false fails (validator rejects valid work because the criterion is ambiguous).

**Shifts cost from retries to planning:** The cost of spec hardening is one orchestrator reasoning pass per task. The cost of NOT hardening is 1-3 extra builder+validator cycles per ambiguous task. For a 5-task orchestration where 2 tasks have ambiguous specs, hardening saves approximately 9,000-18,000 tokens (2 tasks x 1-2 retries x 4,500 tokens per retry).

---

## Community Sources

**"Shift left" testing:** The principle of catching defects earlier in the process, where they are cheaper to fix. Spec hardening shifts specification defects from execution time (retries) to planning time (one-time hardening pass). The analogy is exact: just as a linter catches bugs before runtime, spec hardening catches ambiguity before dispatch.

**Design by contract (Eiffel):** Bertrand Meyer's design-by-contract philosophy requires explicit preconditions, postconditions, and invariants. Spec hardening is the LLM equivalent -- explicit file paths (preconditions), concrete function signatures (interface contracts), and measurable acceptance criteria (postconditions).

**Formal specification in safety-critical systems:** Safety-critical systems (avionics, medical devices) require specifications that are unambiguous and testable. While LLM orchestration is not safety-critical, the principle applies: ambiguous specs lead to incorrect implementations.

**Acceptance Test-Driven Development (ATDD):** ATDD writes acceptance tests before implementation, forcing the team to agree on concrete success criteria. Spec hardening does the same thing at the orchestration level -- it forces the orchestrator to define machine-verifiable criteria before any builder starts work.

---

## The Hardening Paradox

The orchestrator is also an LLM -- it can introduce new ambiguity while trying to remove it. A hardening pass that replaces "handle errors" with "return appropriate HTTP status codes" has not actually improved clarity.

**Mitigations:**

1. **Focused rewrite, not creative generation:** The hardening pass rewrites existing descriptions, not generates new ones. The orchestrator resolves file paths by reading the codebase, not by inventing them. It specifies error codes by reading existing error handling patterns, not by guessing.

2. **Original preserved:** The Pre-Hardening subsection preserves the original description. If hardening introduces errors, the builder can reference the original intent. The validator can compare both versions.

3. **Hardening clarifies, never expands:** The orchestrator should not add new requirements during hardening -- only clarify existing ones. If a requirement is genuinely missing (not vague, but absent), that is a decomposition problem from Step 4, not a hardening problem.

---

## Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Reduces retry rates | Adds an orchestrator reasoning step (latency + tokens) |
| Makes criteria machine-verifiable | Can introduce new errors (mitigated by audit trail) |
| One-time cost vs. per-retry cost | Requires codebase reads (Glob/Grep) to resolve paths |
| Works for both fast path and full DAG | Hardening paradox (LLM clarifying its own output) |

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 7b (Spec Hardening) and fast-path hardening in Step 3b |
| [`.claude/skills/orchestrator/references/codex-escalation.md`](../../.claude/skills/orchestrator/references/codex-escalation.md) | Full spec hardening checklist with ambiguity signals and rewrite rules |
| [`docs/patterns/difficulty-routing.md`](difficulty-routing.md) | Companion pattern -- routing hard tasks to better engines |
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | The spec file that hardening modifies |
| [`docs/patterns/retry-with-resume.md`](retry-with-resume.md) | The retry loop that hardening aims to reduce |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 6 overview |
