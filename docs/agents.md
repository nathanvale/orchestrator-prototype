# Agent Catalog

All agent definitions used in the HOP Orchestrator, organized by stage. Each agent entry lists its model, role, tool set, and key constraints. Side-by-side comparison shows why each choice was made.

---

## Stage 1: Engineering Team (Default)

Three agents operate in Stage 1. The Orchestrator is implicit (it runs as the skill invoker); the Builder and Validator are dispatched via the Task tool.

### Orchestrator

| Property | Value |
|----------|-------|
| Model | `claude-opus-4-6` (via `/orchestrate` command) |
| Role | Coordination-only leader. Creates tasks, dispatches agents, reports results. |
| Tools | Task, TaskCreate, TaskUpdate, TaskList, TaskGet, Bash |
| Disallowed | (enforced by convention, not disallowedTools -- the prompt says "never write code") |

**Key constraints:**
- Never writes code or modifies files
- Never dispatches itself
- Holds the thread -- all agent results flow back to the orchestrator
- Runs the full 5-step dispatch protocol defined in SKILL.md

### Builder

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-5` |
| Role | Focused implementation agent |
| Tools | Read, Glob, Grep, Write, Edit, Bash, TaskGet, TaskUpdate |
| Disallowed | (none) |

**Key constraints:**
- Read before writing -- always inspect existing files before modifying them
- File boundaries are absolute -- only touch files mentioned in the task description
- Idempotent execution -- if the file already satisfies the requirements, report and stop
- Named exports only -- never use default exports
- JSDoc on every exported function
- Report changes via TaskUpdate with a concise summary
- Surface unexpected findings clearly -- do not bury them in verbose output. Use explicit phrases the orchestrator's trigger detection can match: "I discovered that...", "This conflicts with...", "This requires choosing between...". Ambiguous or inline findings will not trigger a bounce-back and will be silently lost.

### Validator

| Property | Value |
|----------|-------|
| Model | `claude-haiku-4-5` |
| Role | Read-only verification agent |
| Tools | Read, Glob, Grep, Bash, TaskGet, TaskUpdate |
| Disallowed | Write, Edit, NotebookEdit |

**Key constraints:**
- Binary verdict -- every report ends with exactly `VERDICT: PASS` or `VERDICT: FAIL`
- Check everything listed -- do not skip criteria even if earlier checks already failed
- Specific failure feedback -- list exactly which checks failed and why
- Never suggest fixes -- describe the problem only; the orchestrator decides what to do next
- Structurally incapable of modifying files (disallowedTools enforced by runtime)
- Report design concerns even when passing -- a clean implementation can still create downstream problems. Use the form "VERDICT: PASS but note: ..." to surface issues like circular dependencies, hidden coupling, or naming collisions that the acceptance criteria did not cover. The orchestrator can act on these before the next wave.

---

## Why These Models?

| Agent | Model | Reasoning |
|-------|-------|-----------|
| Orchestrator | Opus | Complex reasoning: must parse ambiguous prompts, decompose tasks, track dependencies across stages, handle retry and refinement decisions. Needs the highest capability. |
| Builder | Sonnet | Well-specified tasks: the orchestrator has already done the hard reasoning. The builder follows a clear brief. Sonnet handles this reliably at ~1/5th the cost of Opus. |
| Validator | Haiku | Mechanical checks: read files, confirm named exports exist, confirm JSDoc is present, confirm function signatures match. Haiku is fast, cheap, and sufficient. Roughly 1/60th the cost of Opus per token. |

The cost structure matters at scale. In a 10-task orchestration, you get 10 builder calls and 10 validator calls. If all 20 used Opus, the cost would be ~12x higher than the Builder=Sonnet, Validator=Haiku configuration. For Stage 1's single-task loop, this difference is small. By Stage 8 with parallel execution, it becomes significant.

The research team uses the same model assignments: sonnet for the research builder and haiku for the research validator. The rationale is identical -- the orchestrator has already done the hard reasoning (decomposition, wave computation). The research builder follows a clear research brief with web search tools. The research validator performs mechanical checks (URL reachability, coverage completeness) that haiku handles efficiently.

---

## Stage 4: Research Team

Stage 4 introduces a second agent team to prove the HOP pattern -- the same orchestrator dispatches different agents for different domains with zero protocol changes.

### Research Builder

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-5` |
| Role | Research and synthesis agent |
| Tools | Read, Glob, Grep, Write, Edit, Bash, WebSearch, WebFetch, TaskGet, TaskUpdate |
| Disallowed | (none) |

**Key additions vs. Builder:** WebSearch and WebFetch give the research builder access to external sources. Research-specific instructions cover: broad-to-narrow search methodology, multi-source corroboration (2-3 sources per key claim), source date preference (< 12 months), synthesis by theme rather than by source, and explicit handling of conflicting information.

