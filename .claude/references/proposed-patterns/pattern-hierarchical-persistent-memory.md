---
slug: hierarchical-persistent-memory
display_name: "Hierarchical Persistent Memory"
one_liner: "Place AGENTS.md files at multiple directory levels -- root, component, tool -- so general rules flow down while specific rules stay local, and agents accumulate context by traversing parent directories."
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

hierarchical-persistent-memory

## Quick Summary

AGENTS.md is not one file -- it is a hierarchy. Rules at the root apply globally. Rules at the component level are specific. When an agent traverses the file system, it picks up rules from parent directories. This creates layered context where general project rules coexist with component-specific patterns. AGENTS.md serves three functions: rules (coding style, standards, project setup), skills (what the agent can do, tool knowledge), and memory (learnings from past runs, what to do and what not to do).

## When To Use

- Multi-component projects where each component has distinct patterns or requirements
- When global project rules need to coexist with module-specific guidance
- Projects shared between multiple AI coding tools (Claude Code, Codex) where AGENTS.md can be referenced from CLAUDE.md or symlinked
- Long-running projects where past learnings should inform future agent runs
- Large codebases where loading all context at once would exceed token budgets

## Core Mechanism

AGENTS.md files are placed at multiple directory levels:

**Root level:** Project-wide rules -- coding style, commit conventions, architecture patterns, global don'ts.

**Component level:** Module-specific guidance -- API patterns, framework usage, component-specific testing requirements.

**Tool level:** Per-tool configuration -- how to use specific libraries, integration patterns.

When an agent operates on a file, it traverses upward from that file's directory to the root, collecting AGENTS.md files. Later files in the traversal (closer to root) provide broader context, while earlier files (closer to the working directory) provide specific guidance. This creates a layered context stack where specific rules override or augment general rules.

Progressive disclosure: the main AGENTS.md file is always loaded (target ~2,000 tokens). References or sub-files are loaded only when relevant flags, modes, or tools are detected, keeping default token cost low.

Cross-agent sharing: AGENTS.md can be referenced from CLAUDE.md, or symlinked to the same file when running Claude Code and Codex in parallel on the same project.

## Key Rules

1. AGENTS.md files must never contradict each other -- component-level files augment root files, they don't override fundamental project standards.
2. Root AGENTS.md should contain only universal project rules -- if a rule applies to one component but not others, it belongs in the component directory.
3. Keep main AGENTS.md files under 2,000 tokens -- use references or sub-files for detailed documentation that should load conditionally.
4. AGENTS.md is for rules, skills, and memory -- not general project documentation or API reference (those belong in docs/).
5. Update AGENTS.md as learnings accumulate -- if an agent makes the same mistake twice, add a rule to prevent the third occurrence.
6. When symlinking or referencing AGENTS.md from CLAUDE.md, ensure the reference path is absolute or correctly relative to avoid breakage.

## Implementation Notes

Establish a three-layer hierarchy as a starting template:

1. **Protocol file (root):** Project-wide rules, commit conventions, architecture patterns.
2. **Focused persona/skill files (component level):** Module-specific guidance, framework patterns, testing requirements.
3. **Maintenance subagent (optional):** A dedicated agent or script that updates AGENTS.md files based on learnings from previous runs.

Use symbolic links when running multiple AI tools on the same project to avoid duplicating AGENTS.md content.

Consider splitting large AGENTS.md files into a main file plus a `references/` subdirectory, where the main file is always loaded and references are loaded conditionally based on flags, modes, or tool detection.

Emergent Mind analysis shows that AGENTS.md files have a median size of ~336 words (~142 lines) and tend to have a shallow hierarchy -- most projects use 2-3 levels, not 5+.

## Failure Modes

- **Contradictory rules:** Component-level AGENTS.md forbids a pattern that root AGENTS.md requires. Agent behavior becomes unpredictable.
- **Rule bloat:** Root AGENTS.md accumulates component-specific rules over time, inflating token cost for all agents even when rules are irrelevant.
- **Stale memory:** AGENTS.md contains outdated rules from a previous project phase. Agents follow obsolete guidance.
- **Broken references:** CLAUDE.md references AGENTS.md using a relative path that breaks when the working directory changes.
- **Over-documentation:** AGENTS.md becomes a knowledge base dump instead of a focused set of rules and learnings. Token budget wasted on irrelevant context.
- **No traversal support:** Agent implementation reads only the root AGENTS.md, missing component-level context.

## Signals & Diagnostics

- **Pattern is needed:** Agents repeatedly make the same mistakes in specific components despite general project rules. Agents waste tokens searching for configuration or framework patterns that could be documented.
- **Pattern is working:** Agents automatically apply component-specific patterns when working in those components. Token usage remains stable as project grows because only relevant context is loaded. Learnings from past runs prevent repeated mistakes.
- **Pattern is failing:** Agents ignore component-level AGENTS.md files. Token usage grows linearly with project size because all context is always loaded. Agents make the same mistakes repeatedly despite AGENTS.md rules.

## Tradeoffs

**Gain:** Agents accumulate durable context across sessions. General rules apply broadly while specific rules stay local. Token cost remains bounded even as project complexity grows. Learnings compound over time instead of being lost between sessions.

**Cost:** AGENTS.md maintenance becomes an ongoing task -- files must be updated as patterns evolve. Traversal logic adds complexity to agent implementation. Risk of contradictory rules if hierarchy is not carefully managed. Initial setup cost to establish the hierarchy and decide what belongs at each level.

## Related Patterns

- **Spec as Source of Truth** -- AGENTS.md encodes validated patterns from completed tasks
- **Hydration Pattern** -- AGENTS.md provides baseline context for agents before they start work
- **Skill Bootstrapping** -- AGENTS.md documents skills available to agents
- **Meta-Prompting** -- AGENTS.md can contain prompts or prompt fragments for specific scenarios

## Source Anchors

- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/)
- [Support AGENTS.md -- Issue #6235 -- anthropics/claude-code](https://github.com/anthropics/claude-code/issues/6235) (2,838+ upvotes)
- [Pointing CLAUDE.md to AGENTS.md](https://www.reddit.com/r/ClaudeCode/comments/1r9zx34/pointing_claudemd_to_agentsmd/) (34 pts, 53 comments) -- r/ClaudeCode
- [AGENTS.md Files: AI Agent Configuration -- Emergent Mind](https://www.emergentmind.com/topics/agents-md-files) -- median file ~336 words, ~142 lines, consistent shallow hierarchy
- [Stop Using /init for AGENTS.md -- Addy Osmani](https://addyosmani.com/blog/agents-md/) -- three-layer hierarchy: protocol file, focused persona/skill files, maintenance subagent
- [Complete Guide to Skills.md in 2026](https://www.flex.com.ph/articles/complete-guide-to-skillsmd-in-2026) -- Skills.md as complementary convention
