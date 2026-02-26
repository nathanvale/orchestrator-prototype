# Team Profiles Pattern

**Introduced in: Stage 4**

---

## What It Is

A team profile is a declarative bundle of agent identities resolved at orchestration start. It maps a team name to a builder agent and a validator agent, decoupling the "who" from the "how" of orchestration.

Think of it like dependency injection for prompts. The orchestrator depends on abstract roles (builder, validator). The team profile injects concrete implementations (which specific agent fulfills each role). The orchestration logic never changes -- only the injected identities do.

---

## How We Use It Here

### Profile Format

Team profiles are markdown files with YAML frontmatter, stored in `.claude/skills/orchestrator/teams/`:

```yaml
---
name: research
description: Web research and synthesis team
builder: research-builder
validator: research-validator
---
```

The `builder` and `validator` fields reference agent definition files in `.claude/agents/` (without the `.md` extension).

### Resolution Algorithm

The orchestrator resolves a team profile in Step 1 of the dispatch protocol:

1. Parse `--team <name>` from the end of the user prompt
2. If no `--team` flag: default to `engineering`
3. Read `.claude/skills/orchestrator/teams/<name>.md`
4. Parse YAML frontmatter to extract `builder` and `validator`
5. Set `$BUILDER_AGENT` and `$VALIDATOR_AGENT` to the resolved values
6. Emit `team.resolved` event with team name and resolved agent identities

### Available Teams

| Team | Builder | Validator | Use Case |
|------|---------|-----------|----------|
| `engineering` (default) | `builder` | `validator` | Code implementation and modification |
| `research` | `research-builder` | `research-validator` | Web research, synthesis, and information gathering |

### Usage

```
/orchestrate "add a utility function"                            # engineering (default)
/orchestrate "research top 5 TS testing frameworks" --team research
```

---

## Why Team Profiles

### Separation of Concerns

Without team profiles, the orchestrator would need conditional logic: "if research, use these agents; if engineering, use those agents." Every new team would add another branch. Team profiles eliminate this -- the orchestrator always reads a profile file and sets two variables. The conditional logic is replaced by file lookup.

### Extensibility

Adding a new team requires:
1. Create agent definitions in `.claude/agents/`
2. Create a team profile in `.claude/skills/orchestrator/teams/`

No changes to SKILL.md, no changes to the dispatch protocol, no changes to dag-execution.md. The orchestrator discovers new teams by file existence -- the same way a plugin system discovers plugins.

### The HOP Proof

Team profiles are the mechanism that proves the HOP pattern works. The diff between an engineering orchestration and a research orchestration is exactly two agent names in the event stream. Everything else -- the 12-step dispatch protocol, wave computation, retry logic, spec file format -- is identical. The fixed wrapper is truly decoupled from the variable parameters.

---

## Where It Comes From

**IndyDevDan** demonstrated team switching in Claude Code by parameterizing agent names in a coordinator prompt. The insight: if the coordinator references agents by variable name, switching teams is a configuration change, not a code change.

**Agent team patterns in the community** converge on the same idea: define teams as named bundles of agent configurations, resolve at orchestration start, then run the same dispatch logic regardless of which team is active. This appears independently in LangChain agent graphs (swappable node implementations), CrewAI team configurations, and Autogen team definitions.

**Dependency injection analogy** comes from software engineering: the orchestrator depends on abstract interfaces (builder, validator), and the team profile provides concrete implementations. This is Constructor Injection applied to prompts -- the team profile is the constructor argument that satisfies the dependency.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/higher-order-prompt.md`](higher-order-prompt.md) | The HOP pattern that team profiles enable -- team profiles are the mechanism, HOP is the concept |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The agent roles that team profiles bundle -- what a builder does vs what a validator does |
| [`docs/agents.md`](../agents.md) | Full agent catalog with tool lists and constraints for each team's agents |
| [`.claude/skills/orchestrator/teams/`](../../.claude/skills/orchestrator/teams/) | The actual team profile files |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | The dispatch protocol that reads team profiles in Step 1 |
