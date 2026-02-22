# Staff Engineer Review: Agentic Dojo Remediation Plan

<!-- Pass 3 of 3 | Persona: DX Expert -->

## Prior Review Summary

### Pass 1: AI Prompting Expert -- Verdict: APPROVE WITH CONDITIONS

**Strengths identified:**
- Numbered routing precedence is well-designed for deterministic classification
- Explicit YAML frontmatter slot map prevents silent runtime failures
- v1 scope to 2 modes is wise
- Breadcrumb + envelope sandwich is pragmatic

**Issues found:**

Critical:
- C1: Slot name mismatch across pattern frontmatter, slot contract, and mode templates
- C2: Mode alias resolution architecturally ambiguous
- C3: Step 3d runtime validation unreliable -- should be static guarantee

Important:
- I1: "No prior human turn" detection infeasible -- needs explicit --agent flag
- I2: Multi-word fuzzy aliases need defined matching semantics
- I3: Confidence calculation has no home in 3a-3g chain
- I4: "Did you mean X?" algorithm under-specified

Nice-to-haves:
- N1: Dry-run flag for test harness
- N2: Mode files reference voice_id in frontmatter but use H2 sections
- N3: Voice substitution rules are soft hints

### Pass 2: AI Prompting Expert #2 -- Verdict: APPROVE WITH CONDITIONS

**Strengths identified:**
- HOP purity principle is correct and worth defending
- Sequential dependency chain with explicit file reads creates implicit checkpoints
- v1 scope discipline is appropriate

**Issues found:**

Critical:
- C4: Steps 3d-3g lack tool-call boundaries and will fuse into single generation pass
- C5: Template substitution breaks on multi-line content -- instruction/data boundary collapses
- C6: Two YAML blocks in Reference mode create parse ambiguity

Important:
- I5: File read order creates recency bias -- reorder: pattern -> voice -> mode
- I6: Error contract doesn't cover partial pattern matches
- I7: Confidence field has no downstream consumer in v1
- I8: "What This Skill Does NOT Do" placement at end creates overly cautious generation

Nice-to-haves:
- N4: Add worked example to SKILL.md
- N5: Voice substitution should use lookup table, not prose
- N6: Consider making breadcrumb an HTML comment

---

## Verdict: APPROVE WITH CONDITIONS

---

## Strengths

- **Default-to-Sensei is the right call.** Developers reaching for `/dojo` are curious, not looking up a reference card. Making the teaching mode the default means the most common invocation (`/dojo wave computation`) just works without mode keywords. This removes one decision from every interaction.

- **The advisor-to-dojo handoff with copy-paste commands is genuine DX gold.** Most cross-skill workflows fail because they require the user to mentally translate output from one tool into input for another. Emitting literal `/dojo explain wave-computation` commands eliminates that translation step entirely. This is the kind of detail that separates "neat demo" from "daily driver."

- **The 12-line zero-state respects terminal real estate.** Developers invoke help commands in the middle of work. A zero-state that dumps 40 lines of documentation breaks flow. Keeping it compact enough to fit in a single terminal viewport without scrolling is a conscious DX choice and the right one.

- **Alias table with short-form slugs (`dag`, `spec`, `wave`, `hop`) shows empathy for typing ergonomics.** The most-used patterns get the shortest aliases. This is the kind of thing that only matters after your 50th invocation, but that is exactly when DX quality compounds.

---

## Critical Issues

### C7: No `/dojo help` or `/dojo list` escape hatch for the "I know the skill exists but forgot the syntax" moment

The zero-state fires on empty input. But there is a common middle state: the developer remembers `/dojo` exists, vaguely remembers the pattern they want, but cannot recall the slug or mode keyword. They will type things like:

- `/dojo help`
- `/dojo list`
- `/dojo patterns`
- `/dojo ?`

None of these match a pattern or mode. They will hit the "unknown pattern" error path, which suggests "did you mean X?" based on fuzzy matching against `help`, `list`, `patterns`, or `?`. The fuzzy matcher will return nonsense suggestions (e.g., `help` might fuzzy-match `higher-order-prompt` by the `h` prefix).

**The fix:** Add a reserved keyword list (`help`, `list`, `patterns`, `?`, `modes`) that triggers the zero-state output instead of routing through pattern classification. This is 3 lines in Step 2 of the routing chain -- check for reserved words before pattern matching. Without this, the most natural "I'm lost" gesture produces the least helpful response.

### C8: The 5-step author checklist for adding a pattern exists nowhere in the codebase

Adding pattern #10 requires touching 5 locations across 3 files:

