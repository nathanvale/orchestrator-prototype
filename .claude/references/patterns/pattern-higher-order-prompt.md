---
slug: higher-order-prompt
display_name: "Higher-Order Prompt"
one_liner: "A prompt that takes other prompts (agent identities) as parameters, separating fixed orchestration logic from variable agent configuration."
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

higher-order-prompt

## Quick Summary

A Higher-Order Prompt (HOP) is a prompt that takes another prompt as a parameter -- by analogy with higher-order functions that take other functions as arguments. The orchestration logic (the 5-step dispatch protocol, task creation, wave computation, retry, result reporting) is the fixed wrapper. The agent identities (which builder, which validator, which persona) are the variable parameters. Changing the parameters changes what runs; the wrapper never changes.

## When To Use

- When the same orchestration logic should work with different agent teams (engineering, research, etc.)
- When agent identity should be configurable without modifying the dispatch protocol
- When you anticipate future team-switching and want to avoid a refactor
- When the orchestration wrapper should be domain-agnostic by construction

## Core Mechanism

The HOP variables are declared at the top of the skill file as a configuration block:

```
USER_PROMPT:      (provided by the user)
BUILDER_AGENT:    builder
VALIDATOR_AGENT:  validator
SPEC_DIR:         specs/
```

The dispatch protocol throughout the skill file references `$BUILDER_AGENT` and `$VALIDATOR_AGENT` as variables. In Stage 1, these resolve to `builder` and `validator`. In Stage 4, they resolve to `research-builder` and `research-validator` when `--team research` is passed.

The fixed wrapper includes: the 5-step dispatch protocol, task creation, DAG computation, wave execution, spec file management, observability events, result reporting, retry logic.

The variable parameters include: agent identities, model assignments, tool sets, persona voices.

**The proof (Stage 4):** The same orchestrator handles both:
- `/orchestrate "add a utility function"` -- uses `--team engineering` (default)
- `/orchestrate "research top 5 TS testing frameworks" --team research`

The dispatch protocol does not change. Only the values at the top of the HOP Configuration block change.

## Key Rules

1. Agent names are variables, not literals -- reference `$BUILDER_AGENT` and `$VALIDATOR_AGENT` throughout the protocol, not hardcoded names.
2. The fixed wrapper (dispatch logic) must work correctly for any valid agent pair -- it cannot depend on what a specific builder does.
3. Parameterize from day one -- adding variables after hardcoding is a refactor; adding them upfront costs nothing.
4. The HOP Configuration block is the single point of change when switching agent teams.
5. The fixed wrapper includes everything except agent identity and tool configuration.

## Implementation Notes

The HOP Configuration block appears at the top of `.claude/skills/orchestrator/SKILL.md`. The defaults are the engineering team (`builder`, `validator`).

In Stage 1, the variables are hardcoded defaults. The protocol already references them as variables so Stage 4 switching requires only changing the values, not the protocol steps.

Parameterizing from day one forces domain-agnosticism by construction: if `BUILDER_AGENT` is a variable, the dispatch logic cannot accidentally assume what a specific builder does. This constraint is what makes team-switching provably correct.

The Stage 4 `--team` flag changes the HOP Configuration block values before the protocol runs. The protocol itself is unchanged.

## Failure Modes

- **Hardcoding agent names:** If `builder` and `validator` appear as literals in the dispatch steps, Stage 4 team-switching requires finding and replacing every occurrence. Coupling agent identity into the protocol logic.
- **Domain-specific logic in the wrapper:** If the fixed wrapper contains logic that only works for the engineering team (e.g., "check for TypeScript errors"), it cannot be used with a research team. The wrapper must be domain-agnostic.
- **Variable block drift:** The HOP Configuration block is updated but internal protocol steps still reference the old literal names. The switch appears to work but dispatches the wrong agents.

## Signals & Diagnostics

- **Pattern is needed:** The orchestrator works for one agent team but requires code changes to work with another.
- **Pattern is working:** The same SKILL.md runs correctly with different HOP Configuration values without any other changes. Team-switching is a configuration change, not a code change.
- **Pattern is failing:** Switching teams requires editing protocol steps; or the wrapper contains logic that silently breaks for non-default teams.

## Tradeoffs

**Gain:** The orchestration wrapper is reusable across agent teams and domains. Team-switching is a configuration change, not a code change. The architecture is domain-agnostic by construction, which prevents accidental coupling.

**Cost:** Variable indirection adds a small cognitive overhead when reading the protocol -- you must look up what `$BUILDER_AGENT` resolves to. For single-team uses, the variables feel like unnecessary abstraction.

## Related Patterns

- **Builder/Validator** -- the default agents that populate BUILDER_AGENT and VALIDATOR_AGENT
- **Dispatch Loop** -- the fixed orchestration logic that the HOP wraps

## Source Anchors

Stage 1 (concept introduction):
- `orchestration/1-dispatch:.claude/skills/orchestrator/SKILL.md:L1-L30` -- HOP Configuration block with BUILDER_AGENT and VALIDATOR_AGENT variables declared

Stage 4 (proof -- team switching):
- `orchestration/4-hop:.claude/skills/orchestrator/SKILL.md:L1-L60` -- --team flag parsing, team resolution, HOP config populated from profile
- `orchestration/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- Engineering team profile
- `orchestration/4-hop:.claude/skills/orchestrator/teams/research.md` -- Research team profile
