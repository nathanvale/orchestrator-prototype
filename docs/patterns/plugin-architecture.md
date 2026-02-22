# Plugin Architecture

**Introduced in: Stage 5**

## What It Is

The plugin architecture pattern describes how to extract a working prototype from a project's `.claude/` directory structure into a distributable Claude Code plugin that can be installed via the plugin marketplace. The extraction maps the prototype's local paths to plugin-relative paths while preserving the functional behavior of all skills, agents, and commands.

## How We Use It Here

Stage 5 extracts the orchestrator prototype (Stages 1-4) into the `side-quest-plugins` marketplace as the `agentic-orchestration` plugin. The prototype repo remains as-is for educational purposes -- readers can still checkout any stage branch. The living, evolving orchestrator now lives in the plugin.

### Structural Mapping

| Prototype Path | Plugin Path | Notes |
|---------------|-------------|-------|
| `.claude/agents/builder.md` | `agents/builder.md` | Copied as-is |
| `.claude/agents/validator.md` | `agents/validator.md` | Copied as-is |
| `.claude/agents/research-builder.md` | `agents/research-builder.md` | Copied as-is |
| `.claude/agents/research-validator.md` | `agents/research-validator.md` | Copied as-is |
| `.claude/commands/orchestrate.md` | `commands/orchestrate.md` | Copied as-is |
| `.claude/skills/orchestrator/SKILL.md` | `skills/orchestrator/SKILL.md` | Copied as-is (relative paths work) |
| `.claude/skills/orchestrator/references/dag-execution.md` | `skills/orchestrator/references/dag-execution.md` | Related Documents section updated |
| `.claude/skills/orchestrator/teams/engineering.md` | `skills/orchestrator/teams/engineering.md` | Copied as-is |
| `.claude/skills/orchestrator/teams/research.md` | `skills/orchestrator/teams/research.md` | Copied as-is |
| `scripts/emit-event.ts` | `scripts/emit-event.ts` | `app` field changed |

### What Changes

- **`app` identifier** in emit-event.ts: `'orchestrator-prototype'` becomes `'agentic-orchestration'`
- **Related Documents** in dag-execution.md: links to `docs/patterns/` removed (not present in plugin)
- **Plugin manifest** (`plugin.json`): new file declaring commands, skills, and agents

### What Stays the Same

- SKILL.md orchestration logic (all 12 steps)
- Agent definitions (models, tools, disallowedTools)
- Team profiles (YAML frontmatter, agent references)
- Relative path references within SKILL.md (team profiles, dag-execution.md)
- emit-event.ts behavior (fire-and-forget, silent failure)

### What Becomes Optional

- **emit-event.ts** -- the script is bundled with the plugin but fires silently if not present in the user's project. Users who want observability copy it to their project's `scripts/` directory.

## Plugin Manifest

The `plugin.json` file declares what the plugin provides:

```json
{
  "name": "agentic-orchestration",
  "description": "HOP Orchestrator - decomposes prompts into task DAGs and dispatches Builder/Validator agent teams",
  "version": "1.0.0",
  "author": { "name": "Nathan Vale" },
  "keywords": ["orchestration", "builder-validator", "hop", "dag", "multi-agent", "agent-teams"],
  "license": "MIT",
  "commands": ["./commands/orchestrate.md"],
  "skills": ["./skills/orchestrator"],
  "agents": [
    "./agents/builder.md",
    "./agents/validator.md",
    "./agents/research-builder.md",
    "./agents/research-validator.md"
  ]
}
```

## Marketplace Integration

Adding a plugin to the marketplace requires:

1. Create the plugin directory under `plugins/<name>/`
2. Write `.claude-plugin/plugin.json` with valid manifest
3. Add entry to `.claude-plugin/marketplace.json` with name, source, description, category, and tags
4. Bump marketplace version (minor for new plugins)
5. Write README meeting multi-agent plugin standards (coordination pattern, agent roles, compute multiplier, safety)

## Community Sources

- [Claude Code Plugin Documentation](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [side-quest-plugins marketplace standards](https://github.com/nathanvale/side-quest-plugins)

## Related Documents

| Document | Purpose |
|----------|---------|
| [`specs/master-plan.md`](../../specs/master-plan.md) | Full staged rollout roadmap |
| [`specs/stage-5-plugin-extraction.md`](../../specs/stage-5-plugin-extraction.md) | Detailed extraction plan |
