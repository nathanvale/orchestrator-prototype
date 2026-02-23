# HOP Orchestrator - Learn Agent Orchestration Patterns

Each branch is a standalone lesson. Checkout any stage to see the
orchestrator at that complexity level.

## Orchestration Module

| Stage | Branch | What You'll Learn | See Changes |
|-------|--------|-------------------|-------------|
| 1 | [`orchestration/1-dispatch`](../../tree/orchestration/1-dispatch) | Single-task dispatch loop | [Diff](../../compare/main...orchestration/1-dispatch) |
| 2 | [`orchestration/2-dag`](../../tree/orchestration/2-dag) | Task decomposition, wave execution | [Diff](../../compare/orchestration/1-dispatch...orchestration/2-dag) |
| 3 | [`orchestration/3-full`](../../tree/orchestration/3-full) | Retry, clarifying questions, fast path | [Diff](../../compare/orchestration/2-dag...orchestration/3-full) |
| 4 | [`orchestration/4-hop`](../../tree/orchestration/4-hop) | Team switching, HOP pattern | [Diff](../../compare/orchestration/3-full...orchestration/4-hop) |
| 5 | [`orchestration/5-plugin`](../../tree/orchestration/5-plugin) | Plugin extraction | [Diff](../../compare/orchestration/4-hop...orchestration/5-plugin) |
| 6 | [`orchestration/6-codex`](../../tree/orchestration/6-codex) | Codex routing, spec hardening | [Diff](../../compare/orchestration/5-plugin...orchestration/6-codex) |
| 7 | [`orchestration/7-hitl`](../../tree/orchestration/7-hitl) | HITL bounce-back, persistence | [Diff](../../compare/orchestration/6-codex...orchestration/7-hitl) |

## Quick Start

```
git clone https://github.com/nathanvale/orchestrator-prototype
git checkout orchestration/1-dispatch    # Start here
# Run: /orchestrate "add a greet function"
```

## Learn Without Running

Use `/dojo` on main to learn patterns, then checkout a stage to see proof:

```
/dojo explain wave-computation
/advisor "I need to add retry logic to my orchestrator"
```

Use `/learn` to browse all modules and stages.
See `specs/master-plan.md` for the full curriculum.
