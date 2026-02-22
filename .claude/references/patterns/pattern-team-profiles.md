---
slug: team-profiles
display_name: "Team Profiles"
one_liner: "Bundle agent identities (builder, validator) into named, switchable configurations resolved at orchestration start via the --team flag."
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---

## Pattern ID

team-profiles

## Quick Summary

A team profile is a declarative bundle of agent identities resolved at orchestration start. It maps a team name to a builder agent and a validator agent, decoupling the "who" from the "how" of orchestration. The `--team` flag selects a profile; if absent, the engineering team is used by default. This is dependency injection for prompts -- the orchestrator depends on abstract roles, the profile injects concrete implementations, and the dispatch protocol never changes.

## When To Use

- When the same orchestration protocol should work with different agent types (engineering, research, etc.)
- When you want to add a new agent team without modifying the dispatch logic
- When agent identity should be a configuration choice made at invocation time, not a hard-coded value
- When proving the Higher-Order Prompt pattern -- team profiles are the mechanism that makes HOP observable

## Core Mechanism

Team profiles are markdown files with YAML frontmatter stored in `.claude/skills/orchestrator/teams/`:

```yaml
---
name: research
description: Web research and synthesis team
builder: research-builder
validator: research-validator
---
```

The `builder` and `validator` fields reference agent definition files in `.claude/agents/`.

The Orchestrator resolves a team profile in Step 1 of the dispatch protocol:

1. Parse `--team <name>` from the end of the user prompt
2. If no `--team` flag: default to `engineering`
3. Read `.claude/skills/orchestrator/teams/<name>.md`
4. Parse YAML frontmatter to extract `builder` and `validator`
5. Set `$BUILDER_AGENT` and `$VALIDATOR_AGENT` to the resolved values
6. Emit `team.resolved` event with team name and resolved agent identities

Every subsequent dispatch step references `$BUILDER_AGENT` and `$VALIDATOR_AGENT` -- never hardcoded agent names. The switch from engineering to research is exactly two variable values changing.

## Key Rules

1. Team profile YAML must declare `builder` and `validator` -- both are required.
2. The `builder` and `validator` values must correspond to existing agent definition files in `.claude/agents/`.
3. The orchestrator defaults to `engineering` if no `--team` flag is present -- never error on missing flag.
4. `$BUILDER_AGENT` and `$VALIDATOR_AGENT` must be set from the profile before any dispatch step references them.
5. Emit `team.resolved` after resolution -- not before. The event should carry the actual resolved agent names.
6. The dispatch protocol steps must not contain conditional logic for specific teams -- all teams run the same steps.

## Implementation Notes

Store team profiles in `.claude/skills/orchestrator/teams/` so they are co-located with the orchestrator skill. The directory name makes the purpose clear and keeps profiles out of the agents catalog.

The `--team` flag is parsed at the end of the user prompt (after all other content). This convention prevents false positives where the word "team" appears in the prompt body.

Adding a new team requires only two steps: create agent definitions in `.claude/agents/`, create a profile in `.claude/skills/orchestrator/teams/`. No changes to SKILL.md, no changes to dag-execution.md, no changes to the dispatch protocol.

Research team agents (`research-builder`, `research-validator`) require WebSearch and WebFetch tools that the engineering team does not use. The agent definition files carry these tool constraints -- the team profile just names the agents; it does not re-specify their tools.

## Failure Modes

- **Missing profile file:** If `.claude/skills/orchestrator/teams/<name>.md` does not exist, the orchestrator attempts to dispatch with unresolved variables. Agents may not be found or dispatch may fail silently.
- **Hardcoding team-specific logic in the dispatch protocol:** If any SKILL.md step says "if research team, do X" the HOP proof breaks. The protocol must be team-agnostic.
- **`--team` parsed from prompt body:** If the parsing logic matches `--team` anywhere in the prompt, legitimate uses of "team" in the prompt text can accidentally switch the profile.
- **Missing `team.resolved` event:** Without the event, the observability dashboard cannot confirm which team was used. Debugging a misrouted dispatch becomes harder.

## Signals & Diagnostics

- **Pattern is needed:** Different agent types require changes to SKILL.md dispatch steps; or the orchestrator has conditional logic branching on team names inside the protocol steps.
- **Pattern is working:** `team.resolved` event fires at the start of every orchestration; `/orchestrate "..." --team research` and `/orchestrate "..."` run identical dispatch steps with only agent names differing.
- **Pattern is failing:** Dispatching with `--team research` dispatches engineering agents; profile resolution fails silently and defaults to engineering without logging; team-specific logic appears inside SKILL.md dispatch steps.

## Tradeoffs

**Gain:** New agent teams require no changes to the dispatch protocol -- only new files. The HOP pattern is provably correct: the same 14 steps handle any valid team. Configuration is co-located (team profiles in teams/, agent definitions in agents/).

**Cost:** An extra file read per orchestration (the team profile). Profile files must be kept in sync with agent definitions -- renaming an agent requires updating the profile that references it. The indirection (team name -> profile -> agent name) adds a lookup step that inline agent names would not.

## Related Patterns

- **Higher-Order Prompt** -- team profiles are the mechanism that proves HOP works; they supply the variable parameters that the fixed wrapper consumes
- **Builder/Validator** -- the agent roles that team profiles bundle; what a builder does vs what a validator does
- **Dispatch Loop** -- the fixed protocol that reads team profiles in Step 1 and uses the resolved variables throughout

## Source Anchors

Stage 4 (concept introduction and proof):
- Planned -- orchestration/4-hop (not yet created)