1. Write a source doc in `docs/patterns/`
2. Create a pattern file in `.claude/references/patterns/` with correct frontmatter
3. Add a row to SKILL.md Step 2 pattern classification table
4. Add aliases to the SKILL.md Step 2 alias table
5. Add the slug to the zero-state pattern list

The plan documents the file structure and the slot contract, but there is no `CONTRIBUTING.md`, no checklist comment in SKILL.md, and no validation script that checks all 5 touch points are consistent.

This is a critical DX issue because the failure mode is silent. If a maintainer adds the pattern file but forgets to update the SKILL.md alias table, the pattern exists but is unreachable by short alias. No error is thrown. The maintainer may not discover the gap until a user reports it weeks later.

**The fix:** Add a `## Adding a New Pattern` section to the project CLAUDE.md (3-5 lines, numbered checklist). Optionally, add a `scripts/validate-patterns.sh` that cross-references pattern files against the SKILL.md tables and zero-state list. The script is a nice-to-have; the checklist is a must.

### C9: No way to diagnose routing decisions after the fact

When a user says "it gave me Sensei but I wanted Reference," there is no artifact to inspect. The breadcrumb tells you what was chosen but not why. The test harness validates breadcrumb structure, not routing reasoning.

For a developer maintaining the skill, the debugging loop is: (1) reproduce the invocation with `claude -p`, (2) read the output, (3) guess which step in the routing chain went wrong, (4) tweak SKILL.md, (5) run `claude -p` again ($0.01-0.05 per attempt, 10-30 seconds latency).

This inner loop is too slow and too opaque for iterative development.

**The fix:** Add a `--verbose` or `--trace` flag to the test harness (not the skill itself) that captures the full model output (including any reasoning about mode selection) and writes it to a log file. When a routing test fails, the developer can read the trace instead of re-running the invocation. This does not require changes to SKILL.md -- it is purely a test harness enhancement. Even just saving the raw JSON response from `claude -p --output-format json` to `test-results/<test-name>.json` would be sufficient.

---

## Important Observations

### I9: The model choice (sonnet) creates an unspoken quality ceiling for Sensei mode

The plan specifies `model: sonnet` for the dojo command. Sensei mode is a teaching mode -- it needs to explain concepts clearly, adapt to different levels of understanding, and make analogies. This is the kind of task where model capability directly translates to perceived skill quality.

The orchestrator uses `model: opus`. A developer who uses both will experience a quality delta. They will not attribute this to the model -- they will attribute it to the skill. "The orchestrator is great but the dojo feels shallow" is a likely sentiment, and the maintainer will spend hours tweaking voice files and mode templates trying to fix what is fundamentally a model capability gap.

**Recommendation:** Document the model choice rationale explicitly in the command file as a comment. If cost is the driver (sonnet is cheaper for a frequently-invoked knowledge tool), say so. If the maintainer later upgrades to opus and the teaching quality improves, they will understand why. The worst outcome is a maintainer debugging voice prompts for hours when the real fix is changing one YAML field.

### I10: The alias table is not discoverable from the zero-state

The zero-state lists patterns by full slug: `wave-computation`, `spec-as-source-of-truth`, etc. A user who sees this will type full slugs. They will never discover that `wave`, `spec`, or `dag` work unless they (a) read the SKILL.md internals or (b) get lucky.

The alias table is a power-user feature with zero discoverability. This is not a blocking issue -- full slugs always work -- but it means the ergonomic investment in aliases delivers zero value until the user somehow learns about them.

**Recommendation:** Add a parenthetical to the zero-state examples section:

```
Examples:
  /dojo explain wave computation    (aliases: wave, dag, spec, hop...)
  /dojo lookup retry-with-resume
```

One line. Costs 1 line of the 12-line budget. Signals that short forms exist without documenting all of them.

### I11: "source of truth" as natural language input will fail silently

A user who reads the zero-state sees `spec-as-source-of-truth`. A reasonable attempt is `/dojo explain source of truth`. The plan's fuzzy matching uses prefix matching on slugs. `source` does not prefix-match `spec-as-source-of-truth` (which starts with `s-p-e-c`). It might prefix-match nothing, or it might trigger "did you mean?" with unhelpful suggestions.

The alias `spec` solves this for users who know the alias exists. But `source of truth` is the natural language phrase a developer would use. The plan does not address natural language fragments that match a substring of the slug but not the prefix.

**Recommendation:** Add `source-of-truth` and `source` as explicit aliases in the alias table. The cost is two table rows. The payoff is catching the single most confusing slug in the entire list.

