---
slug: self-reflecting-analytics
display_name: "Self-Reflecting Analytics"
one_liner: "The orchestrator collects structured metrics from its own execution traces -- token usage, tool calls, task durations, retry rates -- to ground future orchestration decisions in data rather than intuition."
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

self-reflecting-analytics

## Quick Summary

Self-Reflecting Analytics turns the orchestrator's own execution traces into structured data that informs future runs. After an orchestration completes, an analytics script parses the spec file's Execution Log and Hydration Checkpoint sections (or raw session traces from `~/.claude` and `~/.codex`) and extracts KPIs: per-task token usage, tool call counts, wall-clock duration, retry rates, HITL escalation frequency, and difficulty classification accuracy. The output is a JSON report that serves two purposes: (1) the human reviews it to understand orchestration performance, and (2) future orchestration runs can read historical reports to calibrate decisions -- which tasks to route to Codex, how to estimate token budgets, which team profiles produce the highest first-pass success rates. Without this pattern, orchestration decisions are based on intuition. With it, they are data-driven.

## When To Use

- After any completed orchestration run where you want to understand performance characteristics
- When difficulty-routing classifications need calibration (which tasks tagged `standard` actually required retries? which tasks tagged `hard` passed first try?)
- When token budget estimates in the iterative-refinement step need grounding in actual usage data
- When comparing team profiles or builder models to determine which produces the best cost/quality ratio
- When building a historical dataset across multiple runs to surface cross-run trends
- When the `--analytics` flag is passed, or automatically after every run when configured

## Core Mechanism

The analytics pipeline has three stages:

**Stage 1: Trace Collection**
Read execution data from one or more sources:
- **Primary:** The spec file's Execution Log section -- structured events emitted by the orchestrator during the run (agent.dispatched, spec.reread, plan.approved, verdict events, retry events, HITL events)
- **Secondary:** Raw session traces from `~/.claude/projects/` or `~/.codex/` -- JSONL files containing every API call, tool use, and response
- **Tertiary:** Hydration Checkpoint section -- task status transitions, retry counts, timing data

**Stage 2: KPI Extraction**
Parse traces into structured metrics:

```json
{
  "orchestration_id": "rest-api-2026-02-25",
  "summary": {
    "total_tasks": 5,
    "total_waves": 3,
    "total_duration_seconds": 847,
    "total_tokens": 142300,
    "first_pass_success_rate": 0.6,
    "retry_rate": 0.4,
    "hitl_escalations": 1
  },
  "per_task": [
    {
      "task_id": "define-user-types",
      "difficulty": "standard",
      "builder": "builder",
      "tokens": 18200,
      "duration_seconds": 95,
      "retries": 0,
      "verdict": "PASS",
      "validator_failure_reasons": []
    },
    {
      "task_id": "implement-auth-middleware",
      "difficulty": "hard",
      "builder": "codex",
      "tokens": 45800,
      "duration_seconds": 312,
      "retries": 2,
      "verdict": "PASS",
      "validator_failure_reasons": [
        "Missing verifyToken export",
        "No error handling for expired tokens"
      ]
    }
  ],
  "difficulty_accuracy": {
    "standard_passed_first_try": 3,
    "standard_needed_retry": 0,
    "hard_passed_first_try": 1,
    "hard_needed_retry": 1
  }
}
```

**Stage 3: Report Output**
Write the JSON report to `specs/analytics/<orchestration-id>.json`. Optionally produce a human-readable summary to stdout.

## Key Rules

1. Analytics scripts are CLI tools with a documented contract: they take a spec file path (or session-id) as input and output JSON to stdout or a file. No interactive prompts, no side effects.
2. Every analytics script must include a self-check: run one verified example after changes to confirm output format is correct. This prevents silent breakage.
3. Analytics output is append-only and never modifies the spec file or any orchestrator infrastructure. Analytics reads; it never writes to orchestration state.
4. Scope analytics rules narrowly in AGENTS.md -- "applies to tools in scripts/analytics/" not globally. Prevent analytics rules from interfering with orchestration rules.
5. Historical analytics data lives in `specs/analytics/` alongside spec files -- co-located with the runs they describe.
6. The analytics script must handle both Claude and Codex session formats -- session trace structures differ between agents.

## Implementation Notes

**Script contract:** Following the pattern from the talk, each analytics script:
- Documents its arguments and example usage in a docstring
- Takes a single required parameter (spec file path or session-id)
- Outputs structured JSON
- Exits 0 on success, non-zero on failure
- Can be invoked by the orchestrator or by a human

