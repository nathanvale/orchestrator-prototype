---
slug: cooperative-refinement
display_name: "Cooperative Refinement"
one_liner: "After parallel builders produce independent solutions, cross-pollinate their outputs so each agent can reflect on the other's approach and produce a refined result at a fraction of the initial build cost."
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

cooperative-refinement

## Quick Summary

Cooperative Refinement is a post-build phase where parallel builders receive each other's solutions and produce improved versions. After an arena-style parallel dispatch where N builders independently solve the same task, the orchestrator extracts each builder's output (diff and structured summary) and re-dispatches each builder with its own solution plus compressed summaries of the other builders' solutions. The builder reflects on what the other approaches did better, integrates improvements, and produces a refined solution. The refinement budget is substantially smaller than the initial build because the agent adapts rather than reconstructs -- typically 20-40% of Phase 1 token cost. A final validator or scoring pass selects the best refined solution.

## When To Use

- When a task has high uncertainty and multiple valid approaches (architecture decisions, algorithm selection, API design)
- When running parallel builders on the same task via the arena pattern and you want to improve beyond "pick the best"
- When the refinement cost (one additional builder dispatch per agent) is justified by the quality gain over raw arena selection
- When builders use different models or team profiles -- heterogeneous agents produce more diverse solutions to cross-pollinate
- When the task is complex enough that a single builder's blind spots are likely (5+ files, algorithmic work, cross-module refactors)
- When the `--refine` flag is passed, or when difficulty-routing tags the task as `hard` and multiple builders are available

## Core Mechanism

Cooperative Refinement runs as an optional phase after parallel dispatch completes and before the final validator pass:

**Phase 1: Arena Build (existing parallel-dispatch pattern)**
1. Dispatch N builders concurrently on the same task, each in its own worktree.
2. All builders complete independently -- no communication during build.
3. Collect each builder's output: the diff against HEAD plus a structured summary of the approach taken.

**Phase 2: Cross-Pollination**
4. For each builder B_i, construct a refinement context containing:
   - B_i's own solution (full diff)
   - For each other builder B_j: a compressed summary of B_j's approach plus key code snippets (not the full diff -- under 1,000 tokens per summary)
   - A refinement prompt: "Review the other approaches. What did they do better than your solution? What ideas could improve your implementation? Produce a refined version that integrates the best elements while maintaining your solution's strengths."
5. Re-dispatch each builder with the refinement context. Each builder operates in a fresh worktree from HEAD -- not from its Phase 1 worktree.
6. Builders produce refined solutions independently. No further cross-pollination rounds.

**Phase 3: Selection**
7. Run the validator on each refined solution independently.
8. If exactly one passes: use it.
9. If multiple pass: score by rubric (code simplicity, test coverage, pattern adherence) or present to the user for selection via HITL.
10. If none pass: fall back to the best Phase 1 solution and enter the standard retry loop.

**Summary extraction format (generated after Phase 1):**

```
## Approach: <builder-name>
- Strategy: <1-2 sentence description>
- Key decisions: <bullet list of notable implementation choices>
- Snippets: <2-3 key code blocks, max 50 lines each>
```

## Key Rules

1. Cross-pollination summaries are compressed -- send approach descriptions and key snippets, not full diffs from other builders. Each summary must be under 1,000 tokens.
2. Phase 2 builders start from a clean worktree at HEAD, not from their Phase 1 worktree -- this forces the builder to reconstruct with improvements rather than patch.
3. Maximum one refinement round -- do not iterate. Diminishing returns after the first round make additional rounds cost-ineffective.
4. The refinement prompt must explicitly ask "What did they do better?" -- without this framing, builders tend to defend their original approach rather than integrate improvements.
5. If all Phase 2 solutions fail validation, fall back to Phase 1 solutions -- refinement must never discard working solutions.
6. The pattern is opt-in via a `--refine` flag or triggered automatically when the task's difficulty is `hard` and multiple builders are available.
7. Homogeneous builders (same model, same team profile) are discouraged -- diversity of approach is the prerequisite for useful cross-pollination.

## Implementation Notes

**Interaction with team-profiles:** Cooperative refinement is most valuable when builders use different models or team profiles. A Codex builder and a Claude builder produce genuinely different approaches. Two identical builders produce near-identical solutions -- cross-pollination adds cost without diversity. The ideal configuration dispatches each arena builder with a different `--team` profile.

**Interaction with difficulty-routing:** When difficulty-routing tags a task as `hard`, cooperative refinement can be triggered automatically if multiple builders are available. Standard tasks skip refinement -- the cost is not justified for straightforward implementations.

**Scoring rubric for Phase 3 selection (when multiple pass):**
- Fewer lines of code (simpler is better)
- More comprehensive error handling
- Better test coverage
- Closer adherence to existing codebase patterns
Present scores to the user if the margin is narrow.

**Worktree lifecycle:** Phase 1 worktrees are cleaned up after summaries are extracted. Phase 2 worktrees are created fresh from HEAD. The orchestrator owns all worktree creation and teardown -- builders never manage their own worktrees.

