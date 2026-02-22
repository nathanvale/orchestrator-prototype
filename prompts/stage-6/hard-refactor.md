# Test Prompt: Hard Multi-File Refactor

**Stage:** 6
**Tests:** Difficulty routing (tasks tagged as `hard`), Codex escalation

## Prompt

```
/orchestrate "Refactor the user module from class-based to functional style. Update UserService class in src/services/user-service.ts to pure functions exported individually. Update all imports in src/routes/user-routes.ts, src/middleware/auth.ts, and src/controllers/user-controller.ts. Update the test file at tests/services/user-service.test.ts to test individual functions instead of class methods. Ensure all existing functionality is preserved -- same inputs, same outputs, different code structure."
```

## Expected Behavior

1. **Decomposition:** 4-5 tasks (refactor service, update routes, update middleware, update controller, update tests)
2. **Difficulty Assessment:** The refactor task should be tagged `hard` (touches 5+ files, uses "refactor", cross-module dependencies). Other tasks may be `standard`.
3. **Codex Routing (if installed):** The `hard` task routes to Codex CLI. Standard tasks route to the standard builder.
4. **Codex Routing (if not installed):** All tasks route to the standard builder. A `codex.fallback` event fires for the hard task with reason "codex CLI not installed".
5. **Spec Hardening:** Task descriptions should be hardened with concrete file paths, function signatures, and measurable acceptance criteria.

## What to Verify

- [ ] At least one task tagged `difficulty: hard` in the spec file
- [ ] `difficulty.assessed` event fires with task difficulty classifications
- [ ] `codex.checked` event fires
- [ ] If Codex available: `codex.dispatched` event fires for the hard task
- [ ] If Codex unavailable: `codex.fallback` event fires
- [ ] Spec file shows `[hardened]` annotations on task descriptions
- [ ] `--no-codex` flag overrides routing (all tasks use standard builder)
