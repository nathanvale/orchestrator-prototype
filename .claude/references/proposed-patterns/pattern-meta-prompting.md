---
slug: meta-prompting
display_name: "Meta-Prompting"
one_liner: "After a completed orchestration, a reflection agent analyzes the execution trace and proposes rule improvements that compound the orchestrator's effectiveness across runs -- with mandatory human approval before any change is applied."
intel_date: 2026-02-26
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

meta-prompting

## Quick Summary

Meta-Prompting is a post-orchestration reflection phase where a dedicated agent analyzes the execution trace -- task durations, retry counts, HITL escalations, token usage, validator failure reasons -- and proposes structured improvements to the orchestrator's rules, patterns, and skill file. The proposals are always presented to the user for approval. No change is auto-applied. Approved proposals are stored in a `learnings/` directory alongside the spec file for retrieval in future runs. Over time, the orchestrator compounds its effectiveness: recurring failure modes get rules that prevent them, successful patterns get reinforced, and token-wasting behaviors get eliminated.

## When To Use

- After a completed orchestration run (all tasks `VERDICT: PASS` or explicitly skipped via HITL)
- After a failed orchestration where the failure pattern is instructive (repeated retries on the same failure mode, systematic validator rejections)
- When the orchestrator has accumulated 3+ completed runs and cross-run patterns should be surfaced
- When the user passes `--reflect` to explicitly request post-run analysis
- When HITL escalations occurred during the run -- these are signals of orchestrator limitations worth learning from

## Core Mechanism

Meta-Prompting runs as an optional post-orchestration phase triggered by `orchestration.complete` or `--reflect`:

**Step 1: Trace Collection**
The reflection agent reads the execution trace from the spec file's Execution Log and Hydration Checkpoint sections:
- Per-task metrics: duration, retry count, validator failure reasons, difficulty rating, which builder was used
- Aggregate metrics: total token usage, total duration, HITL escalation count, retry rate
- Failure patterns: which tasks failed, why, how many retries before success, what changed between retries

**Step 2: Pattern Analysis**
The reflection agent identifies recurring patterns across the current run (and optionally across prior runs if a `learnings/` directory exists):
- Tasks that consistently required 2+ retries -- what do they have in common?
- Validator failure reasons that repeat -- are acceptance criteria underspecified?
- HITL escalations -- could the orchestrator have handled these automatically?
- Token usage outliers -- which tasks consumed disproportionate tokens and why?
- Difficulty misclassifications -- tasks rated `standard` that required retries, tasks rated `hard` that passed first try

**Step 3: Proposal Generation**
The reflection agent produces a maximum of 5 structured proposals, each categorized:

```
## Proposal <N>: <title>

Category: rule-addition | rule-modification | pattern-gap | prompt-improvement | anti-pattern
Evidence: <specific trace data that motivates this proposal>
Current behavior: <what the orchestrator does now>
Proposed change: <concrete, actionable change -- not vague advice>
Expected impact: <what metric this should improve>
Applies to: SKILL.md | agents/<name>.md | references/<name>.md | learnings/
```

**Step 4: Human Approval Gate**
Proposals are presented to the user one at a time. For each proposal, the user can:
1. **Approve** -- the proposal is applied (written to the target file or to `learnings/`)
2. **Modify** -- the user adjusts the proposal, then approves the modified version
3. **Reject** -- the proposal is discarded with an optional reason
4. **Defer** -- the proposal is saved to `learnings/pending.md` for future review

**Step 5: Learning Persistence**
Approved proposals are written to their target location:
- Rule additions/modifications: written to `learnings/<run-id>.md` as a structured record. The user decides when to promote learnings into SKILL.md or agent definitions.
- Pattern gaps: written to `learnings/<run-id>.md` with a flag indicating a new pattern file may be warranted.
- Anti-patterns: written to `learnings/<run-id>.md` for cross-run retrieval.

The `learnings/` directory lives alongside the spec files (e.g., `specs/learnings/`). Future orchestration runs can read this directory to avoid known pitfalls.

## Key Rules

