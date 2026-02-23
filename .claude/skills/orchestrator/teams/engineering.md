---
team: engineering
description: Default team for code implementation tasks
builder: builder
validator: validator
---

# Engineering Team

The default team. Optimized for code tasks: implementing features, fixing bugs, adding tests, writing documentation for TypeScript/Bun projects.

## When to Use

Use the engineering team (or omit `--team` entirely) when the task involves:
- Writing or modifying source code
- Adding or updating tests
- Fixing bugs in existing implementations
- Refactoring code
- Adding JSDoc or inline documentation
- Updating configuration files

## Agent Assignments

| Role | Agent | Model | Tools |
|------|-------|-------|-------|
| Builder | `builder` | sonnet | Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate |
| Validator | `validator` | haiku | Read, Glob, Grep, Bash, TaskGet, TaskUpdate (no Write/Edit) |

## Invocation

```bash
/orchestrate "add a REST API with GET /users and POST /users"
/orchestrate "add unit tests for the greet function" --team engineering
```

Both are equivalent -- `engineering` is the default team.

## Notes

- The builder agent reads before writing and never touches files outside the task scope
- The validator is strictly read-only and gives a binary PASS/FAIL verdict
- Retry uses `resume: agentId` to preserve builder context across attempts
