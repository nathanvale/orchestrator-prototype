# Hardening Plan: Agentic Dojo Skill

**Date:** 2026-02-22
**Input:** 3 review passes (2x AI Prompting Expert, 1x DX Expert)
**Scope:** Resolve 9 critical issues, accept/reject 12 important observations, triage 9 nice-to-haves

---

## Triage Decisions

Every finding gets one of four dispositions:

| Disposition | Meaning |
|-------------|---------|
| **Accept** | Incorporate the reviewer's suggested fix (or a variant) into the plan |
| **Accept (modified)** | The finding is valid but the suggested fix is wrong or overkill -- apply a different fix |
| **Defer to v2** | Valid concern, but not worth the complexity for v1 |
| **Reject** | Disagree with the finding or the risk is acceptable |

---

## Critical Issues

### C1: Slot name mismatch -- ACCEPT

**Problem:** Three artifacts define different slot names. The frontmatter template has `traps_and_pitfalls`, `minimal_example`, `one_liner`. The slot contract has `key_rules`, `failure_modes`, `tradeoffs`. The mode templates reference the slot contract names. At runtime, every invocation would emit MISSING_SLOT warnings.

**Root cause:** The frontmatter template in the remediation plan (finding #11) was drafted from scratch instead of derived from the slot contract. Two people, two lists.

**Fix:** Establish one canonical slot registry. The slot contract spec is the source of truth. The frontmatter template was wrong. The canonical pattern slot map is:

```yaml
---
slug: <pattern-slug>
display_name: <Pattern Display Name>
one_liner: <Single sentence description>
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
```

Removed from frontmatter: `traps_and_pitfalls`, `minimal_example` (these were hallucinated names not in any contract).
Added to frontmatter: `display_name`, `one_liner` (see N9 -- useful for zero-state).
Challenge Seed: excluded from v1 (per finding #9 -- deferred with Sparring/Kata).

**Files changed:**
- Remediation plan finding #11: replace frontmatter template
- Slot contract spec: add note that frontmatter `slots` map must mirror this list exactly
- Pattern file template: update to match

**Verification:** During Phase 3 (pattern authoring), cross-check every pattern file's `slots` map against mode-sensei.md and mode-reference.md synthesis templates. Every `{{pattern.*}}` key in both templates must appear in this map.

---

### C2: Mode alias resolution ambiguous -- ACCEPT

**Problem:** "Alias" means two things: mode aliases in Step 1 (`explain:` -> sensei) and pattern aliases in Step 2 (`wave` -> wave-computation). The SKILL.md template has no explicit mode alias table.

**Fix:** Split Step 1 into sub-steps with an explicit Mode Prefix Table:

```
Step 1: Classify Mode

Step 1a: Check for mode prefix override.
If $ARGUMENTS starts with any prefix in the Mode Prefix Table below,
strip the prefix (including the colon and any whitespace) and use the
mapped mode. The remaining text becomes the pattern query for Step 2.

| Prefix | Mode |
|--------|------|
| sensei: | sensei |
| explain: | sensei |
| reference: | reference |
| lookup: | reference |

Step 1b: If no prefix matched, classify mode using trigger words.
(existing trigger word table here)
```

Rename the Step 2 pattern matching table header to "Pattern Alias Table" to eliminate the overloaded term.

**Files changed:**
- Remediation plan finding #5b/5c: update routing precedence to show 1a/1b split
- SKILL.md template: add Mode Prefix Table
- Routing robustness spec: update to reflect sub-steps

---

### C3: Runtime validation unreliable -- ACCEPT (modified)

**Problem:** Step 3d asks Claude to parse mode templates at runtime, extract `{{pattern.*}}` references, cross-reference against frontmatter. This is backward-looking validation sandwiched between forward-moving synthesis steps. Claude will skip it.

**Reviewer's fix:** Move to static guarantee at authoring time.

**My modification:** Agree with moving to authoring time, but also keep a lightweight runtime fallback. The static guarantee is the primary defense. The runtime behavior is just graceful degradation.

**Fix:**
1. **Static (Phase 3 authoring checklist):** "For each pattern file, verify its `slots` map contains every key referenced by mode-sensei.md AND mode-reference.md synthesis templates." Add this as an explicit step in Phase 3.
2. **Runtime (simplify 3d):** Replace the current 3d with: "If a slot key referenced in the mode template has no content under its mapped heading in the pattern file, substitute '[Not documented for this pattern]' and continue." No template parsing. No cross-referencing. Just a graceful fallback when content is absent.

**Files changed:**
- Remediation plan finding #12: simplify step 3d
- Phase 3 description: add authoring verification checklist

---

### C4: Steps 3d-3g will fuse -- ACCEPT (modified)

**Problem:** Steps 3d (validate), 3e (breadcrumb), 3f (execute template), 3g (constrain output) are pure inference with no tool-call boundaries. They'll fuse into a single generation pass. Voice application and template execution can't be sequential -- they're simultaneous during generation.

**Reviewer's fix:** Restructure into 2 phases.

**My modification:** Three phases, not two. The Read tool calls in 3a-3c are real boundaries. After those, we need exactly ONE generation instruction, not two or four.

**Fix:** Restructure Step 3 as:

```
Step 3: Synthesize Response

3a. Read the selected pattern file.
3b. Read the voice file matching the mode's Voice ID.
3c. Read the selected mode file.
3d. Generate the response:
    - Line 1: breadcrumb [Mode | Pattern Display Name]
    - Body: follow the mode's Synthesis Template, using the pattern's
      slot content as source material (reference by slot name, do not
      expand inline). Write in the voice specified by the voice file.
      If a slot has no content, write '[Not documented for this pattern]'.
    - Last section: emit the routing envelope (see Envelope Format).
    - Do not add content, formatting, or structure beyond what the
      template and voice specify.
```

Key changes from the original 3a-3g:
- **Read order reversed** (I5 accepted): pattern first (data), voice second (style), mode last (structure -- freshest in context when generation begins)
- **Steps 3d-3g collapsed to single 3d** with sub-bullets: Claude generates one response following one composite instruction
- **Voice and template are co-applied**, not sequential -- matches how generation actually works
- **Slot references are by name** (C5 fix integrated): "using the pattern's slot content as source material" instead of inline `{{pattern.*}}` expansion in SKILL.md

**Files changed:**
- Remediation plan finding #12: rewrite Step 3 entirely
- SKILL.md template Step 3: replace with new structure

---

### C5: Template substitution breaks on multi-line content -- ACCEPT

**Problem:** When `{{pattern.core_mechanism}}` expands to paragraphs, Claude can't distinguish the template instruction from the data. It paraphrases, reorders, editorializes.

**Fix:** Mode synthesis templates must NOT use inline `{{pattern.*}}` expansion. Instead, they reference slots by name as source material instructions.

**Before (mode-sensei.md):**
```
Open with a brief analogy. Then teach using:
- Summary: {{pattern.quick_summary}}
- Concept: {{pattern.core_mechanism}}
```

**After (mode-sensei.md):**
```
Generate these sections in order:
1. Opening analogy (1-2 sentences connecting the pattern to everyday experience)
2. "Summary" -- present the pattern's Quick Summary slot
3. "How It Works" -- explain using the pattern's Core Mechanism slot
4. "In Practice" -- walk through the pattern's Implementation Notes slot
5. "Watch Out" -- list the pattern's Failure Modes slot as pitfalls
6. "See Also" -- reference the pattern's Related Patterns slot
```

Claude reads the pattern file in 3a, holds the content in context, and uses the mode template as a structural guide for what to pull from where. The slot names are pointers, not containers.

**Files changed:**
- mode-sensei.md: rewrite Synthesis Template as section-ordering instructions
- mode-reference.md: rewrite Synthesis Template similarly (YAML keys as structural guide)
- mode-advisor.md: same treatment
- Slot contract spec: add note that synthesis templates reference slots by name, not by inline expansion

---

### C6: Two YAML blocks in Reference mode -- ACCEPT

**Problem:** Reference mode emits content YAML, then envelope YAML. If Claude skips the prose paragraph between them, two adjacent YAML blocks are ambiguous for parsers.

**Fix:** Use a distinctive info string for the envelope code fence. The envelope is always:

````
```dojo-envelope
mode_selected: reference
pattern_selected: wave-computation
confidence: high
warnings: []
```
````

The content YAML in Reference mode uses `yaml` as its info string. The envelope uses `dojo-envelope`. No parser ambiguity. Claude is told "emit the envelope in a code block with info string `dojo-envelope`" -- concrete, unambiguous.

**Files changed:**
- Remediation plan finding #14: update envelope format spec
- SKILL.md template: update envelope section
- mode-reference.md: clarify that content YAML uses ```yaml, envelope uses ```dojo-envelope
- Test harness: grep for `dojo-envelope` instead of scanning for last YAML block

---

### C7: No help/list escape hatch -- ACCEPT

**Problem:** `/dojo help`, `/dojo list`, `/dojo ?` all fall through to pattern matching and produce nonsense suggestions.

**Fix:** Add a reserved keyword check as Step 0 (before mode classification):

```
Step 0: Reserved Keywords

If $ARGUMENTS matches any of: help, list, patterns, modes, ?
Then emit the zero-state output (same as empty $ARGUMENTS) and stop.
```

Three lines in the SKILL.md. No complexity. Handles the "I'm lost" gesture before any routing logic runs.

**Files changed:**
- SKILL.md template: add Step 0 before Step 1
- Remediation plan: update routing precedence to include Step 0
- Zero-state UX spec: note that reserved keywords trigger zero-state

---

### C8: No author checklist for adding patterns -- ACCEPT

**Problem:** Adding pattern #10 requires 5 changes across 3 files. No checklist. Silent failure when steps missed.

**Fix:** Add a `## Adding a New Pattern` section to the project `.claude/CLAUDE.md`:

```markdown
## Adding a New Pattern

1. Write source doc in `docs/patterns/<slug>.md`
2. Create `.claude/references/patterns/pattern-<slug>.md` with YAML frontmatter
   (copy an existing pattern file as template -- verify `slots` map matches
   slot contract)
3. Add keyword row to `.claude/skills/agentic-dojo/SKILL.md` Step 2 pattern table
4. Add aliases to SKILL.md Step 2 alias table
5. Add slug to SKILL.md zero-state pattern list
6. If Pattern Advisor exists: verify advisor SKILL.md can score the new pattern
```

Also add step 6 (advisor sync) since the two skills share the pattern namespace.

**Files changed:**
- `.claude/CLAUDE.md`: add section in Phase 1
- Remediation plan Phase 3: reference the checklist

---

### C9: No routing diagnostics -- ACCEPT (modified)

**Problem:** Breadcrumb shows what was chosen but not why. Test harness can't diagnose misroutes.

**Reviewer's fix:** Add --verbose flag to test harness that saves raw JSON.

**My modification:** The test harness should ALWAYS save raw output on failure (not just with a flag). On success, discard. This is zero-config -- the developer doesn't need to remember to pass --verbose when debugging a failure.

**Fix:**
1. Test harness auto-saves failed test output to `test-results/<test-name>.json`
2. On PASS: print one line, don't save
3. On FAIL: print failure line + save full JSON response to file
4. At end: if any failures, print `See test-results/ for full output`
5. Create `test-results/` dir, add to `.gitignore`

Additionally, the envelope already contains `confidence` and `warnings` fields. Add a `route_reason` field to the envelope:

```yaml
route_reason: "trigger-word: explain"  # or "prefix-override: sensei:", "exact-slug", "alias: wave", "default"
```

This is one field in the envelope -- Claude already knows which routing path it took. Minimal cognitive load to emit it. And it makes the test harness's failure diagnostics actionable: "expected Reference but got Sensei because route_reason was 'trigger-word: explain'."

**Files changed:**
- Remediation plan finding #14: add `route_reason` to envelope spec
- Test harness design: auto-save on failure, print diagnostic path
- `.gitignore`: add `test-results/`

---

## Important Observations

### I1: Agent detection infeasible -- ACCEPT (modified)

**Problem:** Skills can't detect "no prior human turn."

**Reviewer's fix:** `--agent` flag or separate `/dojo-agent` command.

**My fix:** Simpler -- just always emit the human format for zero-state. Agents that need structured pattern data should invoke `/dojo lookup <pattern>` which returns structured YAML. An agent that needs the pattern list can parse the human zero-state easily enough (it's a simple text list). The agent zero-state format solves a problem that doesn't exist in v1 -- no agent is invoking `/dojo` with empty args.

**Disposition:** Remove agent zero-state detection entirely from v1. If needed later, add `--json` flag.

### I2: Multi-word alias matching -- ACCEPT

**Fix:** Rewrite all aliases as single tokens. The comma in `"spec, plan file"` becomes two separate rows: `spec` -> `spec-as-source-of-truth` and `plan-file` -> `spec-as-source-of-truth`. Add to SKILL.md: "Each alias is matched as a complete word. No substring matching."

### I3: Confidence calc has no home -- ACCEPT

**Fix:** Integrated into C9's `route_reason` field. The confidence is derivable from route_reason:
- `prefix-override:*` or `exact-slug` -> high
- `trigger-word:*` or `alias:*` -> medium
- `default` -> low

Add a note to the envelope spec: "Derive `confidence` from `route_reason`. Prefix-override and exact-slug are high. Trigger-word and alias are medium. Default is low."

### I4: "Did you mean?" under-specified -- ACCEPT

**Fix:** Specify in error contract: "If the input is a prefix of exactly one slug or alias, suggest it. Otherwise, list all available patterns without a specific suggestion." Deterministic. Easy for Claude.

### I5: File read order bias -- ACCEPT

**Fix:** Already integrated into C4. Read order: pattern (3a) -> voice (3b) -> mode (3c). Mode template is freshest in context when generation begins.

### I6: Error contract missing pattern disambiguation -- ACCEPT

**Fix:** The existing "Multiple patterns detected" error case covers this. Clarify: "If a keyword matches multiple patterns in the alias table, list the matches and ask the user to pick one. Do not auto-select." This is a clarification of the existing error case, not a new one.

### I7: Confidence field has no consumer -- ACCEPT (modified)

**Problem:** Confidence is calculated but nothing reads it.

**Fix:** The test harness becomes the consumer. Add confidence assertions to the routing tests:
- `assert_route "explain wave computation" "Sensei" "Wave Computation" "high"` (trigger word -> medium? No -- "explain" is a mode trigger, and "wave computation" matches an alias. Both signals present -> medium)
- Actually, this gets complicated. The reviewer is right that confidence adds cognitive load.

**Revised fix:** Keep `route_reason` (concrete, useful for debugging). Drop `confidence` from v1 envelope. It's derivable from route_reason if ever needed. One less thing for Claude to calculate, one less thing to test.

### I8: "Does NOT" section placement -- ACCEPT

**Fix:** Move "What This Skill Does NOT Do" to between Step 2 and Step 3. The SKILL.md ends with the envelope format spec -- a positive structural instruction.

### I9: Sonnet model quality ceiling -- ACCEPT

**Fix:** Add a comment to the command file:

```yaml
---
description: Query the Agentic Dojo for pattern knowledge
argument-hint: "e.g. 'explain wave computation' or 'lookup retry-with-resume'"
model: sonnet
# sonnet chosen for cost efficiency on a frequently-invoked knowledge skill.
# If teaching quality feels thin in Sensei mode, try changing to opus.
skill: agentic-dojo
---
```

### I10: Alias table not discoverable -- ACCEPT

**Fix:** Add one line to zero-state examples section:

```
Examples:
  /dojo explain wave computation    (short forms: wave, dag, spec, hop...)
  /dojo lookup retry-with-resume
```

### I11: "source of truth" natural language fails -- ACCEPT

**Fix:** Add `source-of-truth` and `source` as explicit aliases in the pattern alias table. Two rows. Catches the most confusing slug.

### I12: Test harness has no subset flags -- ACCEPT

**Fix:** Add category flags to test harness design:

```bash
# Usage:
#   ./scripts/test-routing.sh           # Run all tests
#   ./scripts/test-routing.sh --routing  # Routing tests only (5)
#   ./scripts/test-routing.sh --edge     # Edge cases only (4)
#   ./scripts/test-routing.sh --smoke    # Quick smoke test (7 critical paths)
```

---

## Nice-to-Haves

### N1: Dry-run flag for test harness -- DEFER to v2

Not feasible without skill-level changes (the skill doesn't have a dry-run mode). The `--smoke` subset flag from I12 is the pragmatic alternative for cheap re-runs.

### N2: Voice ID extraction: frontmatter vs H2 -- ACCEPT

**Fix:** Mode files keep their H2 section structure (no YAML frontmatter). Step 3c reads the mode file last. The instruction becomes: "From the mode file, identify the Voice ID section to determine which voice file to read in step 3b."

Wait -- this creates a circular dependency: we need the voice ID from the mode file to know which voice file to read, but the proposed read order is pattern -> voice -> mode.

**Revised read order:**
```
3a. Read the selected mode file. Note the Voice ID.
3b. Read the pattern file.
3c. Read the voice file matching the Voice ID from 3a.
3d. Generate the response (mode template is not freshest -- but it was read first
    and contains the structural instructions that frame the whole generation).
```

Actually, the I5 recency bias concern is valid but the mode file MUST be read first to determine the voice file. You can't read voice before mode.

**Final read order:** mode (3a, to get voice ID) -> pattern (3b, data) -> voice (3c, style -- freshest). The mode template structure competes less for recency because it's a structural scaffold (section ordering), not content. Voice being freshest is actually desirable -- it's the most likely to be under-applied (the original concern in I5).

This is a better order than either the plan's original (mode -> voice -> pattern) or the reviewer's suggestion (pattern -> voice -> mode, which can't work because you need mode first to know the voice).

### N3: Voice substitution rules are soft hints -- ACCEPT (no action)

Noted. Don't test for word-level substitutions. They're flavor, not contract.

### N4: Add worked example to SKILL.md -- ACCEPT

**Fix:** Add a 15-line worked example at the end of the SKILL.md, before "What This Skill Does NOT Do":

```
## Worked Example

Input: /dojo explain wave computation

Step 0: "explain wave computation" is not a reserved keyword. Continue.
Step 1a: No mode prefix (no colon). Continue to 1b.
Step 1b: "explain" matches Sensei trigger word. Mode = Sensei.
Step 2: "wave computation" matches alias "wave" -> wave-computation. Pattern = wave-computation.
Route reason: trigger-word: explain. Confidence derivable: medium.
Step 3a: Read mode-sensei.md. Voice ID = miyagi.
Step 3b: Read pattern-wave-computation.md.
Step 3c: Read voice-miyagi.md.
Step 3d: Generate response:
  Line 1: [Sensei | Wave Computation]
  Body: Follow Sensei template sections in Miyagi voice using wave-computation slots
  Last: dojo-envelope block with route metadata
```

Concrete. Shows every step. Anchors Claude's understanding of the full chain.

### N5: Voice substitution as lookup table -- ACCEPT

**Fix:** Rewrite `## Substitutions` in voice files as a table:

```
## Substitutions

| Instead of | Use |
|------------|-----|
| optimize | refine |
| algorithm | approach |
```

### N6: Breadcrumb as HTML comment -- REJECT

The breadcrumb serves both humans (quick confirmation of routing) and machines (test assertion target). Making it invisible loses the human signal. The cold opening concern is valid, but the breadcrumb IS useful feedback -- "I asked about wave computation and it routed to Sensei mode, good." Keep it visible.

### N7: Dynamic zero-state -- DEFER to v2

v1 targets stage/3-full where all 9 patterns exist. Dynamic listing adds complexity for a scenario that doesn't arise in v1.

### N8: Compare mode for v2 -- DEFER to v2 (document)

Add to "What This Skill Does NOT Do": "Does not compare patterns side-by-side (v2 consideration)."

### N9: Pattern frontmatter `one_liner` field -- ACCEPT

Already integrated into C1's canonical frontmatter. The `one_liner` field serves dual purpose: self-documenting pattern files AND potential dynamic zero-state in v2.

---

## Summary of Plan Changes

### Changes to SKILL.md structure

1. Add **Step 0: Reserved Keywords** (help, list, patterns, modes, ?)
2. Split **Step 1 into 1a (prefix override) and 1b (trigger words)** with explicit Mode Prefix Table
3. Rename Step 2 table to **"Pattern Alias Table"** to avoid overloading "alias"
4. Add `source-of-truth` and `source` aliases to pattern alias table
5. Move **"What This Skill Does NOT Do"** to between Step 2 and Step 3
6. Rewrite **Step 3** as: 3a (read mode, get voice ID) -> 3b (read pattern) -> 3c (read voice) -> 3d (single generation instruction with sub-bullets)
7. Add **worked example** before "Does NOT Do" section
8. **Envelope format**: use `dojo-envelope` info string, add `route_reason` field, drop `confidence` field
9. Specify alias matching: "Each alias is matched as a complete word. No substring matching."
10. Specify fuzzy matching: "If input prefixes exactly one slug or alias, suggest it. Otherwise list all."

### Changes to mode templates

11. Rewrite **Sensei synthesis template** as section-ordering instructions referencing slot names (not inline expansion)
12. Rewrite **Reference synthesis template** similarly -- YAML keys as structural guide referencing slots by name
13. Rewrite **Advisor synthesis template** similarly

### Changes to slot contract / pattern files

14. Replace **frontmatter slot map** with canonical registry derived from slot contract spec
15. Add `display_name` and `one_liner` to pattern frontmatter
16. Remove `traps_and_pitfalls`, `minimal_example` from frontmatter (they were wrong)
17. Add **authoring verification checklist** to Phase 3: cross-check every pattern's slots map against both mode templates

### Changes to project CLAUDE.md

18. Add **"Adding a New Pattern"** checklist (6 steps)

### Changes to command file

19. Add **model rationale comment** to dojo.md
20. Keep `model: sonnet` with explanation

### Changes to test harness

21. **Auto-save failed test output** to `test-results/<test-name>.json`
22. Add **category flags**: `--routing`, `--edge`, `--smoke`
23. Add **route_reason assertion** support (check envelope, not just breadcrumb)
24. Add `test-results/` to `.gitignore`

### Changes to envelope format

25. Info string: `dojo-envelope` (not `yaml`)
26. Fields: `mode_selected`, `pattern_selected`, `route_reason`, `warnings[]`
27. Drop: `confidence` (derivable from route_reason if ever needed)

### Changes to zero-state

28. Remove agent format detection -- always emit human format
29. Add alias hint to examples line
30. Reserved keywords trigger zero-state

### Changes to error contract

31. Pattern disambiguation: "list matches and ask user to pick, do not auto-select"
32. Prefix matching for suggestions: deterministic, not semantic

### Scope removals from v1

33. Drop `confidence` envelope field
34. Drop agent zero-state format (always human format)
35. Drop runtime template validation (static guarantee instead)
36. Drop dry-run test mode (use --smoke subset instead)

---

## Updated Implementation Impact

These changes don't add phases or files. They change the CONTENT of files already planned:

| File | Changes |
|------|---------|
| SKILL.md | Steps 0/1a/1b/3 rewrite, worked example, reserved keywords, "Does NOT" moved, envelope spec, alias matching rules |
| mode-sensei.md | Synthesis template rewritten as section-ordering |
| mode-reference.md | Synthesis template rewritten as section-ordering |
| mode-advisor.md | Synthesis template rewritten as section-ordering, voice_id = alfred |
| Slot contract spec | Canonical slot registry, authoring checklist note |
| Pattern file template | Corrected frontmatter, added display_name/one_liner |
| `.claude/CLAUDE.md` | "Adding a New Pattern" checklist |
| `.claude/commands/dojo.md` | Model rationale comment |
| `scripts/test-routing.sh` | Auto-save failures, category flags, route_reason checking |
| `.gitignore` | Add test-results/ |

No new files. No new phases. Same 5-phase structure, same 20 files. The plan is hardened, not expanded.

---

## Verification Additions

Add to the existing verification list:

12. **Canonical slot registry:** All 9 pattern files' frontmatter `slots` maps are identical in key names. All keys match what mode templates reference.
13. **Reserved keywords:** `/dojo help`, `/dojo list`, `/dojo ?` all produce zero-state output.
14. **Route reason:** Every response envelope contains `route_reason` with a concrete routing path.
15. **Envelope fence:** Every response's envelope uses ```dojo-envelope info string, not ```yaml.
16. **Mode prefix override:** `explain: wave-computation` and `sensei: wave-computation` both produce Sensei mode (testing 1a prefix stripping).
17. **Slot name pointers:** Sensei mode output contains content from the pattern's Core Mechanism slot without verbatim repetition of the slot heading text (confirms pointer-based, not inline expansion).