1. Proposals are never auto-applied -- every change requires explicit human approval. This is the non-negotiable safety constraint. Auto-applying meta-prompted changes creates an uncontrolled feedback loop.
2. Maximum 5 proposals per reflection -- more than 5 creates decision fatigue. The reflection agent prioritizes by expected impact.
3. Each proposal must cite specific evidence from the execution trace -- no generic advice. "Improve task descriptions" is not a valid proposal. "Task `implement-auth-middleware` failed 3 times because the validator checked for a `verifyToken` export that was not in the task description" is valid.
4. Proposals never modify the SKILL.md directly -- they are written to `learnings/`. The user promotes learnings to SKILL.md at their discretion. This prevents the orchestration protocol from drifting without explicit human intent.
5. The reflection agent is read-only with respect to orchestrator infrastructure -- it reads the spec file and execution log but does not modify them.
6. Cross-run analysis (reading prior `learnings/` entries) is optional and triggered by the `--history` flag alongside `--reflect`.

## Implementation Notes

**Reflection agent definition:** The reflection agent is a distinct agent type with `disallowedTools: [Write, Edit, NotebookEdit]` (same constraint as the validator). It produces proposals as structured text output. The orchestrator (not the reflection agent) writes approved proposals to disk. This prevents the reflection agent from directly modifying any orchestrator files.

**Model selection:** The reflection agent benefits from a capable reasoning model (Sonnet or Opus) because it performs analytical work -- pattern recognition across trace data, root-cause analysis of failures, proposal generation. This is not mechanical validation; Haiku is insufficient.

**Interaction with hydration-pattern:** The execution trace data that meta-prompting analyzes is already persisted in the spec file's Hydration Checkpoint and Execution Log sections. No additional trace infrastructure is needed -- meta-prompting reads what hydration writes.

**Interaction with hitl-protocol:** HITL escalations during the run are high-signal inputs for meta-prompting. Each escalation represents a case where the orchestrator could not proceed autonomously. The reflection agent should prioritize proposals that would prevent future HITL escalations for the same class of problem.

**Learnings directory structure:**

```
specs/learnings/
  2026-02-25-rest-api.md       # Learnings from a specific run
  2026-02-26-auth-refactor.md  # Learnings from another run
  pending.md                   # Deferred proposals awaiting review
```

Each file contains structured proposal records with their approval status and the evidence that motivated them.

**Future run retrieval:** At the start of a new orchestration, if a `learnings/` directory exists, the orchestrator reads the most recent 3 learning files and incorporates any approved rules into the current run's context. This is the compounding mechanism -- past learnings inform future runs without modifying the core SKILL.md.

**Event emissions:**
- `reflection.started` -- meta-prompting phase begins
- `reflection.proposal` -- each proposal generated (with category and title)
- `reflection.approved` -- user approves a proposal
- `reflection.rejected` -- user rejects a proposal
- `reflection.deferred` -- user defers a proposal
- `reflection.complete` -- meta-prompting phase ends

## Failure Modes

- **Auto-applied proposals:** If proposals bypass the human approval gate, the orchestrator's rules drift in unpredictable directions. A bad proposal that compounds across runs (e.g., "always use Codex for all tasks") can degrade performance systematically. The approval gate is the safety mechanism.
- **Generic proposals:** "Improve task descriptions" or "Be more specific" are not actionable. Without evidence-grounded specificity, proposals waste the user's review time. The 5-proposal cap and evidence requirement prevent this.
- **Reflection agent modifies files directly:** If the reflection agent has Write/Edit tools, it may "helpfully" apply its own proposals. The `disallowedTools` constraint prevents this structurally.
- **Learnings not retrieved in future runs:** If the orchestrator does not read the `learnings/` directory at startup, approved proposals have no effect. The compounding loop is broken -- the user approved changes that are never used.
- **Proposal overload across runs:** If every run generates 5 proposals and all are approved, the `learnings/` directory accumulates noise. The 3-file retrieval cap on future runs prevents context bloat. Periodic user review of `learnings/` to promote stable rules into SKILL.md keeps the directory lean.
- **Contradictory proposals across runs:** Run A proposes "always use Codex for algorithmic tasks." Run B proposes "never use Codex for algorithmic tasks." Without cross-run consistency checking, both get approved. The user must resolve contradictions during review -- the reflection agent flags potential conflicts when reading prior learnings.

