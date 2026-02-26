# Example Spec Output: Stage 1 - Hello World

This is an example of what the orchestrator produces for a single-task dispatch. In Stage 1, there's no formal spec file -- just the task creation and dispatch. This example shows the expected flow.

---

## Task Created

**Subject:** Add greet function in src/hello.ts
**Status:** completed
**activeForm:** Adding greet function

**Description:**
Create a new file `src/hello.ts` that exports a `greet` function.

Requirements:
- File: `src/hello.ts`
- Export: named export `greet` function
- Signature: `greet(name: string): string`
- Returns: a greeting string like "Hello, {name}!"
- JSDoc comment on the function
- No default exports

## Builder Output

Created `src/hello.ts`:
- Added `greet` function with JSDoc
- Named export only
- Takes string, returns string

## Validator Output

```
## Validation Report

**Task:** Add greet function in src/hello.ts

### Checks
- [PASS] File exists: src/hello.ts
- [PASS] Function exported: greet
- [PASS] JSDoc present on greet
- [PASS] Named export (no default)
- [PASS] Signature: greet(name: string): string

### Issues
None

VERDICT: PASS
```

## Orchestrator Report

Task completed successfully. Builder created `src/hello.ts` with a `greet(name: string): string` function. Validator confirmed all acceptance criteria met (VERDICT: PASS).
