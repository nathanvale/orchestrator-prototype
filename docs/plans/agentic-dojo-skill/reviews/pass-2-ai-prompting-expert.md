# Staff Engineer Review: Agentic Dojo Remediation Plan

<!-- Pass 2 of 3 | Persona: AI Prompting Expert #2 -->

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

---

## Verdict: APPROVE WITH CONDITIONS

---

## Strengths

- **The HOP purity principle is correct and worth defending.** Keeping SKILL.md free of mode-specific logic means the prompt's core routing table never grows when you add modes. This is the single most important architectural decision in the plan -- it keeps the SKILL.md stable as the system scales.

- **Sequential dependency chain (3a-3g) with explicit file reads is the right structure for a tool-less synthesis flow.** By forcing Claude to read files in a defined order, you create implicit "checkpoints" even without tool-call anchors. The chain gives Claude a reason to pause and accumulate context deliberately rather than generating from its prior.

- **v1 scope discipline (2 modes, 2 voices, 9 patterns) is appropriate.** This is enough to validate the HOP architecture without drowning in combinatorial testing. The 2x2 matrix (Sensei/Reference x Miyagi/JARVIS) gives 4 voice+mode combinations, which is testable.

---

## Critical Issues

### C4: The 3a-3g chain lacks explicit "stop and read" boundaries -- Claude will fuse steps

The orchestrator SKILL.md works because each step ends with a tool call (`TaskCreate`, `Bash`, `Read`). Tool calls are hard boundaries -- Claude literally cannot continue until the tool returns. The dojo's 3a-3g chain has Read calls at 3a, 3b, 3c, but steps 3d-3g are pure inference with no tool calls. That means 3d (validate slots), 3e (apply voice), 3f (execute template), and 3g (format envelope) will fuse into a single generation pass.

This matters because step 3e (voice application) needs to happen DURING 3f (template execution), not as a separate prior step. Claude cannot "apply voice rules" as a discrete operation and then separately "execute the template." It will do both simultaneously, which means voice rules compete with template structure for attention.

**Fix:** Restructure 3d-3g into two phases, not four. Phase A: "You now have mode, voice, and pattern content. Validate that all {{pattern.*}} references resolve." Phase B: "Generate the response following the mode template, in the voice specified, with YAML envelope last." Two clear instructions instead of four overlapping ones. Trying to make Claude treat voice application and template execution as separate sequential steps is fighting how generation actually works.

### C5: Template substitution will break on multi-line pattern content -- the instruction/data boundary collapses

The Sensei template says: `"Concept: {{pattern.core_mechanism}}"`. When `core_mechanism` expands to something like "The builder-validator pattern separates write and read agents. The builder modifies files within strict boundaries. The validator checks the result read-only and reports PASS or FAIL with specific line references..." -- Claude now sees `Concept: The builder-validator pattern separates write and read agents. The builder modifies files...` in its context.

Claude will NOT reliably treat this as "the label 'Concept' followed by data to present verbatim." It will treat the expanded content as part of its instruction context and may paraphrase, reorder, or editorialize. This is a well-known failure mode with template expansion in prompts: once data enters the instruction stream, Claude processes it as instruction.

**Fix:** Do not use inline template substitution. Instead, structure the mode template as a section-ordering instruction that references slots by name without inlining their content. Example:

```
Generate these sections in order:
1. One-sentence analogy
2. "Summary" section using the pattern's Quick Summary slot
3. "How It Works" section using the pattern's Core Mechanism slot
4. "Steps" section using the pattern's Implementation Notes slot
5. "Watch Out" section using the pattern's Failure Modes slot
6. "See Also" section using the pattern's Related Patterns slot
```

This keeps the template as pure structure and lets Claude pull from the pattern file content it already has in context. The slot names act as pointers, not as containers that get expanded inline.

### C6: Two YAML blocks in Reference mode will cause parse ambiguity

Reference mode emits YAML as primary content, then the envelope is also YAML. A downstream parser looking for the envelope by scanning for the last YAML block will grab the right one -- but only if the content YAML and envelope YAML are separated unambiguously. The plan doesn't specify a separator.

Consider what Reference mode output looks like:

```
[Reference | Builder-Validator]

```yaml
summary: "Separates write and read agents..."
use_when: "Any task that modifies files..."
...
```

The builder-validator pattern is the foundational separation...

```yaml
confidence: high
mode: reference
pattern: builder-validator
voice: jarvis
```
```

That works IF there's always prose between the two YAML blocks. But what if the pattern content is thin and Claude decides the prose paragraph is unnecessary? Then you get two adjacent YAML blocks with no separator.

**Fix:** Make the envelope use a distinctive fence that cannot collide with content YAML. Use `<!-- envelope -->` as an HTML comment marker before the envelope block, or use a different format (JSON, or a custom delimiter like `---envelope---`). Alternatively, make the envelope a fenced code block with a specific info string: ` ```envelope ` instead of ` ```yaml `.

---

## Important Observations

### I5: Accumulation order bias -- the last file read gets disproportionate attention

When Claude reads three files in sequence (3a: mode, 3b: voice, 3c: pattern), the pattern file is read last and will be freshest in context. This creates a recency bias: pattern content gets more faithful reproduction than voice rules (read second) or mode template structure (read first). In practice, this means voice instructions are the most likely to be under-applied, because they sit in the middle of the context sandwich.

The mode template is the structural backbone and should be read LAST so it's freshest when Claude begins generation. The pattern content is data to be presented and should be read FIRST (furthest from generation, treated more as reference). Voice should be read second.

**Suggested reorder:** 3a: pattern file (data, read early), 3b: voice file (style, read middle), 3c: mode file (structure, read last and freshest when generation begins).

