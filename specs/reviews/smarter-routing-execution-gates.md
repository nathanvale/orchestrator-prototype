# Smarter Routing -- Execution Gates

## Task: validate-reference-files

**Status:** PASS
**Timestamp:** 2026-02-24

### Checklist

#### query-classifier.md (54 lines)
- [x] Contains all 7 classification rules from plan (compare prefix/trigger, 2+compare, 2 no compare, --context-pattern, pronoun/reference, 3+, everything else)
- [x] Includes expanded compare triggers: "in common", "overlap", "similarities"
- [x] Includes ordinal refs ("first/second/third") in follow-up triggers (line 31)
- [x] Has classifier-to-mode mapping table with 5 rows (single, compare, follow-up, structured follow-up, disambiguation)
- [x] Has recursion guard note (lines 49-54)
- [x] No frontmatter (starts with # Query Classifier)
- [x] Line count reasonable (54 lines, target ~30, acceptable up to ~60)

#### context-resolution.md (57 lines)
- [x] Contains precedence contract with all 5 cases from plan (invalid slug, envelope fails, advisor+ordinal, recursion guard, explicit wins)
- [x] Includes ordinal resolution for advisor ranked list (ranked_patterns[N-1], line 29)
- [x] Includes --context-pattern=<slug> handling (skip envelope, extract, validate, repeatable, lines 33-35)
- [x] Includes cross-skill bridge (parses advisor-envelope, does NOT invoke advisor, lines 39-41)
- [x] Includes context: fork warning (line 57)
- [x] Has 1-message lookback algorithm (dojo-envelope and advisor-envelope check, lines 13-14)
- [x] No frontmatter (starts with # Context Resolution)
- [x] Line count reasonable (57 lines, target ~20, acceptable up to ~60)

### Line Counts
- query-classifier.md: 54 lines
- context-resolution.md: 57 lines
- **Total:** 111 lines

### Blocking Issues
None

---

VERDICT: PASS

## Task: validate-mode-compare

**Status:** PASS
**Timestamp:** 2026-02-24

### Checklist
- [x] Has Voice ID section with value `jarvis`
- [x] Has Synthesis Template with all 7 sections: Breadcrumb, At a Glance table, How They Differ, When To Choose Which, Key Rules (combined), Watch Out (comparative), See Also (deduplicated)
- [x] Has Constraints section covering: max 2 patterns, same-pattern error (with exact message "Cannot compare a pattern with itself. Try: `/dojo explain <pattern>`"), prefix override behavior, JARVIS voice applicability, word target ~600
- [x] Structural consistency with mode-sensei.md and mode-reference.md (same hierarchy: Header -> Voice ID -> Synthesis Template -> Constraints)
- [x] No frontmatter (mode files don't have frontmatter)
- [x] Line count is in range 60-100

### Line Counts
- mode-compare.md: 77 lines

### Blocking Issues
None

---

VERDICT: PASS

## Task: validate-dojo-skill

**Status:** PASS
**Timestamp:** 2026-02-24

### Checklist
- [x] Line count <= 250 (248 lines)
- [x] Stop hook checks for both `pattern_selected` and `patterns_selected`
- [x] Zero-state includes compare mode and example
- [x] Argument-hint includes compare and --context-pattern examples
- [x] Step 1 references query-classifier.md and context-resolution.md
- [x] Error contract: 2-explicit=compare, 3+=disambiguation, same-pattern=error, /advisor tip
- [x] "Does NOT Do" no longer mentions compare
- [x] Step 2 handles compare mode (mode-compare.md + 2 patterns + voice-jarvis.md)
- [x] Envelope v2: envelope_version, query_type, patterns_selected (list), pattern_selected (shim), context_source
- [x] Envelope extraction regex documented
- [x] route_reason values include compare-trigger:, context-resolution:, structured-follow-up:

### Line Counts
- SKILL.md: 248 lines

### Blocking Issues
None

---

VERDICT: PASS

## Task: validate-advisor-skill

**Status:** PASS
**Timestamp:** 2026-02-24

### Checklist
- [x] Structural signal guidance after characteristic extraction table (3 lines)
- [x] Existing characteristic extraction table unchanged
- [x] Existing scoring guide unchanged
- [x] Envelope includes envelope_version: 2
- [x] Envelope extraction regex documented
- [x] Line count under 200 (179 lines)
- [x] mode-advisor.md Next Steps includes /dojo compare

### Line Counts
- advisor SKILL.md: 179 lines
- mode-advisor.md: 72 lines

### Blocking Issues
None

---

VERDICT: PASS

## Task: validate-integration

**Status:** PASS
**Timestamp:** 2026-02-24

### Cross-File Consistency
- [x] Dojo SKILL.md references query-classifier.md -- file exists with classification rules
- [x] Dojo SKILL.md references context-resolution.md -- file exists with resolution algorithm
- [x] Dojo SKILL.md references mode-compare.md -- file exists with Voice ID = jarvis
- [x] Compare mode references voice-jarvis.md -- voice file exists
- [x] Dojo envelope uses envelope_version: 2, query_type, patterns_selected (list)
- [x] Advisor envelope uses envelope_version: 2
- [x] Dojo stop hook validates both pattern_selected and patterns_selected
- [x] No file exceeds line budget (dojo 248 <= 250, advisor 179 <= 200)
- [x] pattern_selected (singular) only in stop hook and compatibility shim
- [x] mode-compare.md follows mode-sensei.md structure (Voice ID, Synthesis Template, Constraints)
- [x] Envelope extraction regex in both dojo and advisor SKILL.md
- [x] mode-advisor.md Next Steps includes /dojo compare

### Line Counts (Final)
- dojo SKILL.md: 248 lines (<= 250)
- query-classifier.md: 54 lines
- context-resolution.md: 57 lines
- mode-compare.md: 77 lines
- advisor SKILL.md: 179 lines (<= 200)
- mode-advisor.md: 72 lines

### Prior Gate Entries
- validate-reference-files: PASS
- validate-mode-compare: PASS
- validate-dojo-skill: PASS
- validate-advisor-skill: PASS

### Blocking Issues
None

---

VERDICT: PASS