**Event emissions:**
- `refinement.started` -- after Phase 1 summaries are extracted
- `refinement.dispatched` -- for each Phase 2 builder launch
- `refinement.selected` -- when the final solution is chosen, with source (phase-1-fallback or phase-2-refined) and builder identity

## Failure Modes

- **Full diffs sent as cross-pollination context:** Sending complete diffs from all builders blows up the context window. Builders lose focus and produce worse refinements than their Phase 1 originals. Always compress to summaries under 1,000 tokens.
- **Multiple refinement rounds:** Iterating Phase 2 more than once produces diminishing returns and increasing cost. The first round captures 80%+ of the improvement. Cap at one round.
- **Homogeneous builders:** Two identical builders (same model, same team profile) produce near-identical solutions. Cross-pollination finds nothing new. Only trigger cooperative refinement when builder diversity exists.
- **Phase 1 solutions discarded on Phase 2 failure:** If all refined solutions fail validation, the working Phase 1 solutions must be preserved as fallback. Refinement is additive -- never destructive.
- **Defensive refinement:** Without the "What did they do better?" framing, builders justify their original approach and reject improvements. The prompt must explicitly direct constructive integration, not competitive comparison.
- **Refinement on standard tasks:** Triggering cooperative refinement for straightforward implementations wastes tokens. The cost overhead (1.4-1.8x additional per builder) is only justified for `hard` tasks where retry rates are high.

## Signals & Diagnostics

- **Pattern is needed:** Arena-style parallel builds consistently produce solutions where each has strengths the others lack; manual review reveals that combining ideas from multiple solutions would yield a better result; the best arena solution scores well but not excellently.
- **Pattern is working:** Phase 2 refined solutions score higher than their corresponding Phase 1 originals on the validation rubric; refinement token cost is 20-40% of Phase 1 build cost; builders explicitly reference ideas from other solutions in their refined output; `refinement.selected` events show phase-2-refined as source.
- **Pattern is failing:** Refined solutions score equal to or lower than Phase 1 originals (no improvement); refinement cost exceeds 50% of Phase 1 cost (summaries too large); builders ignore other solutions and reproduce their original approach; `refinement.selected` consistently falls back to phase-1-fallback.

## Tradeoffs

**Gain:** Solutions that combine the best ideas from multiple independent approaches. The refinement cost is substantially lower than a fresh build because agents adapt rather than reconstruct. Heterogeneous builders (different models, different team profiles) produce genuinely diverse approaches that cross-pollinate well. The pattern turns competition (arena -- pick the best) into cooperation (refinement -- improve all from each other).

**Cost:** Requires at least 2 builders per task (arena prerequisite). Adds one refinement round plus a selection pass after the initial build. Total cost for a 2-builder cooperative refinement: approximately 2.4-2.8x a single builder (2x for arena + 0.4-0.8x for refinement). The pattern is only cost-effective when the quality improvement justifies the additional spend -- typically for `hard` tasks where retry rates are high without it.

## Related Patterns

- **parallel-dispatch** -- the execution infrastructure that enables arena-style builds; cooperative refinement is a post-processing phase after parallel dispatch
- **team-profiles** -- heterogeneous teams maximize the diversity of solutions for cross-pollination; using different team profiles for each arena builder is the ideal configuration
- **difficulty-routing** -- `hard` tasks are the natural trigger for cooperative refinement; standard tasks skip it
- **builder-validator** -- the validator runs on each refined solution independently; the standard binary verdict drives selection
- **iterative-refinement** -- the human-in-the-loop gate; when multiple refined solutions pass validation, the user selects
- **worktree-isolation** -- Phase 1 and Phase 2 both require isolated worktrees; the orchestrator manages the full lifecycle

## Source Anchors

Community evidence (not yet implemented in orchestrator stages):
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; arena + cooperative refinement experiments with 20 agents; refinement budget "much much lower than building up budget"; one agent spontaneously invented an arena pattern inside its own implementation
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- written companion to the talk with additional detail on cooperative refinement results
- [Google Research: multi-agent coordination across 180 configurations](https://x.com/GoogleResearch/status/2016621362480382213) (771 likes, 101 reposts) -- task-contingent: +81% on parallelizable tasks, -70% on sequential ones
- [Multi-Agent Orchestration for Developers in 2026](https://scopir.com/posts/multi-agent-orchestration-parallel-coding-2026/) -- Scopir guide: "give both agents the identical prompt... give the one agent the results of the other and ask them to reflect"
- [@agent_wrapper: open-sourced system for 30 parallel AI coding agents per person](https://x.com/agent_wrapper/status/2024885035774738700) (1,534 likes, 284 reposts)
- [Claude Code Agent Teams: The Complete Guide 2026](https://claudefa.st/blog/guide/agents/agent-teams) -- mesh communication, mailbox system, ~3-4x token cost
- [Claude Code's Agent Teams Are Insane -- Cole Medin](https://www.youtube.com/watch?v=-1K_ZWDKpU0) (63,555 views, 1,406 likes) -- practical demo of parallel agent coordination