### I6: The error contract doesn't cover partial pattern matches

The 4 error cases are: unknown mode, unknown pattern, missing slot, ambiguous match. But what about the case where a user says "tell me about dispatch" and there are two patterns with similar names? The "ambiguous match" case presumably covers this, but the plan only shows ambiguous MODE matching, not ambiguous PATTERN matching. The pattern alias table has multi-word entries but no specification for what happens when a keyword matches multiple patterns with similar confidence.

**Suggested fix:** Explicitly define pattern disambiguation as a sub-case of the ambiguous match error, with the instruction to list matching patterns and ask the user to pick one.

### I7: Confidence field has no downstream consumer in v1

The envelope includes a `confidence: high|medium|low` field, determined during classification. But nothing in the plan consumes this field. The test harness checks breadcrumbs and YAML structure, not confidence accuracy. The Pattern Advisor doesn't read it. No downstream agent uses it.

Carrying an unconsumed field through every response adds cognitive load to the SKILL.md (Claude must calculate it) without benefit. In v1, either cut it or define one concrete consumer (e.g., the test harness asserts that exact pattern matches produce `high` confidence and alias matches produce `medium`).

### I8: "What This Skill Does NOT Do" section placement matters

This section is listed as the last block in the SKILL.md. But Claude processes instructions with a primacy-recency bias -- it pays most attention to the beginning and end of the prompt. Placing negative constraints ("does NOT generate code", "does NOT modify files") at the very end gives them high salience, which is good. But it also means Claude's last instruction before generating is a list of DON'Ts. Ending on negative constraints can make Claude overly cautious and hedging in its responses.

**Suggested fix:** Move "What This Skill Does NOT Do" to just before the synthesis chain (Step 3), so Claude processes it as a guardrail before generation starts, but the LAST thing it reads is the envelope format spec -- a positive, structural instruction about what to produce.

---

## Nice-to-Haves

### N4: Add a "worked example" to the SKILL.md

The orchestrator SKILL.md succeeds partly because each step is concrete ("Create tasks using TaskCreate"). The dojo SKILL.md is more abstract ("execute the mode synthesis template in the specified voice"). A single worked example at the end -- showing input query, classification result, files read, and output structure -- would anchor Claude's understanding better than any amount of abstract instruction. Even 15-20 lines showing one concrete Sensei+Miyagi+builder-validator trace would help.

### N5: Voice substitution rules should use a lookup table, not prose

The plan mentions voice files include "Substitutions" (e.g., Miyagi replaces "optimize" with "refine"). Prose-format substitution rules ("Replace X with Y") are unreliable -- Claude applies them inconsistently. A simple two-column table (`| Instead of | Use |`) would be more reliably followed because Claude can pattern-match against a table during generation more easily than against prose instructions.

### N6: Consider making the breadcrumb a fenced comment rather than visible text

The breadcrumb `[Sensei | Builder-Validator]` is useful for testing and parsing, but it's visible to the human user. For a teaching skill, the first line being a metadata tag rather than engaging content creates a cold opening. If the breadcrumb is primarily for machine parsing (test harness, downstream agents), consider making it an HTML comment `<!-- [Sensei | Builder-Validator] -->` so it's parseable but invisible in rendered markdown.

---

## Questions for the Author

1. **On step 3d validation at inference time** -- Even if you move validation to authoring time (per Pass 1 C3), how do you enforce it? Is there a CI check that parses pattern frontmatter slot maps against mode template references? If not, this is just a convention that will drift. What's the enforcement mechanism?

2. **On the Pattern Advisor's scoring without loading all 9 files** -- The plan says the advisor loads 3 pattern files, but must score all 9. The only way to do this without loading all 9 is to have a summary index file (like a table of contents with one-line descriptions per pattern). Does the plan include creating such an index? If the SKILL.md's pattern classification table IS the index, that's clever but means the advisor skill needs to reference the dojo SKILL.md, creating a coupling between skills.

3. **On voice file size at 40 lines** -- Voice files are small, which is good for context efficiency. But 40 lines must contain: voice rules, pacing rules, lexicon constraints, do/don't lists, quote policy, signature phrases, and substitution tables. That's 7 concern types in 40 lines, averaging ~5 lines each. Are you confident that 5 lines per concern type is enough for Claude to reliably apply the voice? In my experience, voice instructions need at minimum 3-4 concrete examples per rule to be consistently followed. A 40-line voice file with zero examples will produce inconsistent voice application.

4. **On the test harness design** -- The plan uses `claude -p --output-format json` with breadcrumb assertions. This tests structure but not content quality. How do you plan to test that Sensei mode actually teaches (explains concepts, uses analogies) vs. Reference mode actually references (emits YAML, terse prose)? Structural assertions alone won't catch a Reference-mode response that accidentally reads like a Sensei tutorial. Do you have a plan for semantic assertions, even manual ones?

5. **On the 150-200 line SKILL.md estimate** -- The orchestrator SKILL.md is 710 lines and handles 12 steps with tool-call anchors. The dojo SKILL.md is 150-200 lines handling 10 instruction block types with no tool-call anchors. Line count isn't the right metric -- instruction density is. Have you considered that the dojo SKILL.md might actually need to be LONGER than the orchestrator's, specifically because it lacks tool-call structure and needs more explicit "stop here and do X before continuing" markers to compensate?

6. **On the `--agent` flag for zero-state detection** -- Pass 1 flagged that conversation history isn't available (I1). The `--agent` flag solution works, but it means the command file needs to support flag parsing. Does the `/dojo` command wrapper currently handle flags, or does this require new infrastructure? If flags aren't supported, a simpler approach might be a separate command (`/dojo-agent`) that sets a context variable.
