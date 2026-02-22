# Test Prompt: Vague Specification (Spec Hardening)

**Stage:** 6
**Tests:** Spec hardening, ambiguity detection

## Prompt

```
/orchestrate "Add error handling to the API. Make sure it handles all the edge cases appropriately. Update tests etc."
```

## Why This Prompt

This prompt is deliberately vague across multiple dimensions:
- "the API" -- which endpoints? which files?
- "error handling" -- what errors? what responses? what status codes?
- "all the edge cases" -- which edge cases?
- "appropriately" -- what does appropriate mean?
- "Update tests etc." -- which tests? what other files?

## Expected Behavior

1. **Clarifying Questions:** The orchestrator should ask 2-4 clarifying questions before proceeding (which endpoints, what error responses, what test coverage).
2. **Decomposition:** After clarification, decompose into 3+ tasks.
3. **Spec Hardening:** Task descriptions should be significantly rewritten:
   - "handle errors appropriately" becomes specific error responses with status codes
   - "the API" becomes specific file paths
   - "etc." becomes an enumerated list of files
   - "edge cases" becomes specific scenarios
4. **Audit Trail:** Each hardened task should have a "Pre-Hardening" subsection preserving the original description.
5. **[hardened] Annotations:** Modified descriptions and acceptance criteria should be marked.

## What to Verify

- [ ] Clarifying questions asked before decomposition
- [ ] `spec.hardened` event fires with tasksModified > 0
- [ ] Spec file tasks have "Pre-Hardening" subsections
- [ ] Spec file tasks have `[hardened]` annotations
- [ ] No vague language remains in hardened descriptions ("appropriately", "etc.", "edge cases")
- [ ] Acceptance criteria are measurable (specific status codes, specific file paths)