**Hallucination guard:** The research builder is instructed to say "I could not find a source for this" rather than fabricating citations. Hallucinated sources are treated as a critical failure by the research validator.

### Research Validator

| Property | Value |
|----------|-------|
| Model | `claude-haiku-4-5` |
| Role | Research output verification agent |
| Tools | Read, Glob, Grep, Bash, WebFetch, TaskGet, TaskUpdate |
| Disallowed | Write, Edit, NotebookEdit |

**Key additions vs. Validator:** WebFetch enables the research validator to spot-check cited URLs -- verifying they are reachable and that their content supports the claims made. Research-specific checks include: coverage completeness, citation quality, source recency (< 12 months), source reachability, source support, conflict disclosure, hallucinated source detection, output structure, and methodology documentation.

**Automatic FAIL:** Hallucinated sources (URLs that return 404 or content that contradicts the cited claim) trigger an automatic FAIL verdict regardless of other check results.

### Team Switching

The `--team` flag selects which team profile to load at orchestration start. Team profiles live in `.claude/skills/orchestrator/teams/` and map a team name to a builder and validator agent.

| Flag | Team Profile | Builder | Validator |
|------|-------------|---------|-----------|
| (none) / `--team engineering` | `teams/engineering.md` | `builder` | `validator` |
| `--team research` | `teams/research.md` | `research-builder` | `research-validator` |

The 12-step dispatch protocol is identical for all teams. Only the agent names in `$BUILDER_AGENT` and `$VALIDATOR_AGENT` change. This is the HOP proof -- the orchestrator is agent-agnostic.

---

## Stage 6: Codex as Alternative Execution Engine

Stage 6 introduces Codex CLI as an alternative builder for tasks assessed as `hard` during difficulty scoring. Codex is not a Claude Code agent -- it is an external CLI tool (`codex exec`) invoked via Bash. The orchestrator routes to it when the difficulty rubric identifies a task that would benefit from deeper reasoning.

### How Codex Differs from Claude Code Builders

| Property | Claude Code Builder (sonnet) | Codex CLI |
|----------|------------------------------|-----------|
| Invocation | Task tool with model: sonnet | Bash `codex exec --full-auto` |
| Context | Resume-capable (agentId) | Stateless (no resume) |
| Output | Direct agent result | File at `/tmp/codex-task-<id>.md` |
| Timeout | No fixed timeout | 5 minutes |
| Cost model | Claude API tokens | OpenAI API tokens |
| Availability | Always available | Optional (requires `codex` CLI installed) |

### When to Use Which

- **Standard builder (most tasks):** Greenfield code, following existing patterns, 1-2 files, clear specifications. The standard builder is faster, cheaper, and supports resume on retry.
- **Codex CLI (hard tasks):** Multi-file refactors, algorithmic complexity, cross-module dependency analysis. Codex handles deeper reasoning but loses resume capability and has a fixed timeout.

### Key Design Decisions

**Validator is always haiku.** Regardless of which builder produced the changes, the validator runs via Claude Code haiku. The validator reads the spec file and inspects the codebase -- it does not know or care which builder made the changes. This keeps validation independent and consistent.

**Fallback preserves the protocol.** If Codex is unavailable or fails, the orchestrator falls back to the standard builder. The retry counter is not incremented by fallbacks -- only by VERDICT: FAIL from the validator. This means Codex failures are routing problems, not quality problems.

**Codex is optional.** The orchestrator works identically without Codex installed. The `--no-codex` flag explicitly disables routing for users who prefer the standard builder for all tasks.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/builder-validator.md`](patterns/builder-validator.md) | Deep dive on the Builder/Validator separation -- structural enforcement, model rationale, community sources |
| [`docs/patterns/dispatch-loop.md`](patterns/dispatch-loop.md) | How the Orchestrator coordinates Builder and Validator -- the 5-step protocol |
| [`docs/patterns/higher-order-prompt.md`](patterns/higher-order-prompt.md) | Why BUILDER_AGENT and VALIDATOR_AGENT are variables, not hardcoded names |
| [`specs/master-plan.md`](../specs/master-plan.md) | Full stage roadmap and key design decisions |
| [`.claude/agents/builder.md`](../.claude/agents/builder.md) | Builder agent definition file |
| [`.claude/agents/validator.md`](../.claude/agents/validator.md) | Validator agent definition file |
| [`docs/patterns/team-profiles.md`](patterns/team-profiles.md) | Team profile pattern -- how agent identities are bundled and resolved at orchestration start |
| [`.claude/skills/orchestrator/teams/`](../.claude/skills/orchestrator/teams/) | Team profile directory containing engineering.md and research.md |
| [`docs/patterns/codex-escalation.md`](patterns/codex-escalation.md) | How the orchestrator detects hard tasks and routes to Codex CLI |
| [`docs/patterns/difficulty-routing.md`](patterns/difficulty-routing.md) | Difficulty rubric -- how tasks are scored and what triggers Codex escalation |
