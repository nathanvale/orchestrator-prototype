# Test Prompt: CLI Tool

**Stage:** 2 (Multi-Task DAG)
**Complexity:** Medium -- multi-file, different dependency pattern than REST API

---

## Prompt

```
create a CLI tool in src/cli/ with argument parsing, a greet command, a version command, and a help output. Include tests.
```

---

## Expected Behavior

1. **Orchestrator** decomposes the prompt into 3-4 tasks. The argument parser is a prerequisite for every command -- it must exist before `greet`, `version`, or `help` can be implemented. Commands can potentially be implemented in parallel once the parser exists (same wave). Tests depend on all commands being complete.

2. **Spec file** is written to `specs/cli-tool.md` before any agent is dispatched. The task graph reflects a different shape than the REST API: a deeper linear chain or fan-out from a single root, rather than a wide fan-out from types followed by a convergence at tests.

3. **Wave 1** executes: the argument parser task runs (no dependencies). This is the foundation everything else depends on.

4. **Wave 2** executes: command tasks run sequentially -- `greet`, `version`, and `help` output (each depends on the arg parser from Wave 1 and can be grouped in the same wave since they are independent of each other).

5. **Wave 3** executes: the test task runs last (depends on all command tasks being complete). Builder writes tests, Validator checks them.

6. **Final report** summarizes all waves, all verdicts, and the files created in `src/cli/`.

---

## Expected DAG Shape

This prompt produces a different graph shape than the REST API prompt. The contrast is the point.

**REST API shape (wide fan-out then convergence):**

```
define-user-types
    |-- implement-get-users --|
    |-- implement-post-users  |-- write-user-route-tests
    |-- implement-get-user-by-id --|
```

**CLI tool shape (single root, fan-out at Wave 2, convergence at Wave 3):**

```
implement-arg-parser
    |-- implement-greet-command --|
    |-- implement-version-command |-- write-cli-tests
    |-- implement-help-output ----|
```

Both are valid DAGs. Both produce 3 waves. The internal structure differs -- the CLI tool has a single root while the REST API's Wave 2 fan-out is wider. The orchestrator must derive the correct shape from the prompt, not from a fixed template.

---

## What to Look For

**Decomposition:**

- The arg parser task has zero dependencies -- it is the only Wave 1 task (single root, unlike the REST API which also has a single Wave 1 root but for different structural reasons)
- Command tasks (`greet`, `version`, `help`) are all in Wave 2 -- they depend on the parser but not on each other
- The test task is in Wave 3 -- it depends on all command tasks
- Task IDs are descriptive: `implement-arg-parser`, `implement-greet-command`, `implement-version-command`, `implement-help-output`, `write-cli-tests` (or similar kebab-case equivalents)

**Spec file:**

- Written to `specs/cli-tool.md` (or `specs/cli-tool-src-cli.md` if the orchestrator adds disambiguation)
- Task descriptions specify the `src/cli/` directory -- the builder should not scatter files across `src/`
- Acceptance criteria for the arg parser include: recognizes the command name as the first positional argument, returns parsed args object, does not throw on unknown flags (or defines the correct behavior)
- Acceptance criteria for the test task include: tests cover at least the `greet` and `version` commands; tests import from `src/cli/`

**DAG shape validation:**

- Wave 1 contains exactly 1 task (the arg parser) -- confirm `wave.started { waveNumber: 1, taskIds: ["implement-arg-parser"] }` (or equivalent single-task wave)
- Wave 2 contains 3 tasks (`greet`, `version`, `help`) -- confirm `wave.started { waveNumber: 2, taskIds: [...] }` lists all three
- Wave 3 contains 1 task (tests) -- confirm `wave.started { waveNumber: 3, taskIds: ["write-cli-tests"] }` (or equivalent)
- The shape is different from the REST API run -- this confirms decomposition is prompt-driven, not hardcoded

**Observability events:**

Same pattern as `rest-api.md` -- 3 `spec.reread` events, `wave.started`/`wave.completed` per wave, `agent.dispatched`/`agent.completed`/`verdict.received` per task. Check that `decomposition.completed` reports `waveCount: 3`.

**What NOT to see:**

- Any command task starting before the arg parser task is `completed`
- The orchestrator reusing the REST API decomposition shape (4 tasks where types fan out to multiple handlers) -- the CLI tool should have its own structure
- Files created outside `src/cli/` without a clear reason
- The orchestrator implementing any CLI logic directly instead of dispatching the builder

---

## Why This Prompt

This prompt validates that decomposition is prompt-driven, not hardcoded. The REST API prompt produces a fan-out at Wave 2 from a single types task. The CLI tool prompt produces a similar fan-out, but from an arg parser rather than a types file, and the "foundation" concept is structurally different -- it is a runtime dependency rather than a type import.

If both the REST API and CLI tool runs produce identical task graphs (same task IDs, same structure), the orchestrator is using a fixed template rather than analyzing the prompt. If the task graphs differ in the right ways -- single root vs. same wave structure, `src/types/` vs. `src/cli/` file paths, different acceptance criteria -- the decomposition is working correctly.

This is the second of two Stage 2 test prompts. Run `rest-api.md` first to establish a baseline, then run `cli-tool.md` to confirm the orchestrator adapts.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 2 roadmap and what DAG execution proves |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | The 8-step dispatch protocol; Step 2 (decomposition) is what this prompt stress-tests |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Wave algorithm, task ID conventions, dependency rules |
| [`prompts/stage-2/rest-api.md`](rest-api.md) | First Stage 2 test prompt -- run this first to establish a baseline DAG shape |
