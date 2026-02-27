---
slug: command-vs-skill-routing
display_name: "Command vs Skill Routing"
one_liner: "Route slash commands to the right format -- simple read-only commands stay as flat .claude/commands/ files; action commands that perform writes or need tool constraints migrate to .claude/skills/<name>/SKILL.md with frontmatter controls like disable-model-invocation and allowed-tools."
intel_date: 2026-02-27
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

command-vs-skill-routing

## Quick Summary

Commands (`.claude/commands/*.md`) and skills (`.claude/skills/*/SKILL.md`) both produce slash commands. They are not competing patterns -- they serve different purposes. Commands are the **simple format**: a flat markdown file with minimal frontmatter (`name`, `description`, `argument-hint`). Skills are the **full-featured format**: a directory with SKILL.md that adds constraint fields (`disable-model-invocation`, `allowed-tools`) and room for references, examples, and tests.

**The routing decision is straightforward:**

| Question | Answer | Use |
|---|---|---|
| Does it perform writes, mutations, or side effects? | Yes | Skill |
| Should Claude be prevented from auto-triggering it? | Yes | Skill |
| Does it need tool sandboxing (`allowed-tools`)? | Yes | Skill |
| Does it need reference files, examples, or tests? | Yes | Skill |
| Is it a simple, read-only prompt with no constraints? | Yes | Command |

Commands are not deprecated. They are the right choice for simple, read-only slash commands where you *want* Claude to be able to auto-invoke them and where no tool constraints are needed. Migration only applies when a command needs capabilities that the command format cannot express.

## When To Use

**Use commands (`.claude/commands/*.md`) when:**
- The slash command is a simple, read-only prompt (e.g., "explain this codebase", "summarize recent changes")
- Auto-invocation by Claude is desirable or harmless
- No tool constraints are needed
- No reference files, examples, or test fixtures are associated with the command

**Migrate to skills (`.claude/skills/*/SKILL.md`) when:**
- The command performs writes, mutations, or side effects (reconciliation, deployment, data migration)
- You need to prevent Claude from auto-invoking the workflow (`disable-model-invocation: true`)
- You want to constrain which tools the command can use (`allowed-tools`)
- The command needs associated reference files, examples, or tests (the directory-per-skill structure supports this)
- Your context budget is tight and the command's description is consuming tokens unnecessarily (disabled skills are excluded from the prompt)

## Core Mechanism

**Two formats, one slash-command system:**

Both formats produce slash commands that users invoke identically (`/name`). The difference is what the format can express:

```
.claude/commands/explain-codebase.md     # Simple format: flat file, minimal frontmatter
.claude/skills/xero-reconcile/SKILL.md   # Full format: directory, constraint frontmatter
```

| Frontmatter field | Commands | Skills |
|---|---|---|
| `name` | Yes | Yes |
| `description` | Yes | Yes |
| `argument-hint` | Yes | Yes |
| `disable-model-invocation` | No | Yes |
| `allowed-tools` | No | Yes |
| Reference files alongside | No (flat file) | Yes (directory) |

**When migration is needed, it is a four-step transform per command file:**

**Step 1: Create skill directory and SKILL.md**

```
.claude/commands/xero-reconcile.md  -->  .claude/skills/xero-reconcile/SKILL.md
```

The directory-per-skill structure enables future additions (references/, examples/, tests/) without restructuring.

**Step 2: Transform frontmatter**

Commands frontmatter (before):
```yaml
---
name: xero-reconcile
description: Reconcile Xero bank transactions for a quarter
argument-hint: "[quarter|all]"
---
```

Skills frontmatter (after):
```yaml
---
name: xero-reconcile
description: Reconcile Xero bank transactions for a quarter
argument-hint: "[quarter|all]"
disable-model-invocation: true
allowed-tools: Bash(bun run xero-cli *)
---
```

Key additions:
- `disable-model-invocation: true` -- Claude cannot auto-trigger this skill; user must invoke via `/xero-reconcile`
- `allowed-tools: Bash(bun run xero-cli *)` -- only xero-cli bash commands are permitted during skill execution

