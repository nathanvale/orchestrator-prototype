# Team Profiles Pattern

**Introduced in: Stage 4**

---

## What It Is

Team Profiles is the pattern of bundling agent identities into named, swappable configurations -- making the orchestrator domain-agnostic by construction.

In the HOP pattern, `BUILDER_AGENT` and `VALIDATOR_AGENT` are the variable parameters. Without team profiles, swapping agents requires editing the HOP Configuration block directly. With team profiles, the user passes a `--team` flag and the orchestrator reads a profile file to resolve agent identities automatically.

A team profile is a small markdown file with YAML frontmatter declaring which builder and validator to use:

```yaml
---
team: research
description: Research and synthesis team for web-sourced analysis tasks
builder: research-builder
validator: research-validator
---
```

The orchestrator reads `.claude/skills/orchestrator/teams/<name>.md` before doing anything else -- before decomposition, before spec writing, before dispatch. Agent resolution is Step 1.

---

## How We Use It Here

### Profile Files

Team profiles live in `.claude/skills/orchestrator/teams/`:

| Profile | File | Builder | Validator | Use For |
|---------|------|---------|-----------|---------|
| `engineering` | `teams/engineering.md` | `builder` | `validator` | Code implementation (default) |
| `research` | `teams/research.md` | `research-builder` | `research-validator` | Web research and synthesis |

### Invocation

```bash
# Default team (engineering is implicit)
/orchestrate "add a REST API with GET /users and POST /users"

# Explicit engineering team
/orchestrate "add unit tests for the greet function" --team engineering

# Research team
/orchestrate "research top 5 TypeScript testing frameworks and compare them" --team research
```

### Resolution Algorithm

The orchestrator's Step 1 is always team resolution:

1. Parse `--team <name>` from the user prompt (default: `engineering`)
2. Read `.claude/skills/orchestrator/teams/<name>.md`
3. Extract `builder:` and `validator:` from frontmatter
4. Set `BUILDER_AGENT` and `VALIDATOR_AGENT` for all subsequent steps

If no `--team` flag is present, `engineering` is the default. If the named profile file does not exist, the orchestrator reports an error before doing any work.

---

## Why This Pattern Matters

### The HOP Proof

Team profiles are the mechanism that proves the Higher-Order Prompt pattern works. The orchestrator SKILL.md does not hardcode any agent names. Every reference to an agent uses the `$BUILDER_AGENT` and `$VALIDATOR_AGENT` variables set during resolution.

Run the same prompt with different teams:

```bash
/orchestrate "analyze our codebase" --team engineering
/orchestrate "analyze our codebase" --team research
```

The DAG decomposition, wave execution, retry logic, spec file format, and result reporting are identical. Only which agent receives the dispatch changes. This is the proof: the orchestration wrapper is domain-agnostic.

### Extensibility Without SKILL.md Changes

Adding a new team requires:
1. Creating the agent definition files (builder and validator)
2. Creating a team profile file in `teams/`
3. Nothing else -- no changes to SKILL.md

An `enterprise` team with scotty-builder and mccoy-validator, for example, is a drop-in addition. The orchestrator discovers team profiles by reading the `teams/` directory; there is no registry to update.

### Clean Separation of Concerns

Team profiles separate three distinct concerns:

- **What the orchestrator does** (SKILL.md) -- decompose, dispatch, validate, retry, report
- **Who does the work** (team profiles) -- which builder, which validator, for which domain
- **How agents behave** (agent definitions) -- tools, constraints, persona, output format

Each concern is independently configurable. You can change agents without touching the orchestrator. You can change the orchestrator without touching agents. You can create new teams without touching either.

---

## Source Anchors

Stage 4 (introduction):
- `orchestration/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- engineering team profile
- `orchestration/4-hop:.claude/skills/orchestrator/teams/research.md` -- research team profile
- `orchestration/4-hop:.claude/agents/research-builder.md` -- research builder agent
- `orchestration/4-hop:.claude/agents/research-validator.md` -- research validator agent
- `orchestration/4-hop:.claude/skills/orchestrator/SKILL.md:L1-L40` -- HOP Configuration block with team resolution

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/higher-order-prompt.md`](higher-order-prompt.md) | The HOP pattern that team profiles parameterize |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The engineering team's default builder and validator agents |
| [`docs/patterns/plugin-architecture.md`](plugin-architecture.md) | Stage 5: team profiles are included in the plugin extraction |
| [`docs/agents.md`](../agents.md) | Full agent catalog -- all builders and validators across all teams |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 4 section -- HOP parameterization and team switching design |
