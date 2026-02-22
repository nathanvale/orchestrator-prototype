# Plugin Architecture Pattern

**Introduced in: Stage 5**

---

## What It Is

Plugin Architecture is the pattern of extracting a working prototype into a marketplace-installable unit -- separating the proof-of-concept lifecycle from the living, maintained code lifecycle.

In this codebase, the prototype repo (`orchestrator-prototype`) is where each stage is built and validated. Once a stage is complete and frozen, the living implementation moves to a plugin in the marketplace (`side-quest-plugins`). The prototype repo becomes a read-only learning artifact. The plugin becomes the code people actually use.

The key insight: **the prototype and the plugin serve different audiences**. The prototype is for learners who want to understand how the orchestrator was built step by step. The plugin is for practitioners who want to use the orchestrator today without caring about its history.

---

## How We Use It Here

Stage 5 is the extraction point. The SKILL.md at Stage 4 is the validated implementation. Stage 5 takes that SKILL.md, agents, and team profiles and packages them as the `agentic-orchestration` plugin in the `side-quest-plugins` marketplace.

### What Moves to the Plugin

| Prototype Path | Plugin Path |
|----------------|-------------|
| `.claude/skills/orchestrator/SKILL.md` | `plugins/agentic-orchestration/skills/orchestrator/SKILL.md` |
| `.claude/skills/orchestrator/references/` | `plugins/agentic-orchestration/skills/orchestrator/references/` |
| `.claude/skills/orchestrator/teams/` | `plugins/agentic-orchestration/skills/orchestrator/teams/` |
| `.claude/agents/builder.md` | `plugins/agentic-orchestration/agents/builder.md` |
| `.claude/agents/validator.md` | `plugins/agentic-orchestration/agents/validator.md` |
| `.claude/agents/research-builder.md` | `plugins/agentic-orchestration/agents/research-builder.md` |
| `.claude/agents/research-validator.md` | `plugins/agentic-orchestration/agents/research-validator.md` |
| `.claude/commands/orchestrate.md` | `plugins/agentic-orchestration/commands/orchestrate.md` |

### What Does NOT Move

The prototype-specific scaffolding stays in the repo -- it is part of the educational story, not the plugin:

- `docs/patterns/` -- human-readable pattern explanations (learner audience, not practitioner)
- `prompts/` -- curated test prompts for each stage (educational material)
- `specs/` -- stage spec files and master plan (planning artifacts)
- `src/`, `tests/` -- verification targets for the builder agent to operate on

### The plugin.json Manifest

The plugin needs a manifest that declares its identity and what it installs:

```json
{
  "name": "agentic-orchestration",
  "version": "1.0.0",
  "description": "HOP Orchestrator -- agent orchestration with team switching, DAG execution, retry, and spec-driven dispatch",
  "author": "side-quest",
  "installs": {
    "skills": ["orchestrator"],
    "agents": ["builder", "validator", "research-builder", "research-validator"],
    "commands": ["orchestrate"]
  }
}
```

### Install Command

```bash
/plugin install agentic-orchestration@side-quest
```

After installation, `/orchestrate` is available in any project -- no need to clone the prototype repo.

---

## Why This Pattern Matters

### Separation of Concerns: Learning vs Using

The prototype's job is to teach. It has 7+ stages of incremental complexity, each on its own branch with a SKILL.md sized for that stage only. A learner checks out `orchestration/1-dispatch` and sees a 152-line SKILL.md. They check out `orchestration/4-hop` and see 769 lines -- exactly the additions for team switching.

A practitioner does not want to study the history. They want to run `/orchestrate` today. The plugin delivers the latest validated implementation with no educational scaffolding in the way.

### Prototype Freezing = Educational Stability

Once the implementation moves to the plugin, the prototype branches are frozen. A learner reading `orchestration/3-full` six months from now sees exactly what Stage 3 was when it was completed -- no patches, no drift. The plugin gets the patches; the prototype stages get none.

This is the same reason `git diff orchestration/3-full..orchestration/4-hop` is stable and useful as a learning tool: the branches are immutable snapshots. Patching frozen branches would break the diff-as-lesson model.

### Plugin Versioning = Graduated Complexity

The plugin marketplace supports versioning. A user who wants the Stage 4 HOP-parameterized version installs `agentic-orchestration@1.0.0`. A user who wants Stage 6 (with Codex escalation) installs `agentic-orchestration@1.2.0`. The version numbers map loosely to stages -- the plugin evolves, the prototype stages are permanently frozen.

---

## What Changes vs What Stays the Same

### What Changes at Extraction

- **Path structure** -- prototype uses `.claude/` directly; plugin adds a `plugins/<name>/` wrapper
- **Installation method** -- prototype is a git clone; plugin uses `/plugin install`
- **Maintenance location** -- prototype stages are frozen; plugin receives ongoing updates
- **Audience** -- prototype is for learners; plugin is for practitioners

### What Stays the Same

- **SKILL.md content** -- no changes to the orchestrator logic at extraction time
- **Agent definitions** -- builder, validator, research-builder, research-validator are identical
- **Team profiles** -- engineering.md and research.md are copied verbatim
- **Command interface** -- `/orchestrate` invocation syntax is unchanged
- **The HOP pattern** -- team switching, `--team` flag, 12-step dispatch protocol -- all identical

The extraction is purely structural. Stage 5 adds zero new orchestrator capabilities. The SKILL.md line count is identical to Stage 4 (~769 lines). This is intentional: the extraction is a milestone, not a feature.

---

## Source Anchors

Stage 4 (proof code the plugin is extracted from):
- `orchestration/4-hop:.claude/skills/orchestrator/SKILL.md` -- the full HOP implementation
- `orchestration/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- engineering team profile
- `orchestration/4-hop:.claude/skills/orchestrator/teams/research.md` -- research team profile
- `orchestration/4-hop:.claude/agents/builder.md` -- builder agent definition
- `orchestration/4-hop:.claude/agents/research-builder.md` -- research builder agent definition

Stage 5 (extraction documentation):
- `orchestration/5-plugin:docs/patterns/plugin-architecture.md` -- this file
- `orchestration/5-plugin:.claude/CLAUDE.md` -- stage 5 project description

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/higher-order-prompt.md`](higher-order-prompt.md) | The HOP pattern that the plugin delivers |
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The core agents packaged in the plugin |
| [`docs/patterns/team-profiles.md`](team-profiles.md) | Team switching -- the key Stage 4 feature the plugin ships |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 5 section -- extraction plan and plugin manifest |
