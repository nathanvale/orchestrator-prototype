# Test Prompt: Spec Hardening

## Purpose

This prompt triggers spec hardening. The vague language ("add error handling", "handle appropriately") will cause Step 2 clarifying questions first, then Step 7b to rewrite task descriptions with concrete file paths, specific error codes, and measurable acceptance criteria.

## Prompt

```
/orchestrate "add error handling to the API"
```

## What to Observe

### Step 2 (Clarifying Questions)
- The orchestrator should detect this as vague (no files, no error types, no response shapes)
- Expected questions:
  1. Which routes or files should have error handling added?
  2. What types of errors should be handled (validation, auth, not-found, server)?
  3. What should the error response shape look like?
  4. Should errors be logged, and if so, where?

### After Clarification (Step 3-6)
- Provide answers like: "The users routes in src/routes/users.ts. Handle validation errors (400), not-found (404), and server errors (500). Response shape: `{ error: string }`. Log to console."
- The decomposed tasks will likely still have some vague language ("handle server errors appropriately")

### Step 7b (Spec Hardening)
- `spec.hardened` should emit with `tasksModified > 0`
- Check the spec file for `[hardened]` annotations
- The Pre-Hardening subsection should preserve the original vague description
- The hardened description should include specific status codes and response shapes

### Example Transformation

**Pre-Hardening:**
> Add error handling to the user routes. Handle errors appropriately and return error responses.

**After Hardening [hardened]:**
> Add structured error handling to `src/routes/users.ts`.
>
> For GET /users/:id:
> - If user not found: return HTTP 404 `{ error: 'User not found' }`
> - On database failure: return HTTP 500 `{ error: 'Internal server error' }`
>
> For POST /users:
> - If email is invalid format: return HTTP 400 `{ error: 'Invalid email format' }`
> - If email already exists: return HTTP 409 `{ error: 'Email already registered' }`
> - On database failure: return HTTP 500 `{ error: 'Internal server error' }`

## Alternate Vague Prompts to Try

These all trigger spec hardening:

```
/orchestrate "improve the user service"
```
```
/orchestrate "add validation to the forms"
```
```
/orchestrate "refactor the database layer"
```

Each of these will trigger clarifying questions AND spec hardening on remaining ambiguity.

## Notes

- Step 7b runs even when tasks look specific after clarification -- it catches residual ambiguity
- `tasksModified: 0` is a valid outcome if the orchestrator wrote precise descriptions during decomposition
- Check `specs/<filename>.md` after the run to inspect the audit trail
