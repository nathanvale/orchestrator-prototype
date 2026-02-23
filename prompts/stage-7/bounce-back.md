# Stage 7 Test Prompt: Bounce-Back Trigger

**Purpose:** Test that the HITL bounce-back protocol fires when the builder encounters a conflicting pattern.

---

## Setup

This prompt requires an existing codebase with functional patterns. Before running, ensure `src/users/` exists with at least one file using functional patterns (exported functions, plain objects -- no classes).

If needed, create a placeholder:
```typescript
// src/users/index.ts
export type User = { id: string; name: string; email: string }
export const getUser = (id: string): User | null => null
```

---

## Prompt

```
/orchestrate "add a user module to src/users/ using class-based OOP patterns with a UserService class that has getUser, createUser, and deleteUser methods"
```

---

## Expected Behavior

1. **Step 1-7**: Normal orchestration flow -- decompose, write spec, harden, present plan
2. **Step 10**: Builder dispatched for the user module task
3. **Bounce-back fires**: Builder detects existing functional code in `src/users/` and reports it conflicts with the class-based requirement
4. **HITL presentation**:
   ```
   [HITL] Task `add-user-service` requires your input.

   Trigger: conflicting-requirements (blocking)

   What the builder said:
   > The existing code in src/users/ uses a functional pattern. A class-based
   > UserService would be inconsistent with the codebase. This conflicts with
   > the existing functional pattern.

   How do you want to proceed?
   1. Proceed with guidance (describe what the builder should do)
   2. Skip this task
   3. Restructure tasks (describe changes to the task graph)
   4. Abort orchestration
   ```
5. **Hydration checkpoint written** -- the spec file should now have a `## Hydration Checkpoint` section with `status: in-progress` and the task in `bounce_history`

---

## Resolution Options to Test

**Option 1 - Proceed with guidance:**
> "Use functional patterns. Export functions instead of a class. UserService should be exported functions: getUser, createUser, deleteUser."

Expected: Builder re-dispatched with guidance prepended to description. Does NOT count as a retry.

**Option 2 - Skip this task:**
Expected: Task marked `skipped`. Any dependent tasks also marked `skipped` (cascade). Orchestration continues with remaining tasks.

**Option 3 - Restructure tasks:**
Expected: Task graph presented. User describes changes. Updated plan shown for review.

**Option 4 - Abort:**
Expected: All pending tasks marked `aborted`. Final hydration checkpoint written with status `aborted`. Orchestration stops.

---

## Verification

After resolution (any option):
- Check the spec file: `cat specs/*.md` -- look for `## Hydration Checkpoint` section
- The checkpoint should reflect the current state (bounce resolved or aborted)
- The `bounce_history` field should have an entry for the bounced task

---

## What This Proves

- Bounce-back detection fires on `conflicting-requirements` trigger
- Hydration checkpoint is written at bounce detection time
- Bounded resolution options are presented correctly
- Resolution is applied correctly for each option
- Checkpoint is updated after resolution