**AGENTS.md scoping:** The analytics skill gets its own scoped AGENTS.md (or a section in the orchestrator's references) that documents:
- Scope: which directories and scripts it applies to
- Boundaries: what it can and cannot modify (read-only with respect to orchestration state)
- CLI contract: argument format and output format for each script
- Self-check requirement: "run one verified example after changes"
- Script catalog: list of available analytics tools

**Session trace locations:**
- Claude Code: `~/.claude/projects/<project>/` contains JSONL session transcripts
- Codex CLI: `~/.codex/` contains rollout JSONL files
- Orchestrator spec files: `specs/` directory in the project

**Cross-run aggregation:** When multiple analytics reports exist in `specs/analytics/`, a separate aggregation script can compute cross-run trends: average retry rates by difficulty tag, token usage trends over time, team profile comparison, builder model comparison. This is the data that calibrates difficulty-routing and token estimation.

**Integration with meta-prompting:** Analytics reports are high-signal input for the meta-prompting reflection agent. Instead of analyzing raw execution traces, the reflection agent reads the pre-computed KPIs. This reduces the reflection agent's context window usage and improves proposal quality -- it reasons over structured data, not raw logs.

**Event emission:**
- `analytics.started` -- analytics script begins execution
- `analytics.complete` -- analytics report written successfully
- `analytics.error` -- analytics script failed (non-zero exit)

## Failure Modes

- **Analytics script modifies orchestration state:** An analytics tool that writes to the spec file or modifies task status corrupts the orchestration. Analytics must be read-only.
- **Unscoped AGENTS.md rules:** Analytics rules placed in the root AGENTS.md interfere with builder or validator behavior. Scope rules to the analytics directory only.
- **No self-check on script changes:** An analytics script is modified but the output format silently changes. Downstream consumers (meta-prompting, cross-run aggregation) parse the wrong structure. The self-check requirement catches this.
- **Missing session traces:** Claude Code or Codex may not retain session traces beyond a certain age or size limit. Analytics should degrade gracefully -- report what is available, flag what is missing.
- **Token counting inaccuracy:** Different session formats report token usage differently (input tokens, output tokens, cache tokens). The analytics script must normalize to a consistent accounting method.

## Signals & Diagnostics

- **Pattern is needed:** Orchestration decisions (difficulty routing, token estimation, team selection) are based on intuition or fixed heuristics; no data exists to calibrate them; the same misclassifications recur across runs.
- **Pattern is working:** Analytics reports appear in `specs/analytics/` after each run; difficulty-routing accuracy improves over time as classifications are calibrated against actual retry data; token estimates in iterative-refinement converge toward actual usage; meta-prompting proposals cite analytics data as evidence.
- **Pattern is failing:** Analytics scripts are present but never run (no reports generated); reports exist but are never read by downstream consumers; analytics rules are scoped globally and interfere with builders; self-check is skipped and output format drifts silently.

## Tradeoffs

**Gain:** Orchestration decisions become data-driven. Difficulty routing is calibrated against actual retry rates, not heuristics. Token estimation converges toward real usage patterns. Team profile comparisons are grounded in cost/quality metrics. The meta-prompting reflection agent receives structured KPIs instead of raw traces. Over 10+ runs, the compounding effect is significant -- the orchestrator learns which configurations work best for which task types.

**Cost:** Requires building and maintaining analytics scripts. Session trace formats may change with agent updates, requiring script maintenance. Cross-run aggregation adds storage and processing overhead. The analytics phase adds post-orchestration latency (typically seconds, not minutes). The primary cost is the initial investment in building the analytics infrastructure -- ongoing cost is low.

## Related Patterns

- **meta-prompting** -- consumes analytics reports as structured input for reflection proposals; analytics provides the evidence that meta-prompting reasons over
- **difficulty-routing** -- analytics data calibrates the difficulty rubric; tasks classified `standard` that needed retries suggest the rubric's hard-signal thresholds need adjustment
- **iterative-refinement** -- token estimation in Step 8 can be calibrated against historical analytics data; actual usage replaces the flat 4,500-token-per-task estimate
- **team-profiles** -- cross-run analytics comparing team profiles reveals which builder/validator combinations produce the best first-pass success rates
- **hydration-pattern** -- the Hydration Checkpoint provides per-task timing and retry data that analytics consumes; hydration writes, analytics reads

## Source Anchors

Community evidence (not yet implemented in orchestrator stages):
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; slide at ~18:00 shows three-panel architecture: Meta-Prompt, Analytics Script (`home-session-metrics.py`), and scoped AGENTS.md (`NY-Analytics v1`)
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- written companion; "system prompts define general behavior; AGENTS.md encodes project-, component-, and tool-specific memory"
- The slide's AGENTS.md shows the exact scoping pattern: "Applies to all tools in ny/scripts/[metrics|benchmarks]", "Supports NY experiments only; no global Agent-Squad changes", CLI Contract requirement, Self-Check requirement, Script Catalog
- Speaker: "If you want on a later point have some better decision grounding for orchestrating more of them, then you need some data-driven approach"
- [Effective context engineering for AI agents -- Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- Anthropic's canonical take on context management; sub-agent architecture returns 1,000-2,000 token summaries; "minimum viable context" principle
- [Getting AI to Work in Complex Codebases -- HumanLayer](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents) (1.5k stars, 107 forks) -- Frequent Intentional Compaction (FIC) pattern; "deliberately structuring how you feed context to the AI throughout the development process"
- [Support AGENTS.md -- Issue #6235 -- anthropics/claude-code](https://github.com/anthropics/claude-code/issues/6235) (2,838+ upvotes) -- community demand for native AGENTS.md support; workarounds include `@AGENTS.md` import, symlinks, and SessionStart hooks
