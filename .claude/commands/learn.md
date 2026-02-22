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

To start: `git checkout orchestration/1-dispatch`
Then run: `/orchestrate "add a greet function"`

To learn patterns without running the orchestrator: use `/dojo` or `/advisor` here on main.

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
      stages: 7
      branches:
        - orchestration/1-dispatch
        - orchestration/2-dag
        - orchestration/3-full
        - orchestration/4-hop
        - orchestration/5-plugin
        - orchestration/6-codex
        - orchestration/7-hitl
      command: /orchestrate
      status: active
```
