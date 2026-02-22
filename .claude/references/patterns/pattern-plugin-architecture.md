---
slug: plugin-architecture
display_name: "Plugin Architecture"
one_liner: "Extract a working prototype from a project's .claude/ directory into a distributable marketplace plugin while keeping the prototype repo as an educational snapshot."
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

plugin-architecture

## Quick Summary

Plugin Architecture describes extracting a working prototype from a project's `.claude/` directory into a distributable Claude Code plugin installable via the marketplace. The prototype repo remains frozen as an educational resource -- readers can checkout any stage branch and see the orchestrator at that complexity level. The living, evolving orchestrator moves to the plugin. The extraction is a structural mapping: prototype paths become plugin-relative paths. Orchestration logic, agent definitions, and team profiles are copied unchanged; only the `app` identifier and cross-repo links are updated.

## When To Use

- When a working prototype has proven its value and should be made available to other projects without requiring them to copy files manually
- When the prototype repo should remain a frozen educational snapshot (immutable stage branches) while the living code evolves in the plugin
- When other learners should be able to install the pattern via `/plugin install <name>` rather than forking the repo
- When the marketplace plugin should be the canonical source of fixes and improvements going forward

## Core Mechanism

The extraction maps prototype paths to plugin-relative paths:

| Prototype Path | Plugin Path |
|---------------|-------------|
| `.claude/agents/builder.md` | `agents/builder.md` |
| `.claude/agents/validator.md` | `agents/validator.md` |
| `.claude/commands/orchestrate.md` | `commands/orchestrate.md` |
| `.claude/skills/orchestrator/SKILL.md` | `skills/orchestrator/SKILL.md` |
| `.claude/skills/orchestrator/references/` | `skills/orchestrator/references/` |
| `.claude/skills/orchestrator/teams/` | `skills/orchestrator/teams/` |
| `scripts/emit-event.ts` | `scripts/emit-event.ts` |

What changes in the extraction:

- **`app` identifier** in `emit-event.ts`: project-specific name becomes plugin name
- **Cross-repo links** in reference docs: links to `docs/patterns/` are removed (not present in plugin)
- **`plugin.json` manifest**: new file declaring commands, skills, and agents the plugin provides

What stays the same: all SKILL.md orchestration logic, all agent definitions (models, tools, disallowedTools), all team profiles, all relative path references within SKILL.md.

**Marketplace integration** adds the plugin to a marketplace repository under `plugins/<name>/`, writes a `plugin.json` manifest, updates `marketplace.json`, and writes a README meeting multi-agent plugin standards.

## Key Rules

1. The prototype repo is not modified during extraction -- it remains the frozen educational snapshot.
2. Relative path references within SKILL.md work unchanged in the plugin because the directory structure mirrors the prototype structure.
3. The `app` field in `emit-event.ts` must be updated to the plugin name -- not the prototype repo name.
4. The `plugin.json` manifest must list every command, skill, and agent the plugin provides.
5. After extraction, fixes and improvements go to the plugin repo -- not to the prototype stage branches (those are immutable).

## Implementation Notes

The key insight: Claude Code resolves skill file references relative to the skill's own location. A skill at `skills/orchestrator/SKILL.md` that reads `references/dag-execution.md` will find `skills/orchestrator/references/dag-execution.md` -- the same relative reference works in both the prototype (`.claude/skills/orchestrator/`) and the plugin (`skills/orchestrator/`).

`emit-event.ts` fires silently if not present in the user's project. Bundle it with the plugin for observability, but mark it optional -- users who want the events copy it to their project's `scripts/` directory.

The marketplace README must address: coordination pattern (how agents interact), agent roles (what each does), compute multiplier (how many agents per invocation), and safety (what the orchestrator can and cannot do).

## Failure Modes

- **Modifying prototype stage branches during extraction:** Stage branches are frozen. Any change to them breaks the educational guarantee (source anchor line numbers drift).
- **Absolute path references in SKILL.md:** If SKILL.md references `.claude/skills/orchestrator/references/dag-execution.md` (absolute prototype path) instead of `references/dag-execution.md` (relative), the plugin cannot resolve the file.
- **Missing manifest entries:** A command, skill, or agent not declared in `plugin.json` is not installed when users run `/plugin install`. Silent gaps in functionality.
- **`app` identifier not updated:** Observability events from the plugin appear as prototype events. Dashboards cannot distinguish plugin runs from prototype runs.

## Signals & Diagnostics

- **Pattern is needed:** The working orchestrator is buried inside a single project's `.claude/` directory; sharing it requires forking the entire repo or copying files manually.
- **Pattern is working:** `/plugin install agentic-orchestration` installs a working orchestrator; the prototype stage branches remain unchanged; the plugin is the canonical location for new fixes.
- **Pattern is failing:** Plugin installation misses agents or skills; relative path references fail inside the plugin; the prototype branches received commits after extraction.

## Tradeoffs

**Gain:** The orchestrator becomes installable in any project. The prototype repo remains a clean educational resource without accumulating plugin-specific concerns. The marketplace provides discoverability.

**Cost:** Two repositories to maintain (prototype + plugin). Fixes in the plugin must be manually backported to the prototype docs if they affect the educational narrative. The extraction is a one-time migration -- ongoing drift is expected and acceptable.

## Related Patterns

- **Higher-Order Prompt** -- the HOP architecture is what makes the plugin worth extracting; a hardcoded orchestrator would be too project-specific to be a useful plugin
- **Team Profiles** -- team profiles are bundled in the plugin; users can add new team profiles after installation without modifying the plugin

## Source Anchors

Stage 5 (concept introduction and proof):
- Planned -- orchestration/5-plugin (not yet created)
