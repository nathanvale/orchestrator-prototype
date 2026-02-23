---
description: Browse available learning modules and stages
---

## Available Modules

### Orchestration

Learn agent orchestration patterns incrementally. Each branch is a standalone lesson -- checkout any stage to see the orchestrator at that complexity level.

| Stage | Branch | What You'll Learn | See Changes |
|-------|--------|-------------------|-------------|
| 1 | `orchestration/1-dispatch` | Single-task dispatch loop | [Diff](../../compare/main...orchestration/1-dispatch) |
| 2 | `orchestration/2-dag` | Task decomposition, wave execution | [Diff](../../compare/orchestration/1-dispatch...orchestration/2-dag) |
| 3 | `orchestration/3-full` | Retry, clarifying questions, fast path | [Diff](../../compare/orchestration/2-dag...orchestration/3-full) |
| 4 | `orchestration/4-hop` | Team switching, HOP pattern | [Diff](../../compare/orchestration/3-full...orchestration/4-hop) |
| 5 | `orchestration/5-plugin` | Plugin extraction | [Diff](../../compare/orchestration/4-hop...orchestration/5-plugin) |
| 6 | `orchestration/6-codex` | Codex routing, spec hardening | [Diff](../../compare/orchestration/5-plugin...orchestration/6-codex) |
| 7 | `orchestration/7-hitl` | HITL bounce-back, persistence | [Diff](../../compare/orchestration/6-codex...orchestration/7-hitl) |
| 8 | `orchestration/8-parallel` | Parallel dispatch, worktree isolation | [Diff](../../compare/orchestration/7-hitl...orchestration/8-parallel) |
| 9 | `orchestration/9-browser` | Browser validation, Ralph Wiggum loop | [Diff](../../compare/orchestration/8-parallel...orchestration/9-browser) |

To start: `git checkout orchestration/1-dispatch`
Then run: `/orchestrate "add a greet function"`

To learn patterns without running the orchestrator: use `/dojo` or `/advisor` here on main.

### CLI Alternative (git diff)

```bash
git diff main...orchestration/1-dispatch          # Stage 1 changes
git diff orchestration/1-dispatch...orchestration/2-dag    # Stage 2 changes
git diff orchestration/2-dag...orchestration/3-full        # Stage 3 changes
git diff orchestration/3-full...orchestration/4-hop        # Stage 4 changes
git diff orchestration/4-hop...orchestration/5-plugin      # Stage 5 changes
git diff orchestration/5-plugin...orchestration/6-codex    # Stage 6 changes
git diff orchestration/6-codex...orchestration/7-hitl      # Stage 7 changes
git diff orchestration/7-hitl...orchestration/8-parallel   # Stage 8 changes
git diff orchestration/8-parallel...orchestration/9-browser # Stage 9 changes
```

---

## Learning Tools (on main)

- `/dojo` -- Miyagi-style pattern teacher. Ask it to explain any orchestration pattern.
- `/advisor` -- Recommends which patterns to apply given your problem.
- `/learn` -- This command. Browse all modules and stages.

---

## Structured Envelope

```yaml
learn-envelope:
  modules:
    - id: orchestration
      stages: 9
      branches:
        - orchestration/1-dispatch
        - orchestration/2-dag
        - orchestration/3-full
        - orchestration/4-hop
        - orchestration/5-plugin
        - orchestration/6-codex
        - orchestration/7-hitl
        - orchestration/8-parallel
        - orchestration/9-browser
      command: /orchestrate
      status: active
```