**Step 3: Move body content verbatim**

The body (everything below frontmatter) copies unchanged. No rewriting, no restructuring. The skill's instructions, steps, and references remain identical.

**Step 4: Delete old command file**

Remove the `.claude/commands/<name>.md` file. If the commands/ directory is now empty, git will stop tracking it automatically.

**Slash-command UX is preserved:**

`/xero-reconcile` and `/xero-review` resolve identically whether the source is a command file or a skill directory. The user experience is unchanged.

## Key Rules

1. **Body content moves verbatim.** Do not rewrite, restructure, or "improve" the body during migration. The migration is a frontmatter transform, not a content rewrite. Mixing concerns makes the migration harder to review and introduces risk.
2. **`disable-model-invocation: true` for any skill that performs writes or mutations.** If the skill can create, update, or delete data, it must not be auto-invocable. The user must explicitly trigger it via slash command.
3. **`allowed-tools` should be as narrow as possible.** Prefer `Bash(bun run xero-cli *)` over `Bash(*)`. The wildcard should be within the tool's own command namespace, not a blanket allow.
4. **Reference file paths stay relative.** If the command body says "read `.claude/skills/xero-cli/references/command-reference.md`", keep that path unchanged. Skills resolve relative paths from the project root.
5. **One commit per migration batch.** Migrate related commands together (e.g., all xero-* commands in one commit) so the diff is reviewable as a cohesive change.
6. **Verify slash commands still resolve after migration.** The skill system resolves `/name` by searching both commands/ and skills/ directories. After deleting the command file, verify the skill file is picked up.

## Implementation Notes

**Routing new slash commands:**

When creating a new slash command, choose the format based on the routing table in Quick Summary. Default to commands -- only reach for skills when you need constraint frontmatter or a reference directory. Over-migrating simple commands to skills adds unnecessary directory nesting.

**Identifying existing commands that need migration:**

Migrate first (highest value):
- Commands that perform writes or mutations (reconcile, deploy, migrate)
- Commands that reference external APIs or services
- Commands with complex multi-step workflows

