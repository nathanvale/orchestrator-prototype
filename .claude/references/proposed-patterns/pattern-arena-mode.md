---
slug: arena-mode
display_name: "Arena Mode"
one_liner: "Dispatch N builders on the same task concurrently, each in its own worktree, then select the best solution -- turning agent non-determinism from a liability into an asset."
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

arena-mode

## Quick Summary

Arena Mode runs the same task N times concurrently with different builders -- each in its own worktree -- then selects the best solution by validation score. Unlike parallel-dispatch (which runs DIFFERENT tasks concurrently), arena mode runs IDENTICAL tasks to exploit non-determinism. The speaker deployed 20 agents with one prompt to build a search agent, and every agent found a working solution (20/20) in 20-30 minutes. The pattern turns agent variability from a reliability problem into an optimization strategy: the best solution emerges from competition, not collaboration.

## When To Use

- Tasks where the correct solution path is unclear and exploration is valuable
- When reliability needs are high and parallel compute is cheap -- run N attempts, keep the best
- Hard tasks where single-agent success rate is below 70%
- As the prerequisite for cooperative-refinement -- arena generates N candidates, refinement merges the best parts
- When you want to test different models or team profiles against the same problem
- Projects where solution quality matters more than compute cost

## Core Mechanism

Arena mode operates in three phases:

**Phase 1: Concurrent Dispatch**
- Clone N worktrees from the same base commit
- Dispatch N builders with identical task descriptions but potentially different models or team profiles
- Builders run concurrently with zero communication during build
- Each builder operates in isolation using worktree-isolation pattern
- All solutions are committed to separate branches

**Phase 2: Independent Validation**
- Validator runs on each solution independently
- Score by pass/fail, or by rubric if multiple pass
- No cross-solution comparison during validation -- validator sees one solution at a time

**Phase 3: Selection**
- If one passes, use it
- If multiple pass, select by highest validation score or trigger HITL
- If none pass, retry the best-scoring candidate or escalate to cooperative-refinement
- Winning solution is merged to the main branch; other worktrees are archived or deleted

Results from the Tessl experiment: "Every agent finds a solution. This is new. Remembering 2-3 years ago, that wasn't possible." Codex had a slight edge over Claude Code in their tests.

## Key Rules

1. Arena mode is triggered by `--arena` flag or automatically for hard tasks when cooperative-refinement is enabled.
2. All builders receive identical task descriptions -- no variation in prompts.
3. Builders may use different models or team profiles to maximize diversity.
4. No communication between builders during execution -- isolation is enforced by worktree boundaries.
5. Validation is independent: validator sees one solution at a time, not all N solutions together.
6. Selection is mechanical: if pass count = 1, use it; if > 1, score by rubric; if 0, retry or escalate.
7. Worktrees are ephemeral: winning solution is merged, others are deleted to avoid clutter.

## Implementation Notes

Reuse the worktree-isolation pattern: each builder gets its own git worktree cloned from the base commit. The worktree directory is `worktrees/<agent-id>/`. This prevents file system conflicts and allows concurrent writes.

Use heterogeneous builders: vary the model (Sonnet vs Opus vs Codex), team-profile (architecture vs debugging vs testing focus), or temperature setting to maximize diversity.

The orchestrator tracks N dispatch tasks in parallel using Promise.all() or an equivalent concurrency primitive. Each task's AGENT_ID environment variable points to its own worktree.

Validation should be mechanical and identical for all solutions: same acceptance criteria, same rubric. Do not introduce subjective judgment that could skew selection.

If cooperative-refinement is enabled, all N solutions proceed to the refinement phase even if some fail validation. Refinement extracts the best parts from each.

## Failure Modes

- **Insufficient diversity:** All N builders use the same model and team profile, producing near-identical solutions. Wastes compute without improving quality.
- **Validation inconsistency:** Validator applies different criteria to different solutions, making selection arbitrary.
- **Worktree leakage:** Builders access files outside their worktree, causing file conflicts or polluting the main branch.
- **Selection ambiguity:** Multiple solutions pass with identical scores, and the orchestrator has no tiebreaker logic. Causes non-deterministic selection.
- **Over-provisioning:** Running N=20 when N=3 would suffice. Inflates cost and latency without meaningful quality gain.

## Signals & Diagnostics

- **Pattern is needed:** Single-agent success rate is below 70%, or task is hard and reliability matters.
- **Pattern is working:** Pass rate across N solutions is >50%, and the best solution scores higher than the average single-agent attempt.
- **Pattern is failing:** All N solutions fail validation with similar errors -- indicates the task description is broken, not a search problem.
- **Pattern is over-provisioned:** Solutions converge after N=3; running N=10 produces no new approaches.

## Tradeoffs

**Gain:** Turns non-determinism into an asset. Single-agent reliability of 60% becomes multi-agent reliability of 95% with N=5. Catches edge cases and explores alternative approaches without manual intervention.

**Cost:** N times the compute. A 20-agent arena costs 20x the tokens. Latency is the max of all N runs, not the sum (concurrent), but still longer than a single attempt. Worktree management adds orchestration overhead.

**When to pay:** Hard tasks where solution quality justifies the cost. When failure has high downstream cost (production deploy, API contract change). When parallelizable compute is cheap relative to human debugging time.

## Related Patterns

- **Parallel-Dispatch** -- runs DIFFERENT tasks concurrently; arena runs the SAME task concurrently
- **Worktree-Isolation** -- technical foundation for arena; each builder needs its own worktree
- **Cooperative-Refinement** -- the next phase after arena; takes N solutions and merges the best parts
- **Team-Profiles** -- vary team profiles across builders to maximize diversity
- **Difficulty-Routing** -- triggers arena automatically for hard tasks
- **Builder-Validator** -- each arena solution is validated independently using this pattern

## Source Anchors

Community evidence and research:
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; 20 agents deployed in parallel, every agent found a working solution
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- arena + cooperative refinement experiment details
- [Multi-Agent Orchestration for Developers in 2026](https://scopir.com/posts/multi-agent-orchestration-parallel-coding-2026/) -- "give both agents the identical prompt... don't look at one until you've gotten both responses"
- [@agent_wrapper: open-sourced system for 30 parallel AI coding agents per person](https://x.com/agent_wrapper/status/2024885035774738700) (1,534 likes, 284 reposts)
- [Claude Code Agent Teams: The Complete Guide 2026](https://claudefa.st/blog/guide/agents/agent-teams) -- mesh communication, ~3-4x token cost
- [Claude Code's Agent Teams Are Insane -- Cole Medin](https://www.youtube.com/watch?v=-1K_ZWDKpU0) (63,555 views, 1,406 likes)
- [Claude Code Multi-Agent Orchestration with Opus 4.6, Tmux and Agent Sandboxes -- IndyDevDan](https://www.youtube.com/watch?v=RpUTF_U4kiw) (34,839 views, 1,178 likes)
- [Stanford Proves Parallel Coding Agents are a Scam](https://www.reddit.com/r/LocalLLaMA/comments/1qou799/stanford_proves_parallel_coding_agents_are_a_scam/) (211 pts, 107 comments) -- counterpoint: CooperBench shows coordination is hard but community argues the benchmark artificially blindfolds agents
- [Google Research: multi-agent coordination across 180 configurations](https://x.com/GoogleResearch/status/2016621362480382213) (771 likes, 101 reposts) -- +81% on parallelizable tasks, -70% on sequential ones