### I12: The test harness cost scales linearly and there is no way to run a subset

29 tests at $0.01-0.05 each is $0.29-1.45 per full run. During iterative development on routing logic, a maintainer might run this 10-20 times in a session. That is $3-29 per debugging session with no way to run just the 5 routing tests or just the edge cases.

**Recommendation:** Add category flags to the test harness: `test-routing.sh --happy`, `test-routing.sh --edge`, `test-routing.sh --routing`. Group tests by the categories already defined in the plan (18 happy path, 5 routing, 4 edge, 2 agent). This is a simple `case` statement in the shell script.

---

## Nice-to-Haves

### N7: The zero-state should show which patterns are available at the current stage

The codebase uses incremental stages (`stage/1-dispatch`, `stage/2-dag`, `stage/3-full`). Pattern docs are added progressively. If a user on `stage/2-dag` invokes `/dojo`, they see 9 patterns listed, but only some exist at that stage. The zero-state is static -- it does not reflect which pattern files are actually present.

A dynamic zero-state that lists only patterns with existing reference files would prevent "pattern not found" errors for patterns that have not been authored yet. This is low priority because v1 targets `stage/3-full` where all 9 exist, but it matters if the skill is ever used on earlier branches.

### N8: Consider a `/dojo compare <pattern-a> <pattern-b>` mode for v2

A common learning pattern is comparison: "How is fast-path-gate different from wave-computation?" This does not fit neatly into Sensei (which teaches one pattern) or Reference (which looks up one pattern). A comparison mode that loads two pattern files and highlights distinctions would be a natural v2 addition. Mentioning it in the "What This Skill Does NOT Do" section would set expectations.

### N9: Pattern file frontmatter should include a `one_liner` field

The zero-state lists slugs without descriptions. If each pattern file's frontmatter included a `one_liner: "Separate code-writing from code-reviewing agents"` field, the zero-state could dynamically render descriptions without hardcoding them in SKILL.md. This also makes the pattern files more self-documenting for maintainers browsing the directory.

---

## Questions for the Author

1. **Has the Sensei mode been tested with sonnet on any of the 9 patterns?** The voice file and mode template look reasonable on paper, but teaching quality is emergent -- it depends on how the model interprets the voice constraints. A single end-to-end test with sonnet on `wave-computation` (the most conceptually dense pattern) would validate whether the model/prompt combination produces genuinely useful teaching or thin paraphrasing.

2. **What happens when the advisor and dojo disagree on pattern naming?** The advisor recommends patterns based on plan descriptions and emits slugs in its "Next Steps." If a pattern is renamed or an alias changes in the dojo but the advisor's SKILL.md is not updated in sync, the advisor will emit broken `/dojo` commands. Is there a single source of truth for the slug-to-pattern mapping, or is it duplicated across both skills?

3. **Who is the primary audience for Sensei mode -- someone learning orchestration patterns for the first time, or someone who built the orchestrator and wants a refresher?** The voice and depth calibration depend heavily on this. A newcomer needs analogies and motivation. A maintainer needs "remind me how wave indexing works." These are different pedagogical modes wearing the same "Sensei" label.

4. **Is there a plan for deprecating or versioning patterns?** As the orchestrator evolves through stages 4-8, patterns may change semantically (e.g., wave-computation gains parallel execution in stage 8). Do pattern files get versioned, or does the latest version always win? A developer on `stage/3-full` reading about wave-computation should not get stage-8 semantics.

---

## Synthesis

Across three review passes, the plan has been stress-tested on prompt engineering correctness (Pass 1), LLM execution mechanics (Pass 2), and developer experience (this pass). The critical issues from Passes 1-2 center on technical ambiguity in slot naming, template substitution, and tool-call boundaries. My critical issues center on the human side: discoverability gaps (C7), maintenance fragility (C8), and debugging opacity (C9). These are complementary, not overlapping.

The residual risk after all three passes is concentrated in two areas. First, **untested model-prompt interaction**: no reviewer can predict how sonnet will actually perform on the Sensei teaching task with these specific voice constraints and slot expansions -- this can only be validated empirically (I9, and the author should do one end-to-end test before committing to the full 20-file implementation). Second, **maintenance drift between the two skills**: the advisor and dojo share a conceptual namespace (pattern slugs, mode names) but have no mechanical coupling -- a rename in one skill silently breaks the other, and no test catches this (Question 2 above). If the author addresses the critical issues from all three passes and runs at least one live end-to-end validation, the plan is ready for implementation. The accumulated review surface is thorough enough that surprises during implementation should be minor and local, not architectural.