Leave as commands (they're fine where they are):
- Pure read-only informational commands
- Simple prompts with no side effects
- Commands where auto-invocation by Claude is desirable

**Directory structure convention:**

```
.claude/skills/
  xero-cli/              # Reference skill (user-invocable: false, auto-loads for context)
  xero-reconcile/        # Action skill (disable-model-invocation: true)
  xero-review/           # Action skill (disable-model-invocation: true)
```

The three-tier pattern emerges naturally:
- **Reference skills** -- auto-load context, no user invocation needed (`user-invocable: false`)
- **Action skills** -- user-invoked only, constrained tools (`disable-model-invocation: true`)
- **Knowledge skills** -- model can auto-invoke for context (no disable flags)

**Cross-references between skills:**

Action skills often reference other skills' documentation. For example, `xero-reconcile` says "read `.claude/skills/xero-cli/references/command-reference.md`". These cross-references are essential because the referenced skill's full content only auto-loads at Claude's discretion. The "read" instructions make the dependency explicit and deterministic.

**Token budget impact:**

When `disable-model-invocation: true` is set, the skill's description is excluded from the system prompt's skill listing. For skills with long descriptions, this saves tokens on every turn. The body content is only loaded when the user invokes the slash command.

## Failure Modes

- **Forgetting `disable-model-invocation: true` on write skills.** The skill migrates successfully but Claude can now auto-trigger a reconciliation workflow mid-conversation. This is worse than the command pattern, which also lacked the flag but had no explicit control mechanism either.
- **Overly broad `allowed-tools`.** Using `Bash(*)` instead of `Bash(bun run xero-cli *)` removes the sandboxing benefit entirely. The skill can execute arbitrary bash commands.
- **Rewriting body content during migration.** Mixing content changes with the migration makes the diff unreviewable. If the body needs improvements, do them in a separate commit after the migration.
- **Broken cross-references.** If the command body referenced files relative to its old location, and those paths were not project-root-relative, they may break after migration. Always use project-root-relative paths.
- **Orphaned command directory.** Forgetting to delete the old command file leaves two definitions for the same slash command. Behavior depends on resolution order and may be unpredictable.
- **Missing slash-command verification.** Not testing that `/name` still resolves after migration. The skill file might have a typo in the `name` frontmatter field.

## Signals & Diagnostics

- **Pattern is needed:** Action commands exist in `.claude/commands/` that perform writes. Claude occasionally auto-triggers these commands during conversation. There is no clear routing decision for where new slash commands should live.
- **Pattern is working:** Simple read-only commands live in `.claude/commands/`. Action workflows live under `.claude/skills/` with `disable-model-invocation: true` and `allowed-tools` constraints. New slash commands are routed to the correct format without debate. Claude never auto-triggers reconciliation or review workflows. Slash commands resolve correctly from both locations.
- **Pattern is failing:** Everything is migrated to skills regardless of complexity (over-migration). Or: action commands remain as flat command files without constraints. Migrated skills lack `disable-model-invocation` and Claude auto-triggers them. Old command files were not deleted, creating duplicate definitions.

## Tradeoffs

**Gain:** Clear routing decision for where new slash commands belong. Action commands gain invocation control (`disable-model-invocation`), tool sandboxing (`allowed-tools`), context budget savings (disabled skill descriptions excluded from prompt), and directory structure for references/tests. Simple read-only commands stay as flat files with zero overhead. Both formats produce identical slash-command UX.

**Cost:** Two formats to understand instead of one. The routing decision adds a small cognitive step when creating new slash commands. The directory-per-skill structure adds nesting compared to flat command files. Skills that reference other skills' documentation create implicit coupling -- a renamed reference file silently breaks the dependent skill. Over-migration (moving simple commands to skills unnecessarily) adds directory bloat without benefit.

## Related Patterns

- **skill-bootstrapping** -- new action skills should be created directly as SKILL.md files with proper frontmatter; this pattern covers routing decisions for new commands vs skills and migrating existing commands that need constraint frontmatter
- **three-layer-influence** -- skills are one of three influence layers (CLAUDE.md, skills, hooks); migrating commands to skills moves them into the correct layer with proper constraint mechanisms
- **context-engineering** -- `disable-model-invocation: true` reduces context budget by excluding skill descriptions; this is a form of minimum viable context optimization
- **rules-as-exploration-enablers** -- `allowed-tools` constraints in skill frontmatter are rules that define the boundary of what the skill can do, enabling safe exploration within those boundaries

## Source Anchors

- [Claude Code Skills Documentation](https://docs.anthropic.com/en/docs/claude-code/skills) -- official docs on SKILL.md anatomy, frontmatter fields (`name`, `description`, `argument-hint`, `disable-model-invocation`, `allowed-tools`), and skill resolution
- [Claude Code Custom Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) -- command file format (.claude/commands/*.md); the simple format for read-only slash commands with minimal frontmatter
- [Complete Guide to Skills.md in 2026](https://www.flex.com.ph/articles/complete-guide-to-skillsmd-in-2026) -- community guide covering YAML frontmatter (~100 tokens metadata), `disable-model-invocation`, `allowed-tools` patterns, and progressive disclosure via references/
- [Anthropic Docs: Skills vs Commands](https://docs.anthropic.com/en/docs/claude-code/skills#custom-slash-commands) -- skills and commands unified; skills offer frontmatter constraints that commands lack
- [Claude Code Changelog - Skills Launch](https://docs.anthropic.com/en/docs/claude-code/changelog) -- skills system introduction with `disable-model-invocation` and `allowed-tools` as key differentiators from legacy commands
- Practical evidence: `tax-return` repo migration of `xero-reconcile` and `xero-review` from `.claude/commands/` to `.claude/skills/` (commit on `feat/xero-cli-agent-native` branch) -- body content moved verbatim, frontmatter gained `disable-model-invocation: true` and `allowed-tools: Bash(bun run xero-cli *)`
