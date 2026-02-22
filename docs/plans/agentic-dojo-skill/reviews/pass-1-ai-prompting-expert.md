# Staff Engineer Review: Agentic Dojo Remediation Plan

<!-- Pass 1 of 3 | Persona: AI Prompting Expert -->

## Verdict: APPROVE WITH CONDITIONS

Three critical issues must be resolved before implementation. The remaining observations are important but non-blocking -- they can be addressed during Phase 1 or early Phase 2 without architectural rework.

---

## Strengths

- **The numbered routing precedence (finding #5) is genuinely well-designed.** Five tiers (override -> exact -> alias -> trigger -> default) with explicit numbered priority is one of the most reliable patterns for getting Claude to follow classification logic deterministically. The existing 12-step orchestrator SKILL.md proves this project already knows how to write multi-step protocols Claude will follow. The dojo plan inherits that discipline.

- **The explicit YAML frontmatter slot map (finding #11) is the right call.** Removing the implicit H2-to-snake_case inference and replacing it with a declared contract is exactly the kind of thing that prevents silent runtime failures. Claude is good at reading structured frontmatter and using it as a lookup table. This is a meaningful improvement over the original slot contract spec.

- **Scoping v1 to 2 modes was wise.** Five modes would have created a combinatorial testing burden (5 modes x 9 patterns x voice variants) that would guarantee some paths were never exercised. Two modes (Sensei + Reference) with two voices (Miyagi + Jarvis) means every path can actually be tested. The 29-test matrix is credible at this scope.

- **The breadcrumb + envelope sandwich structure is pragmatic.** Line 1 for humans, last section for machines, prose in between. This avoids the common trap of either sacrificing human readability for machine parseability or vice versa.

---

## Critical Issues

### C1: Slot name mismatch between pattern frontmatter, slot contract, and mode templates

This is the single most likely source of silent failures at inference time.

Three different artifacts define three different sets of slot names:

**Slot contract spec** (`docs/plans/agentic-dojo-skill/specs/slot-contract-spec.md`, lines 19-31): Required H2 sections include `Key Rules`, `Failure Modes`, `Tradeoffs`, `Source Anchors`.

**Pattern frontmatter template** (remediation plan, finding #11, lines 266-276): Slot map includes `traps_and_pitfalls`, `minimal_example`, `one_liner` -- none of which appear in the slot contract's required list. Missing from frontmatter: `key_rules`, `failure_modes`, `tradeoffs`, `source_anchors`.

**Mode templates** (`mode-sensei.md` line 21, `mode-reference.md` lines 17-20): Reference uses `{{pattern.key_rules}}`, `{{pattern.failure_modes}}`, `{{pattern.tradeoffs}}`. Sensei uses `{{pattern.failure_modes}}`. None of these keys exist in the proposed frontmatter slot map.

At runtime, Claude will execute step 3d ("Validate: all `{{pattern.*}}` keys in the mode's synthesis template exist in the pattern's slot map"), find that `key_rules`, `failure_modes`, and `tradeoffs` are missing from every pattern file's frontmatter, and emit MISSING_SLOT warnings on every single invocation. This means either (a) every response will have warnings, or (b) Claude will silently skip the validation step to avoid the warnings, which defeats the purpose.

**Fix:** Create one canonical slot name registry. Reconcile the three sources into a single table. The frontmatter `slots` map must contain every key that any mode template references. The slot contract's required H2 list must match the frontmatter's heading references. Specifically:
- `failure_modes` (from modes) must map to `## Failure Modes` (from slot contract), not `## Traps & Pitfalls` (from frontmatter template)
- `key_rules` (from Reference mode) must map to `## Key Rules` (from slot contract) -- it's missing from the frontmatter entirely
- `tradeoffs` (from Reference mode) must map to `## Tradeoffs` (from slot contract) -- also missing from frontmatter
- Decide whether `traps_and_pitfalls`, `minimal_example`, and `one_liner` are real slots or were errors in the frontmatter draft

### C2: Mode alias resolution is architecturally ambiguous

The plan defines override syntax in routing step 1: "Parse for `<mode>:` prefix." The aliases are listed in finding #5b: `sensei:` OR `explain:`, `reference:` OR `lookup:`.

But the plan also defines an alias table in Step 2 for pattern fuzzy matching. The word "alias" is now overloaded -- it means two different things in two adjacent steps.

Worse, the SKILL.md template at `docs/plans/agentic-dojo-skill/templates/skill.template.md` Step 1 table shows "Query Signals -> Mode -> Read" but has no column for mode aliases. The mode alias resolution must happen inside Step 1, but the template doesn't show where.

**Fix:** Make the mode alias table explicit in Step 1 of the SKILL.md template. Add a sub-instruction: "Step 1a: If `$ARGUMENTS` starts with a known prefix (see Mode Alias Table), strip the prefix and use the mapped mode. Step 1b: Otherwise, classify mode using trigger words." The Mode Alias Table should be a separate, clearly labeled table within Step 1:

```
| Prefix | Mode |
|--------|------|
| sensei: | sensei |
| explain: | sensei |
| reference: | reference |
| lookup: | reference |
```

This eliminates the ambiguity between "mode aliases" and "pattern aliases."

### C3: Step 3d runtime validation is unreliable and should be a static guarantee

The plan asks Claude to perform runtime template parsing at step 3d: extract all `{{pattern.*}}` references from a mode's synthesis template, cross-reference them against YAML frontmatter, and emit warnings. This is asking an LLM to execute a regex-like operation on free-text markdown at inference time.

Claude can do this when explicitly focused on it. But step 3d is sandwiched between six other sub-steps. In practice, Claude will treat the numbered chain as a velocity signal -- it will want to move quickly through steps 3a-3g. The validation step (3d) is the most likely to be skimmed or skipped because it's a detour from the happy path (read, read, read, synthesize).

The evidence from the existing orchestrator SKILL.md is informative: that protocol has 12 steps with no "validate intermediate state" steps. Every step is a forward action (parse, classify, dispatch, report). The dojo plan inserts a backward-looking validation step into a forward-moving chain, which is structurally unusual for this codebase's prompting patterns.

**Fix:** Convert 3d from a runtime validation to a static guarantee enforced during pattern file creation (Phase 3). Add a checklist to Phase 3: "For each pattern file, verify that its frontmatter `slots` map contains every key referenced by mode-sensei.md and mode-reference.md synthesis templates." Then simplify 3d to: "If a `{{pattern.*}}` key has no content under its mapped heading, substitute '[Not documented]' and continue." This shifts the burden from inference-time parsing to authoring-time verification, which is far more reliable.

---

## Important Observations

### I1: "No prior human turn" detection is not feasible in Claude Code skills

Finding #2 (zero-state UX) specifies: "if `$ARGUMENTS` is empty AND conversation has no prior human turn (agent context), emit agent format."

Claude Code skills receive `$ARGUMENTS` from the command invocation. They do not have a reliable API to inspect conversation history or determine whether the invoker is a human or another agent. The skill executes in a fresh context -- it sees the SKILL.md prompt and `$ARGUMENTS`, nothing else.

**Fix:** Drop the "no prior human turn" heuristic. Instead, use an explicit signal: if the invoking command passes a flag or keyword (e.g., `$ARGUMENTS` starts with `--agent` or `--json`), emit agent format. Otherwise, emit human format. The `/advisor` command could include `--agent` in its cross-skill handoff. Human users would never type `--agent` naturally.

### I2: Fuzzy pattern matching for multi-word aliases needs a defined matching strategy

The alias table includes multi-word entries: `"spec, plan file"` maps to `spec-as-source-of-truth`. The plan doesn't specify matching semantics. Is each alias entry comma-separated (meaning "spec" OR "plan file" each independently match)? If so, "plan" alone as a substring of "plan file" could match, which would be wrong.

**Fix:** Use comma-separated individual aliases, not phrases. Rewrite the alias table to make every alias a single token or hyphenated slug: `spec`, `plan-file`, `source-of-truth` -> `spec-as-source-of-truth`. Explicitly state in SKILL.md: "Each alias is matched as a complete word or hyphenated phrase. Substring matching is not used."

### I3: Confidence calculation has no defined home in the sequential chain

The envelope includes `confidence: high/medium/low` with rules defined in finding #14 (line 339): high = explicit override or exact match, medium = trigger word, low = default fallback. But the confidence is determined during Steps 1-2 (classification), not during Step 3 (synthesis).

**Fix:** Add a metadata accumulation instruction between Step 2 and Step 3: "After classification, record: `route_mode`, `route_pattern`, `route_confidence` (high if override/exact, medium if trigger-word, low if default). Carry these values into Step 3 for inclusion in the output envelope." This makes the data flow explicit.

### I4: The "Did you mean X?" suggestion for unknown patterns is under-specified

The error contract says "Suggest closest alias match" but doesn't define "closest." Claude will use semantic similarity, which is fine for many cases but inconsistent. "wav" might suggest "wave-computation" one time and not the next.

**Fix:** Specify the matching strategy as prefix-first: "If the input is a prefix of exactly one alias or slug, suggest that. Otherwise, list all available patterns without suggesting a specific one." Prefix matching is deterministic and easy for Claude to execute.

---

## Nice-to-Haves

### N1: Add a "dry run" flag for the test harness

The test harness at `scripts/test-routing.sh` runs full synthesis for each of 29 tests. That's expensive. A `--dry-run` mode that emits only the breadcrumb and envelope (skipping synthesis) would cut cost by roughly 80% and make the routing tests viable for frequent re-runs.

### N2: Consider frontmatter `voice_id` in mode files

The mode files currently use an `## Voice ID` H2 section. Step 3a says "Extract `voice_id` from its frontmatter." But mode files don't have YAML frontmatter -- they have H2 sections. Either add YAML frontmatter to mode files (consistent with the pattern file approach) or change 3a to say "Extract Voice ID from the mode file's `## Voice ID` section." Currently these contradict.

### N3: The voice `## Substitutions` section is clever but hard to enforce

`voice-miyagi.md` line 39: "Replace 'optimize' with 'refine'". Claude will sometimes follow word-level substitution rules, sometimes not. It depends on whether the synthesis output naturally contains the trigger word. For v1, this is fine as a soft hint. Just don't test for it -- it will produce flaky results.

---

## Questions for the Author

1. **On C1 (slot mismatch):** Was the frontmatter template in finding #11 intended to replace the slot contract's H2 list, or was it drafted independently? The two lists look like they were written by different people at different times. Which one is canonical?

2. **On workspace-relative paths (finding #18):** The plan says to "verify during Phase 1 that Claude Code resolves these correctly." What's the fallback if it doesn't? The plan mentions symlinks, but Claude Code skills using the Read tool typically need real filesystem paths. Has the `../../references/patterns/` path actually been tested in a skill context, or is this still theoretical?

3. **On the test harness:** Each `claude -p` call costs real tokens. At 29 tests, even with a fast model, that's a non-trivial cost per run. Is there a budget ceiling? Would you accept a reduced smoke test (5-7 tests covering critical routing paths) for frequent runs, with the full 29 reserved for pre-release validation?

4. **On the Pattern Advisor scoring mechanism (Phase 5):** The advisor SKILL.md "scores each pattern against plan characteristics using When To Use and Signals & Diagnostics slots." But the scoring algorithm is entirely undefined. Claude will use vibes-based ranking, which may be fine for v1 but means advisor results are non-reproducible. Is that acceptable, or do you want even a lightweight rubric (e.g., "count how many When To Use bullets match the plan description")?

5. **On the envelope as "last section":** If Claude's synthesis output includes a code block (which Reference mode's YAML output will), and then the envelope is also a YAML code block, a downstream parser looking for "the last YAML code block" will find the envelope. But if the envelope isn't the last code block (e.g., Claude appends a closing remark after it), the parser breaks. Is there a sentinel or fence that marks the envelope unambiguously? Consider using a unique delimiter like `---dojo-envelope---` above the YAML.