## Signals & Diagnostics

- **Pattern is needed:** The same failure mode occurs across multiple orchestration runs; the user manually adds the same HITL guidance repeatedly; token usage does not decrease across runs on similar prompts; the orchestrator makes the same decomposition mistakes on structurally similar tasks.
- **Pattern is working:** `reflection.approved` events appear after completed runs; learnings from prior runs are retrieved at startup (`learnings.loaded` event); retry rates decrease across runs on similar task types; HITL escalation frequency decreases over time; the `learnings/` directory contains evidence-grounded proposals with clear approval status.
- **Pattern is failing:** Proposals are consistently generic (no evidence citations); the user rejects most proposals (low signal-to-noise); learnings are approved but never loaded in future runs (broken retrieval); the reflection agent writes files directly despite `disallowedTools`.

## Tradeoffs

**Gain:** The orchestrator improves across runs without manual rule authoring. Failure modes are identified from execution traces (data-driven, not intuition-driven). The human approval gate ensures quality control while reducing the cognitive burden of identifying improvements -- the agent proposes, the human decides. Over 10+ runs, the compounding effect is significant: recurring failures get prevented, token-wasting patterns get eliminated, and decomposition quality improves.

**Cost:** Adds a post-orchestration phase that requires human attention (reviewing 1-5 proposals). The reflection agent uses a capable model (not Haiku), adding token cost. The `learnings/` directory requires periodic review to prevent accumulation. The compounding benefit is only realized over multiple runs -- a single run does not recoup the reflection cost.

## Related Patterns

- **hydration-pattern** -- provides the execution trace data (checkpoint, execution log) that meta-prompting analyzes; meta-prompting reads what hydration writes
- **hitl-protocol** -- HITL escalations are high-signal inputs for meta-prompting proposals; reducing future HITL frequency is a key success metric
- **iterative-refinement** -- the human approval gate in meta-prompting mirrors the plan approval gate in iterative-refinement; both require explicit human confirmation before proceeding
- **builder-validator** -- the reflection agent follows the validator's structural constraint (disallowedTools) to prevent direct file modification
- **difficulty-routing** -- difficulty misclassifications (standard tasks that failed, hard tasks that passed first try) are a key analysis target for meta-prompting proposals
- **spec-as-source-of-truth** -- the spec file's Execution Log is the primary data source for reflection; the spec must faithfully record execution events for meta-prompting to work

## Source Anchors

Community evidence (not yet implemented in orchestrator stages):
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; meta-prompting loop: "please take a lessons learned out of your sessions, make five suggestions how to improve, wait for my approval"
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- written companion with detail on meta-prompting feedback loops (reactive and proactive)
- [@zeeg: "if you're writing AGENTS.md files by hand, you're doing it wrong"](https://x.com/zeeg/status/2026401982798508513) -- counter-position to manual rule authoring; ETH Zurich shows auto-generated files can hurt, reinforcing the human approval gate
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich paper; LLM-generated context files reduce task success by 2-3% when redundant; supports the rule that proposals must target non-discoverable information only
- [Stop Using /init for AGENTS.md -- Addy Osmani](https://addyosmani.com/blog/agents-md/) -- "auto-generated content isn't useless, it's redundant. The agent could find all of it anyway by reading the repo"; proposals should surface genuinely non-obvious learnings
- [Please stop creating "memory for your agent" frameworks](https://www.reddit.com/r/ClaudeCode/comments/1r4asf6/please_stop_creating_memory_for_your_agent/) (256 pts, 132 comments) -- r/ClaudeCode; community pushback against automated rule generation without human oversight; validates the mandatory approval gate
- [@addyosmani: Be careful with /init, treat AGENTS.md as a living list of codebase smells](https://x.com/addyosmani/status/2026172457233829922) -- three-layer hierarchy recommendation (protocol file, focused persona/skill files, maintenance subagent)
