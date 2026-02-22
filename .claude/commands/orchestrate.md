---
description: Orchestrate a complex task using Builder/Validator dispatch with difficulty routing
argument-hint: Describe the feature or changes you want implemented (add --team <name> for non-default team, --no-codex to disable Codex routing, --resume <spec-path> to continue an interrupted orchestration)
model: opus
skill: orchestrator
---

Orchestrate the following task:

$ARGUMENTS

## Usage Examples

```
/orchestrate "add a REST API with GET /users and POST /users"
```

Uses the default engineering team (builder + validator).

```
/orchestrate "research top 5 TS testing frameworks" --team research
```

Uses the research team (research-builder + research-validator) with web search capabilities.

```
/orchestrate "refactor the auth module across 8 files" --no-codex
```

Disables Codex routing -- all tasks use the standard builder regardless of difficulty.

```
/orchestrate --resume specs/rest-api.md
```

Resumes an interrupted orchestration. Skips decomposition, plan review, and task creation -- picks up from the last checkpoint recorded in the spec file.

## Available Teams

- **engineering** (default) -- code implementation and modification
- **research** -- web research, synthesis, and information gathering

## Available Flags

- `--team <name>` -- select a team profile (default: `engineering`)
- `--no-codex` -- disable Codex routing; all tasks use the standard builder
- `--resume <spec-path>` -- resume an interrupted orchestration from a saved spec file

## Codex Routing (Stage 6)

Tasks assessed as `hard` during decomposition are automatically routed to Codex CLI if available. Use `--no-codex` to disable this and force all tasks through the standard builder.

## Resume

Use `--resume <spec-path>` when a previous orchestration was interrupted (crash, timeout, manual abort, context compaction mid-run).

The orchestrator reads the spec file's **Hydration Checkpoint** section to reconstruct prior state:

- **Completed tasks** -- skipped entirely, not re-dispatched
- **In-progress tasks** -- treated as incomplete and re-dispatched from the start of that task
- **Bounced tasks** -- re-presented to you for a decision (skip, provide guidance, or abort)

Decomposition, plan review, and spec creation are all skipped -- the existing spec file is the source of truth.
