---
slug: three-layer-influence
display_name: "Three-Layer Influence Model"
one_liner: "Three layers influence coding agent behavior ordered by durability: system prompts (fragile, changes with each release), AGENTS.md (durable, survives across sessions), and user prompts (volatile, single interaction) -- invest engineering effort in the durable middle layer."
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

three-layer-influence

## Quick Summary

Three layers influence coding agent behavior, ordered by durability: system prompts (fragile, changes with each release), AGENTS.md (durable, survives across sessions), and user prompts (volatile, single interaction). The key insight is that system prompts change nearly every day with new releases, user prompts are ephemeral, and AGENTS.md is the durable middle layer where engineering effort produces compound returns. Referencing Andrej Karpathy's concept of "system prompt learning," the pattern recognizes that investing in the layer outside your control (system prompts) or the layer that disappears after one turn (user prompts) yields poor ROI compared to the persistent middle layer.

## When To Use

- Projects with long lifespans where patterns and learnings should accumulate
- Teams where multiple engineers interact with the same codebase via AI agents
- Situations where agent behavior needs to remain consistent across tool updates and model releases
- When agent behavior needs to be auditable and version-controlled alongside code
- Projects where onboarding new agents (or new engineers using agents) should be fast and consistent

## Core Mechanism

The three layers exist in a stack, each with different durability characteristics:

**Layer 1: System Prompts (Fragile)**
- Controlled by the AI tool vendor (Anthropic, OpenAI, etc.)
- Changes with every model release or tool update
- Affects behavior and tool usage in ways outside your control
- Can break existing workflows without warning
- Cannot be version-controlled or audited by the user

**Layer 2: AGENTS.md (Durable)**
- Controlled by the project or team
- Persists across sessions, model releases, and tool updates
- Version-controlled alongside code
- Contains rules, skills, and memory
- Survives agent restarts, context window resets, and model swaps
- The sweet spot for engineering investment

**Layer 3: User Prompts (Volatile)**
- Single interaction, single turn
- Useful for one-off requests or clarifications
- Can be templated but fundamentally ephemeral
- Disappears after the agent responds
- Lowest ROI for effort invested

The model places AGENTS.md at the center because it is the only layer that is both durable (survives across sessions) and controllable (under project ownership).

## Key Rules

1. Invest engineering time in AGENTS.md, not in crafting elaborate user prompts -- user prompts are ephemeral and do not compound.
2. Do not rely on system prompt behavior to remain stable -- system prompts change with every release and are outside your control.
3. Extract patterns from successful user prompts and codify them into AGENTS.md -- this converts volatile knowledge into durable knowledge.
4. Version-control AGENTS.md alongside code -- it is part of the project's executable specification.
5. When agent behavior changes unexpectedly after a tool update, check if a system prompt change broke an assumption -- update AGENTS.md to compensate.
6. Template user prompts for common tasks, but do not spend significant time optimizing them -- optimize AGENTS.md instead.

## Implementation Notes

Audit existing workflows to identify patterns currently encoded in user prompts or assumed from system prompt behavior. Migrate these to AGENTS.md:

- **User prompt patterns:** If you repeatedly give the same instruction ("always use named exports"), move it to AGENTS.md.
- **System prompt assumptions:** If you rely on the agent knowing a specific tool or framework, document it in AGENTS.md so behavior persists across model changes.

Treat AGENTS.md as a living document: update it after every agent run that reveals a gap or learning. This creates a feedback loop where each run improves the next.

When a new model release or tool update changes agent behavior, compare before/after behavior and compensate in AGENTS.md if necessary. This insulates the project from system prompt churn.

Consider creating AGENTS.md templates for common project types (monorepos, libraries, full-stack apps) so new projects start with durable baselines instead of relying on user prompts.

## Failure Modes

- **System prompt dependence:** Workflow relies on specific system prompt behavior. Tool update breaks the workflow because system prompt changed.
- **Prompt engineering theater:** Engineers spend hours crafting the perfect user prompt for a one-off task instead of updating AGENTS.md with reusable patterns.
- **Undocumented tribal knowledge:** Experienced engineers know how to prompt the agent effectively, but that knowledge is not captured in AGENTS.md. New engineers or new agents start from zero every time.
- **Version skew:** AGENTS.md falls out of sync with the codebase. Agents follow outdated rules, causing regressions.
- **Ignoring layer boundaries:** Treating user prompts as durable (copy-pasting the same prompt repeatedly instead of moving it to AGENTS.md) or treating AGENTS.md as fragile (rewriting it for every new model release instead of letting it stabilize).

## Signals & Diagnostics

- **Pattern is needed:** Agents require lengthy user prompts to produce correct output. Behavior changes unexpectedly after tool updates. New team members struggle to get consistent agent results.
- **Pattern is working:** User prompts are short and task-specific. Agent behavior remains stable across model releases. AGENTS.md grows steadily as learnings accumulate. New agents (or engineers using agents) onboard quickly by reading AGENTS.md.
- **Pattern is failing:** Repeated copy-pasting of the same user prompt across multiple sessions. Frequent surprises after tool updates. AGENTS.md is stale or ignored.

## Tradeoffs

**Gain:** Engineering effort compounds -- each update to AGENTS.md improves all future agent runs. Behavior becomes predictable and stable across model releases and tool updates. Knowledge is version-controlled and auditable.

**Cost:** AGENTS.md requires maintenance -- it must be updated as the project evolves. Initial investment needed to extract patterns from user prompts and system assumptions. Risk of over-documenting if AGENTS.md becomes a knowledge dump instead of focused rules.

## Related Patterns

- **Hierarchical Persistent Memory** -- AGENTS.md is the implementation of the durable layer
- **Meta-Prompting** -- AGENTS.md can contain prompts or prompt fragments for specific scenarios
- **Spec as Source of Truth** -- validated patterns from completed tasks feed back into AGENTS.md
- **Skill Bootstrapping** -- AGENTS.md documents skills available to agents

## Source Anchors

- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; speaker references Karpathy's "system prompt learning"
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich paper; developer-written context files: +4% task success, +19% cost
- [Effective context engineering for AI agents -- Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- "minimum viable context" principle
- [Stop Using /init for AGENTS.md -- Addy Osmani](https://addyosmani.com/blog/agents-md/) -- "auto-generated content isn't useless, it's redundant"
