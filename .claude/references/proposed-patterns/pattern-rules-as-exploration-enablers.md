---
slug: rules-as-exploration-enablers
display_name: "Rules as Exploration Enablers"
one_liner: "Adding AGENTS.md rules to agents counterintuitively increases token usage and runtime, but significantly improves solution quality -- rules reduce environmental uncertainty, freeing agents to explore deeper solution architectures."
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

rules-as-exploration-enablers

## Quick Summary

Adding AGENTS.md rules counterintuitively increases token usage and runtime, but significantly improves solution quality. The mechanism: rules reduce environmental uncertainty -- the agent stops spending tokens searching randomly for configuration, API keys, or framework patterns, and instead spends those tokens exploring deeper solution architectures and better implementations. The Tessl experiment found that guiding the model to better solutions increased costs and runtime, but also increased quality scores. The paradox resolves when you realize that the "saved" tokens from reduced searching are reinvested into better solutions, not eliminated.

## When To Use

- Projects where solution quality matters more than minimizing token cost
- Complex environments with many configuration files, API keys, or framework conventions where agents waste tokens searching
- Long-running projects where higher upfront token cost is amortized across many runs
- Situations where random exploration leads to poor solutions (shallow architectures, missed patterns)
- When agents repeatedly fail to find configuration or integration points without guidance

## Core Mechanism

Without AGENTS.md rules, agents face high environmental uncertainty. They must search the codebase to find:
- Where configuration files live
- How to access API keys
- Which framework patterns to follow
- Where tests should be placed
- How modules are structured

This search consumes tokens but often yields shallow or incorrect answers because the agent has no ground truth to validate against.

With AGENTS.md rules, the agent receives direct answers to environmental questions:
- "Configuration is in `config/app.ts`"
- "API keys are in `.env.local`"
- "Use React hooks, not class components"
- "Tests go in `__tests__/` adjacent to source files"

This eliminates random searching. The tokens that would have been spent searching are now available for deeper exploration: evaluating multiple architectural approaches, considering edge cases, implementing more robust error handling.

The counterintuitive result: total token usage goes UP (because the agent now explores more deeply), but solution quality also goes UP (because exploration is focused on architecture, not configuration hunting).

Research supports this: the ETH Zurich paper found that AGENTS.md files improve performance by 2.7% when repos have no other documentation, and reduce median wall-clock runtime by 28.64%. Emergent Mind reported a 16.58% reduction in output token consumption when AGENTS.md files are present. The Tessl experiment found increased token usage but higher quality scores.

## Key Rules

1. Rules should eliminate environmental uncertainty -- tell agents where things are, not what to build.
2. Expect token usage to increase when adding AGENTS.md -- this is not a failure signal if solution quality improves.
3. Measure quality, not just cost -- cheaper solutions are not always better solutions.
4. Focus rules on configuration, location, and conventions -- these are the high-uncertainty, low-value searches that waste tokens.
5. Do not over-constrain architecture -- rules should free exploration, not eliminate it.
6. Update AGENTS.md when agents waste tokens searching for something that could be documented.

## Implementation Notes

Audit agent traces to identify high-uncertainty, low-value searches:
- Reading multiple config files before finding the right one
- Searching for API key locations across `.env`, `config/`, `src/constants/`
- Trying multiple framework patterns before settling on one
- Exploring directory structure to determine test placement

For each identified search, add a rule to AGENTS.md:
- "Configuration lives in `config/app.ts`"
- "API keys are in `.env.local` and accessed via `process.env`"
- "Use React functional components with hooks"
- "Place tests in `__tests__/` adjacent to source files"

Monitor both token usage and solution quality after adding rules. If token usage increases but quality improves, the pattern is working. If both increase, the rules may be over-constraining -- remove or refine them.

Lance Cleveland's recommendation: even a rudimentary AGENTS.md can significantly improve output. Start simple -- document the 3-5 highest-uncertainty questions agents repeatedly face.

## Failure Modes

- **Over-constraining:** Rules eliminate architectural exploration entirely. Agent follows a prescribed path that happens to be suboptimal for the current task.
- **Stale rules:** AGENTS.md documents old configuration locations or obsolete framework patterns. Agent wastes tokens following outdated guidance, then correcting course.
- **Cost obsession:** Engineering team sees increased token usage after adding AGENTS.md and removes it, ignoring quality improvements. Agents return to random searching and shallow solutions.
- **Wrong rules:** AGENTS.md contains incorrect information (wrong config path, wrong framework convention). Agent follows bad guidance and produces broken output.
- **Rule bloat:** AGENTS.md accumulates too many low-value rules. Token budget spent loading rules exceeds tokens saved from reduced searching.

## Signals & Diagnostics

- **Pattern is needed:** Agent traces show repeated searching for configuration, API keys, or framework patterns. Solutions are shallow or miss obvious patterns. Agents frequently fail to find integration points without extensive trial and error.
- **Pattern is working:** Token usage increases slightly but solution quality improves significantly. Agents spend fewer turns searching and more turns implementing. Solutions demonstrate deeper architectural thinking and better error handling.
- **Pattern is failing:** Token usage increases without quality improvement. Agents follow prescribed paths that produce suboptimal solutions. Agent traces show no evidence of architectural exploration -- just rote execution of rules.

## Tradeoffs

**Gain:** Agents explore solution space more deeply instead of wasting tokens on environmental searches. Solution quality improves. Time-to-solution decreases despite higher token usage because agents make fewer false starts. Learnings compound -- each rule improves all future runs.

**Cost:** Higher token usage per run. AGENTS.md maintenance overhead. Risk of over-constraining if rules are too prescriptive. Initial engineering investment to identify high-uncertainty searches and document them.

## Related Patterns

- **Spec Hardening** -- validated patterns from completed tasks inform AGENTS.md rules
- **Difficulty Routing** -- complex tasks benefit more from rules because environmental uncertainty is higher
- **Three-Layer Influence** -- AGENTS.md is the durable layer where rules should live
- **Hierarchical Persistent Memory** -- rules can be layered (global vs component-specific) to minimize over-constraining

## Source Anchors

- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; experiment results showing rules increase tokens but improve quality
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich paper; context files improve performance by 2.7% when repos have no other documentation; median wall-clock runtime reduction of 28.64%
- [AGENTS.md Files: AI Agent Configuration -- Emergent Mind](https://www.emergentmind.com/topics/agents-md-files) -- "16.58% reduction in output token consumption" when AGENTS.md files present
- [Improve Your AI Assisted Coding With AGENTS.md -- Lance Cleveland](https://lancecleveland.com/2026/02/24/improve-your-ai-assisted-coding-with-agents-md/) -- "even a rudimentary AGENTS.md can significantly improve the output"
