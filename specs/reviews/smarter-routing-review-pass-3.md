1. **Verdict**: **REQUEST CHANGES**

2. **Strengths**
- The plan clearly separates routing concerns from delivery templates, which keeps HOP boundaries clean and maintainable.
- Two-pass classification (`resolve patterns` then `classify query type`) is explicit and easier to reason about than mixed heuristic routing.
- The compare template is concrete and deterministic, which is good for consistency and testability.
- The added manual test matrix extends into multi-turn behavior instead of only single-turn happy paths.

3. **Critical issues (must fix)**
- **Structured follow-up contract is internally inconsistent (`--context-pattern` vs `--context-patterns`)**.  
  The classifier rule only defines singular flag handling, but examples/tests rely on plural for compare. This will confuse both humans and agents and cause routing drift.  
  References: [plan.md#L182](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L182), [plan.md#L312](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L312), [plan.md#L655](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L655)
- **Compare trigger vocabulary is too narrow for natural phrasing.**  
  Current trigger set misses common “similarity” intent (“in common”, “overlap”, “similarities”). Those queries will likely fall through to single/disambiguation unexpectedly.  
  Reference: [plan.md#L179](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L179)
- **Follow-up resolution hardcodes first-ranked pattern and ignores explicit ordinal intent.**  
  If advisor returns top 3 and user says “the second one,” this design returns `ranked_patterns[0]`, which is a deterministic wrong answer, not an edge case.  
  References: [plan.md#L286](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L286), [plan.md#L295](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L295)
- **`query_type` semantics are overloaded and ambiguous for consumers.**  
  `follow-up` is treated as both an input classification and final envelope output type, while delivery mode is resolved after re-classification. This muddies observability and makes downstream tooling harder to reason about.  
  References: [plan.md#L204](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L204), [plan.md#L333](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L333)

4. **Important observations (should fix)**
- **Discoverability is still incomplete across entry points.** Compare is added in zero-state, but argument hint and examples are still single/lookup-biased in the base spec; users and agents learn from examples first.  
  Reference: [specs/agentic-dojo-skill.md#L146](/Users/nathanvale/code/orchestrator-prototype/specs/agentic-dojo-skill.md#L146)
- **Disambiguation copy is mode-biased (“compare or explain”) and excludes lookup/reference intent.**  
  This nudges users into a mode they didn’t request.  
  References: [plan.md#L184](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L184), [plan.md#L461](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L461)
- **CLI-style flag UX is unnatural for a conversational slash skill.**  
  Keep it for agents if needed, but make it explicitly “agent-only” and preserve a human-first invocation path.
- **“At a Glance” using only `one_liner` may underserve comparisons.**  
  For side-by-side choice, short `quick_summary` is likely more useful than a one-sentence tagline.  
  Reference: [plan.md#L223](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L223)
- **Envelope regex is only documented in planning text, not clearly in runtime-facing docs.**  
  Parser contracts should live where implementers look first (skill docs or dedicated contract file), not only in plan prose.  
  Reference: [plan.md#L410](/Users/nathanvale/code/orchestrator-prototype/docs/plans/2026-02-22-feat-smarter-routing-dojo-advisor-plan.md#L410)

5. **Nice-to-haves**
- Add minimal ordinal resolution (`first|second|third`) for advisor follow-ups.
- Normalize query type naming to one style (`snake_case` or `kebab-case`) and keep it internal-only.
- Add compare examples to zero-state + argument hint + advisor next-steps copy, not just mode lists.
- Add targeted tests for similarity-language compare intents (“in common”, “overlap”, “similarities”).

6. **Questions for the author**
1. Is `--context-patterns` officially part of the contract, or should compare reuse repeated `--context-pattern` args?
2. Should ordinal follow-ups (“first/second/third”) be in v1.1 scope since advisor always returns ranked lists?
3. Do you want `query_type` to represent user utterance shape, resolved route, or both (separate fields)?
4. Is `--context-pattern` intended for humans, agents, or both? If agents-only, where is that stated?
5. Do we want disambiguation prompts to be mode-neutral (`compare / explain / lookup`) by default?
6. Where is the canonical envelope parser contract for other maintainers besides this plan doc?

7. **Synthesis**
The combined reviews have de-risked architecture and scope significantly, but DX risk is still high in interaction semantics: discoverability is uneven, structured-argument contract is inconsistent, and follow-up resolution currently favors deterministic-but-wrong behavior for natural ranked-list references. Nathan, I’d move to implementation only after clarifying the structured flag contract, expanding compare intent vocabulary, and defining unambiguous follow-up/query-type semantics for both users and parser consumers.