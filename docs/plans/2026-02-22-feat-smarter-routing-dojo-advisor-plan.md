---
title: "feat: Smarter routing for agentic-dojo and pattern-advisor skills"
type: feat
status: active
date: 2026-02-22
origin: docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md
---

# feat: Smarter routing for agentic-dojo and pattern-advisor skills

## Enhancement Summary

**Deepened on:** 2026-02-22
**Research agents used:** agent-native-architecture, create-agent-skills, architecture-strategist, pattern-recognition-specialist, agent-native-reviewer, code-simplicity-reviewer, best-practices-researcher, dojo-compatibility-analyzer
**Review passes:** 8 parallel agents + 4 claude-code-guide agents (skills architecture, agent dispatch patterns, SKILL.md sizing, envelope/observability)

### Key Improvements from Deepening

1. **Line budget is wrong -- real estimate is ~273 lines, exceeding 250-line ceiling by 23.** Extract classifier and context resolution to reference files on day one, not as fallback
2. **Cut `discover` and `multi` query types** -- discover is a glorified redirect (1 line in error message suffices), multi is speculative (no evidence users want 3+ pattern explanations in one response)
3. **Standardize `patterns_selected` as always-a-list** -- v1 is not merged to main, so normalize now before any consumer code exists. Eliminates dual-field problem
4. **Add `--context-pattern` structured argument for agents** -- promote from v2 backlog. Agents cannot use pronoun-based follow-ups; this is the #1 agent parity gap
5. **Add `envelope_version: 2`** -- future-proofs schema evolution for observability pipeline
6. **Make two-pass routing explicit** -- Step 1a resolves aliases, Step 1b classifies query type. The classifier needs alias results before it can determine query type
7. **Simplify context resolution to 1-message lookback** -- the pronoun resolution table is over-engineered; the LLM handles pronouns naturally. Just parse the most recent envelope
8. **Condense semantic signals to inline guidance** -- 3 lines instead of a formal 6-row table. Same information, less ceremony
9. **Add `handoff` field to discover envelope** -- agents need machine-readable action, not copy-paste strings
10. **Add recursion bound to follow-up re-classification** -- prevents infinite re-entry

### New Considerations Discovered

- The single-word alias collision problem: `/dojo builder loop` resolves both `builder-validator` and `dispatch-loop` as explicit patterns, but the user may have meant "the builder pattern's loop mechanism." Document as known edge case; compare output is useful even when unintended
- Compare mode reads 4 files (vs 3 for single) -- Step 2 instructions need plural-aware pattern reads
- Claude 4.6 is more responsive to system prompts -- table-based routing needs fewer emphatic instructions, not more (Anthropic prompting best practices)
- XML tags around classification tables may improve strict adherence by ~12% (research finding) -- consider if drift is observed
- Multi-turn LLM conversations degrade 39% on average -- explicit context management via envelope parsing is the right approach
- "5 messages" is ambiguous -- redefine as "5 user+assistant turn pairs" or simplify to 1-message lookback

### Simplification Decisions

| Original feature | Decision | Rationale |
|------------------|----------|-----------|
| `discover` query type | **Cut** | Just a redirect message. Add 1-line tip to existing "no match" error instead |
| `multi` query type (3+ patterns) | **Cut** | No evidence of user demand. Show disambiguation instead of 3+ sequential outputs |
| 5-message context window | **Simplify to 1-message** | Only need to check most recent skill response. Ordinal references ("the second one") are speculative |
| Pronoun resolution table (8 mappings) | **Simplify** | Replace with single instruction: "resolve from most recent envelope." LLM handles pronouns naturally |
| Phase B2: Pairings registry | **Defer** | Advisor's ranked output already communicates which patterns are relevant together. Add when real usage shows demand |
| Semantic signal table (6 rows) | **Condense** | 3-line inline guidance achieves same outcome as formal table |

---

## Overview

Enhance the routing layer of both the agentic-dojo (`/dojo`) and pattern-advisor (`/advisor`) skills to handle compound queries, conversation context, semantic intent detection, and pattern combinations -- while preserving deterministic delivery.

The v1 routing is a lexical cascade: prefix override > trigger words > alias table > keyword table > conversation fallback. This works for single-pattern, single-mode queries but breaks on compound queries ("compare wave and task-dag"), implicit references ("my tasks have dependencies and run in parallel"), follow-ups ("explain that one"), and cross-skill handoffs (advisor recommends, user asks dojo for details).

**Design constraint:** Deterministic delivery, smarter routing. Content always comes from canonical pattern files. Output always follows mode templates. The agent's judgment is applied only to classification and routing decisions, never to content generation.

**Consumers:**
1. Humans learning orchestration patterns
2. Agents invoking `/dojo` or `/advisor` programmatically and parsing structured responses
3. Observability hooks consuming routing envelopes for telemetry

## Problem Statement / Motivation

### Current routing gaps

| Gap | Example query | What happens now | What should happen |
|-----|--------------|------------------|-------------------|
| Compound queries | `/dojo compare wave task-dag` | "Multiple patterns detected" error | Side-by-side comparison |
| Multi-pattern requests | `/dojo explain wave dag retry` | Error -- asks user to pick one | Disambiguation: "Which pair for compare, or which one for explain?" |
| Implicit pattern references | "my tasks have dependencies and run in parallel" | Keyword table may partial-match; may misroute | Detect structural signals; route to wave-computation |
| Follow-ups | "explain that one" (after advisor recommends task-dag) | No context resolution; "Pattern not found" | Resolve from conversation context |
| Cross-skill context | Advisor envelope has ranked patterns; dojo can't read it | User must copy-paste `/dojo explain task-dag` | Dojo reads advisor-envelope from prior turns |
| Relational queries | "how does retry relate to spec-as-source-of-truth?" | No handling | Compare or explain with relationship framing |
| Pattern combinations (advisor) | "I need durable task execution" | Recommends patterns individually | Notes that retry + spec are a natural pairing |

### Community intelligence (2026-02-22)

The community has converged on **tiered routing** as the winning pattern:

| Tier | Method | Speed | Cost | Handles ambiguity? |
|------|--------|-------|------|--------------------|
| 1 (fast) | Keyword/regex/alias | Instant | Zero | No |
| 2 (mid) | Semantic/structural analysis | Fast | Low | Somewhat |
| 3 (fallback) | LLM-as-classifier | Slow | High | Yes |

Our dojo currently lives entirely in Tier 1. The proposed changes add Tier 2 (structural signal extraction, context resolution) without requiring Tier 3 (the LLM running the skill IS the classifier -- we just need better instructions).

Key findings:
- **Compound queries are unsolved** -- Botpress names it explicitly as an open problem. Nobody has a clean pattern (source: Botpress AI Agent Routing Guide 2026)
- **vLLM Semantic Router v0.1 Iris** ships routing continuity -- intent classification history maintained across turns (source: blog.vllm.ai, January 2026)
- **Table-based classification + semantic fallback** is the emerging hybrid pattern (source: @NucleusOS, aurelio-labs/semantic-router, LLMRouter library)
- **Amazon research** uses fine-tuned BERT for multi-agent routing in production (source: @omarsar0, 611 likes)

## Proposed Solution

### Architecture: query-type classifier above existing cascade

```
$ARGUMENTS
    │
    ▼
┌─────────────────────────┐
│ Step 1a: Reserved keyword│──yes──▶ Zero-state (unchanged)
│ (help, list, ?)          │
└─────────┬───────────────┘
          │ no
          ▼
┌─────────────────────────┐
│ Step 1a: Resolve aliases │  Alias table only (not keyword table)
│ Result: resolved[], count│  Two-pass: aliases first, classify second
└─────────┬───────────────┘
          │
          ▼
┌─────────────────────────┐
│ Step 1b: Query-type      │  NEW -- determines the shape of the query
│ classify                 │
│                          │
│  single   ───────────────▶ Existing cascade (unchanged)
│  compare  ───────────────▶ Compare routing (2 patterns)
│  disambiguation ─────────▶ "3+ patterns. Which pair?" message
│  follow-up ──────────────▶ Context resolution, then re-clas  sify (max 1 re-entry)
│  structured follow-up ───▶ --context-pattern flag, skip resolution
└──────────────────────────┘
```

The classifier sits between alias resolution and the existing mode/pattern detection. It does NOT replace the existing cascade -- `single` falls straight through to it.

### Four improvements, two phases

**Phase A (tightly coupled):**
1. Query-type classifier (extracted to reference file) + context resolution (extracted to reference file)
2. Comparison mode (new deterministic delivery template)
3. Context resolution integration testing

**Phase B (advisor-only, independent):**
4. Condensed semantic signal guidance (3 lines inline)

**Deferred to v2:**
5. ~~Pattern-combination awareness~~ (advisor's ranked output already communicates pairings)

## Technical Approach

### Research Insights: Routing Architecture

**Table-based classification:** Claude 4.6 is more responsive to system prompts than previous models. If routing prompts were designed to reduce undertriggering, they may now overtrigger. Tables need fewer emphatic instructions, not more (source: Anthropic Claude 4 Best Practices). XML tags around classification tables improve strict adherence by ~12% vs plain markdown -- consider wrapping in `<classifier>` tags if drift is observed during testing (source: Algorithm Unmasked, 2025).

**Two-pass routing is essential:** The classifier needs to know how many patterns resolved before it can determine query type. This means alias resolution must happen BEFORE query-type classification. The plan's original flowchart was correct but the SKILL.md instructions didn't make the ordering explicit. Multiple reviewers flagged this.

**Compound query decomposition:** Production systems use a DECOMP framework -- decompose first, route independently, synthesize. For the dojo, "ask for clarification" is the right approach for ambiguous queries (the teaching context favors accuracy over speed). Compare mode handles the intentional 2-pattern case cleanly.

**Follow-up re-entry needs a recursion bound:** The follow-up query type re-enters the classifier after context resolution. Without an explicit bound, a follow-up that resolves to another follow-up creates a loop. Rule: re-classification after context resolution MUST NOT produce another follow-up. If resolved query still has no pattern, emit "No pattern context found."

### Improvement 1: Query-type classifier

**Location:** Extracted to `references/query-classifier.md`, read in Step 1 after reserved-keyword check.

**Why extracted (not inline):** The dojo compatibility analysis estimates the full SKILL.md at ~273 lines with all changes inline -- exceeding the 250-line ceiling by 23 lines. Extracting the classifier (~30 lines) and context resolution (~20 lines) to reference files keeps SKILL.md under budget at ~223 lines. The classifier is still routing logic consumed by the wrapper -- just progressively disclosed.

**Two-pass resolution (explicit ordering):**

```
Step 1a: Resolve all pattern slugs/aliases from $ARGUMENTS
         (alias table only -- NOT keyword table)
         Result: resolved_patterns[] with count

Step 1b: Classify query type using resolved count + signals

Step 1c: For single query type, continue to mode detection
         and keyword table (existing cascade, unchanged)
```

**Classification rules (deterministic, not heuristic):**

| Signal | Query type | Condition |
|--------|-----------|-----------|
| `compare` prefix or trigger | compare | `$ARGUMENTS` starts with `compare:` or contains "compare", "vs", "versus", "difference between", "differ from" |
| 2 explicit pattern slugs/aliases + compare signal | compare | Two patterns resolved + compare trigger present |
| 2 explicit pattern slugs/aliases, no compare signal | compare | Default: when user names exactly 2 patterns, they want comparison |
| `--context-pattern` flag present | structured follow-up | Extract pattern slug directly, skip pronoun resolution |
| Pronoun/reference without pattern name | follow-up | $ARGUMENTS contains "that one", "the first", "those", "it" AND no pattern slug/alias resolved |
| 3+ explicit pattern slugs/aliases | disambiguation | "You named 3+ patterns. Compare supports 2 at a time. Which pair would you like to compare?" |
| Everything else | single | Fallthrough to existing cascade |

**Changes from original plan:**
- **`discover` query type removed.** Instead, the existing "no match" error message gains a tip: "Tip: use `/advisor` to get pattern recommendations from a problem description." This is 1 line, not a new query type with classification rules and test cases.
- **`multi` query type removed.** 3+ explicit patterns trigger a disambiguation message, not sequential multi-pattern output. No evidence of user demand for 3+ explanations in one response.
- **`--context-pattern` flag added** for agent parity. Agents pass structured arguments instead of manufacturing pronouns.

**Resolving the "Multiple patterns detected" conflict:**

The current error contract fires when multiple patterns are detected. The new rule:

- **Explicit naming** (slug or alias) of exactly 2 = intentional compare.
- **Explicit naming** of 3+ = disambiguation (ask user to pick 2 for compare or 1 for explain).
- **Keyword ambiguity** (keyword table produces 2+ matches) = accidental. Keep the existing disambiguation error.

**Known edge case:** `/dojo builder loop` -- "builder" is an alias for `builder-validator`, "loop" is an alias for `dispatch-loop`. Under new rules, this routes to compare. The user may have meant "the builder pattern's loop mechanism." Pragmatic mitigation: compare output is useful even when unintended -- the user sees both patterns and can refine.

**Classifier-to-mode mapping:**

| Query type | Mode | Patterns read | Delivery |
|------------|------|--------------|----------|
| single | Existing cascade (Sensei/Reference) | 1 | Existing templates |
| compare | Compare (new) | 2 | mode-compare.md template |
| follow-up | Re-classify after context resolution | 1-2 | Depends on resolved query type |
| structured follow-up | Same as single/compare (from flag) | 1-2 | Depends on flag value |
| disambiguation | N/A | 0 | Error message asking user to narrow |

### Improvement 2: Comparison mode

**New file:** `.claude/skills/agentic-dojo/references/mode-compare.md`

**Voice:** JARVIS (precision suits side-by-side analysis)

**Synthesis template (deterministic):**

```
1. Breadcrumb: [Compare | Pattern A Display Name vs Pattern B Display Name]

2. "At a Glance" -- table with one row per pattern:
   | | Pattern A | Pattern B |
   |---|---|---|
   | Summary | one_liner | one_liner |
   | Best for | When To Use (condensed) | When To Use (condensed) |

3. "How They Differ" -- Core Mechanism slot for each pattern,
   presented sequentially (not interleaved). Highlight the
   structural difference.

4. "When To Choose Which" -- Synthesize from When To Use +
   Tradeoffs slots. Present as:
   - "Choose [A] when..." (2-3 conditions)
   - "Choose [B] when..." (2-3 conditions)
   - "Use both when..." (if related_patterns slot shows complementary relationship)

5. "Key Rules" -- Combined key rules from both patterns,
   presented as a single list. Note which pattern each rule
   applies to.

6. "Watch Out" -- Failure Modes from both patterns. Frame as
   comparative: which failure mode is unique to each, which
   is shared.

7. "See Also" -- Related Patterns from both, deduplicated.
```

**Constraints:**
- Maximum 2 patterns per compare (if user provides 3+, route to disambiguation)
- Same pattern twice = error: "Cannot compare a pattern with itself. Try: `/dojo explain <pattern>`"
- Compare mode ignores mode prefix/trigger overrides -- compare is always compare
- JARVIS voice rules apply to all content within the comparison

**Envelope schema for compare:**

```dojo-envelope
envelope_version: 2
query_type: compare
mode_selected: compare
patterns_selected:
  - wave-computation
  - task-dag
route_reason: "compare-trigger: vs"
warnings: []
```

**Envelope extraction contract (for observability and agent consumers):**

```
Extraction pattern: /```(?:dojo|advisor)-envelope\n([\s\S]*?)```/
Content format: YAML
```

Document this regex in the System-Wide Impact section so all consumers use the same parser.

### Improvement 3: Conversation context resolution

**Location:** Extracted to `references/context-resolution.md`, referenced from SKILL.md Step 1 when `query_type = follow-up`.

### Research Insights: Context Management

**Multi-turn degradation:** LLM performance degrades ~39% in multi-turn vs single-turn conversations (source: Maxim AI). Explicit context management via structured envelope parsing is more reliable than relying on the model's implicit conversation memory. This validates the envelope-based approach over hoping the LLM "remembers" prior patterns.

**1-message lookback is sufficient:** The simplicity reviewer and architecture strategist both flagged the 5-message window as over-engineered. The actual use case is: "user says 'that one' immediately after a dojo or advisor response." This requires exactly 1 message of lookback. Ordinal references ("the second one"), "again", and multi-message scanning are speculative features without demonstrated demand.

**Resolution algorithm (simplified):**

```
When query_type = follow-up:

1. Check the most recent assistant message for:
   a. dojo-envelope block -- extract patterns_selected[0]
   b. advisor-envelope block -- extract ranked_patterns[0].slug

2. If envelope found and pattern resolved:
   Re-classify with resolved pattern and continue through
   the normal routing cascade.
   IMPORTANT: Re-classification MUST NOT produce another
   follow-up. If resolved query still has no pattern,
   emit the error below.

3. If no envelope found or parsing fails:
   "No pattern context found in recent conversation.
   Please specify a pattern name, or try:
   /dojo help to see available patterns."
```

**Agent-optimized structured follow-up (promoted from v2 backlog):**

Agents pass `--context-pattern=<slug>` instead of using pronouns:

```
/dojo explain --context-pattern=task-dag
/dojo compare --context-patterns=task-dag,wave-computation
```

When structured flags are present, skip pronoun/envelope resolution entirely. This eliminates the #1 agent parity gap identified by the agent-native reviewer.

**Cross-skill context bridge:**

The dojo reads `advisor-envelope` blocks from the most recent assistant message. It does NOT invoke the advisor skill. It simply parses the structured envelope that the advisor already emitted. The top-ranked pattern (`ranked_patterns[0].slug`) becomes the resolution target.

**Warning:** The context resolution algorithm requires main-thread conversation access. If the dojo skill is ever changed to `context: fork`, follow-up resolution will break entirely. Document this constraint in the SKILL.md.

**Envelope parse failure fallback:** If the envelope block is malformed, truncated, or missing required fields, treat as empty context and return the "No pattern context found" message. Do not attempt to infer patterns from prose.

**Envelope for follow-up responses:**

```dojo-envelope
envelope_version: 2
query_type: follow-up
mode_selected: sensei
patterns_selected:
  - task-dag
route_reason: "conversation-context: advisor-envelope"
context_source: "advisor-envelope from prior turn"
warnings: []
```

### Improvement 4: Semantic signal extraction (advisor)

**Location:** Pattern-advisor SKILL.md Step 1, added as 3-line inline guidance after existing characteristic extraction table.

**Relationship to existing keyword signals:** Additive. Semantic signals supplement the keyword-detected characteristics. They do not override or replace them. The scoring guide treats all characteristics equally.

**Condensed inline guidance (replaces formal 6-row table):**

After the existing keyword extraction table, add:

```
After keyword extraction, also detect structural signals:
- Sequential/pipeline language ("first... then... finally") → dependencies, multiple-tasks
- Role differentiation ("one builds, another checks") → verification-needed
- Error narratives, iteration loops, scale/batch language → map to closest characteristic
```

This is 3 lines in SKILL.md, not a formal table. The LLM handles the mapping naturally -- the explicit keyword table catches the majority of cases, and these structural hints cover the gap where users describe patterns without using signal keywords.

**Worked example:**

Input: "I have a CI pipeline that runs linting, then tests, then build, then deploy"

- Keyword extraction: no direct matches (none of the signal keywords appear)
- Structural analysis: "linting, then tests, then build, then deploy" = sequential/pipeline language = adds `dependencies` + `multiple-tasks`
- Scoring: task-dag (high: multiple-tasks + dependencies), wave-computation (medium: dependencies + implied parallelism within stages), dispatch-loop (low: multiple-tasks only)

### Improvement 5: Pattern-combination awareness (advisor) -- DEFERRED

**Status:** Deferred to v2 backlog. The advisor's existing `ranked_patterns` output already communicates which patterns are relevant together. A formal pairings registry adds maintenance overhead (must be updated when patterns are added) without demonstrated demand.

**What's deferred:**
- Curated pairings registry (5 pairs)
- "Pattern Pairing" section in advisor synthesis template
- `combinations` field in advisor-envelope
- `/dojo compare` command in `next_commands` when pairing detected

**What ships instead:** The advisor's existing "Recommended Patterns" section already ranks patterns, and the new compare mode means users can compare any two recommended patterns manually. The `/dojo compare` command in the advisor's Next Steps section is sufficient handoff.

**Promotion criteria:** Add the pairings registry when real usage shows users frequently asking "how do these two patterns relate?" after advisor recommendations. Track via observability envelope data.

## System-Wide Impact

### Envelope schema evolution

### Research Insights: Schema Design

**Always-a-list is cleaner than singular/plural fields.** Multiple reviewers (agent-native, architecture-strategist, pattern-recognition, create-agent-skills) independently flagged the `pattern_selected` vs `patterns_selected` split as fragile. Since v1 is not yet merged to main, this is the ideal time to normalize. Standardize on `patterns_selected` (always a list, even for single-pattern responses where it's a 1-element list).

**Add `envelope_version`** to both envelope types. This costs 1 line per envelope and prevents "which fields exist?" guessing for observability pipelines. v1 = current schema (without `query_type`), v2 = this plan's schema.

The `dojo-envelope` schema gains these fields:

| Field | Type | Added by | When present |
|-------|------|----------|-------------|
| `envelope_version` | integer | All | Always (value: 2) |
| `query_type` | string | All improvements | Always (single, compare, follow-up, disambiguation) |
| `patterns_selected` | list | All | Always (replaces `pattern_selected`; 1-element list for single queries) |
| `context_source` | string | Follow-up | When pattern resolved from context |

**Breaking change:** `pattern_selected` (singular) is removed. All responses use `patterns_selected` (list). Since v1 has not shipped to main, no external consumers need migration.

The `advisor-envelope` gains:

| Field | Type | Added by | When present |
|-------|------|----------|-------------|
| `envelope_version` | integer | All | Always (value: 2) |

**Envelope extraction contract:**

```
Regex: /```(?:dojo|advisor)-envelope\n([\s\S]*?)```/
Format: YAML
```

All observability and agent consumers should use this extraction pattern.

### Line budget analysis (corrected)

The dojo compatibility analyzer produced a bottom-up line count that shows the original estimate was wrong:

| Change | Lines Added | Lines Removed | Net |
|--------|-------------|---------------|-----|
| Zero-state update (add compare) | +2 | 0 | +2 |
| Step 1: Read classifier reference | +3 | 0 | +3 |
| Step 1: Read context-resolution reference | +3 | -3 (replaces old fallback) | 0 |
| Step 2: Plural-aware pattern reads | +5 | -1 | +4 |
| Envelope format updates | +6 | -3 (remove singular field) | +3 |
| Error contract updates (compare-with-itself, 3+) | +4 | -2 | +2 |
| "Does NOT Do" section update | 0 | -1 | -1 |
| **Total SKILL.md changes** | **+23** | **-10** | **+13** |

**Revised estimates:**

| Component | Current lines | Net change | New total |
|-----------|--------------|-----------|-----------|
| Dojo SKILL.md | 207 | +13 (references extracted) | ~220 |
| query-classifier.md (new) | 0 | ~30 | 30 |
| context-resolution.md (new) | 0 | ~20 | 20 |
| mode-compare.md (new) | 0 | ~80 | 80 |
| Advisor SKILL.md | 138 | +10 (condensed semantic signals) | ~148 |

Dojo SKILL.md at ~220 lines is safely under the 250-line ceiling with 30 lines of headroom.

### HOP purity check

| Principle | Status |
|-----------|--------|
| SKILL.md is a fixed wrapper | Preserved -- classifier is routing logic, not content generation |
| Mode files are parameter declarations | Preserved -- mode-compare.md follows the same pattern as mode-sensei.md and mode-reference.md |
| Pattern files are mode-agnostic | Preserved -- no changes to pattern files |
| Voice files are parameter declarations | Preserved -- compare reuses voice-jarvis.md |
| Adding a new mode = 1 new file | Preserved -- mode-compare.md + update to SKILL.md mode table |

### Interaction with existing error contract

| Condition | Current behavior | New behavior |
|-----------|-----------------|-------------|
| 2 explicit patterns (slug/alias) | "Multiple patterns detected" error | Route to compare |
| 3+ explicit patterns (slug/alias) | "Multiple patterns detected" error | Route to disambiguation ("Which pair for compare, or which one for explain?") |
| 2+ keyword matches (ambiguous) | "Multiple patterns detected" error | Unchanged -- still disambiguation error |
| Unknown pattern | Suggest closest or list all | Unchanged + tip: "Try `/advisor` for recommendations" |
| Unknown mode | Show available modes | Updated to include compare |
| Compare with same pattern twice | N/A | "Cannot compare a pattern with itself" |

## Implementation Phases

### Phase A: Query-type classifier + compare mode + context resolution

These three are tightly coupled -- compare mode requires the classifier to route to it, and follow-up requires context resolution to feed back into the classifier.

#### Phase A1: Query-type classifier + reference extraction

**Files:**

| File | Action | Lines |
|------|--------|-------|
| `.claude/skills/agentic-dojo/references/query-classifier.md` | Create | ~30 |
| `.claude/skills/agentic-dojo/references/context-resolution.md` | Create | ~20 |
| `.claude/skills/agentic-dojo/SKILL.md` | Edit Step 1 (Route) | +3 (reference read) |

**Changes:**
1. Create `query-classifier.md` with classification table, two-pass resolution rules, and classifier-to-mode mapping
2. Create `context-resolution.md` with 1-message lookback algorithm, cross-skill bridge, and `--context-pattern` flag handling
3. Add reference reads to SKILL.md Step 1 after reserved-keyword check
4. Update "Multiple patterns detected" error contract to distinguish explicit naming (2 = compare, 3+ = disambiguation) from keyword ambiguity
5. Add `query_type` and `envelope_version` fields to envelope format
6. Normalize `pattern_selected` to `patterns_selected` (always a list)
7. Add compare to zero-state modes list

**Success criteria:**
- `/dojo wave dag` routes to compare (not error)
- `/dojo wave dag retry` routes to disambiguation (not error, not multi)
- `/dojo parallel execution` (keyword ambiguity) still triggers disambiguation
- `/dojo explain wave` (single) routes unchanged
- `/dojo explain --context-pattern=wave-computation` routes to wave-computation
- Envelope includes `query_type: single` and `envelope_version: 2` on existing responses

#### Phase A2: Comparison mode

**Files:**

| File | Action | Lines |
|------|--------|-------|
| `.claude/skills/agentic-dojo/references/mode-compare.md` | Create | ~80 |
| `.claude/skills/agentic-dojo/SKILL.md` | Edit Step 2 (Read) | +4 |

**Changes:**
1. Create mode-compare.md with synthesis template, JARVIS voice ID, and constraints
2. Add compare mode to SKILL.md Step 2 Read instructions (load mode-compare, pattern-A, pattern-B, voice-jarvis)

**Success criteria:**
- `/dojo compare wave task-dag` produces side-by-side output in JARVIS voice
- `/dojo compare wave wave` returns "Cannot compare a pattern with itself"
- `/dojo compare wave dag retry` returns "Compare supports 2 patterns. Which pair?"
- Envelope has `patterns_selected: [wave-computation, task-dag]`
- Output follows mode-compare.md template exactly

#### Phase A3: Context resolution integration

**Files:**

| File | Action | Lines |
|------|--------|-------|
| `.claude/skills/agentic-dojo/SKILL.md` | Already covered in A1 reference read | 0 (logic in reference file) |

**Changes:**
Context resolution logic lives in `references/context-resolution.md` (created in A1). This phase is integration testing only:

1. Verify follow-up query type resolves from dojo-envelope
2. Verify cross-skill bridge resolves from advisor-envelope
3. Verify `--context-pattern` flag bypasses envelope resolution
4. Verify recursion bound (re-classification cannot produce another follow-up)

**Success criteria:**
- After `/dojo explain wave`, saying "explain that in reference mode" routes to Reference + wave-computation
- After `/advisor "tasks with dependencies"`, saying `/dojo explain that one` routes to task-dag (from advisor-envelope)
- No context available returns explicit "No pattern context found" message
- Envelope has `context_source` showing where resolution came from
- `/dojo explain --context-pattern=task-dag` routes directly without envelope parsing

### Phase B: Semantic signals (advisor)

Independent of Phase A. Can ship separately.

#### Phase B1: Condensed semantic signal guidance

**Files:**

| File | Action | Lines |
|------|--------|-------|
| `.claude/skills/pattern-advisor/SKILL.md` | Edit Step 1 | +3 (inline guidance) |

**Changes:**
1. Add 3-line structural signal guidance after existing characteristic extraction table
2. Frame as additive: "After keyword extraction, also detect structural signals"

**Success criteria:**
- "CI pipeline: lint, test, build, deploy" extracts `dependencies` + `multiple-tasks`
- "One agent builds, another reviews" extracts `verification-needed`
- Existing keyword-based extraction continues to work unchanged
- Envelope `characteristics_detected` includes both keyword and structural signals

## Acceptance Criteria

### Functional Requirements

- [ ] Query-type classifier correctly routes single, compare, follow-up, structured follow-up, and disambiguation queries
- [ ] Comparison mode delivers deterministic side-by-side output for any 2 of the 9 patterns
- [ ] Conversation context resolution handles pronouns and cross-skill envelopes via 1-message lookback
- [ ] `--context-pattern` flag provides agent-optimized follow-up (bypasses envelope parsing)
- [ ] Condensed semantic signal guidance in advisor catches structural descriptions that keyword matching misses
- [ ] Zero-state updated to show compare mode
- [ ] "No match" error includes tip to use `/advisor`

### Non-Functional Requirements

- [ ] Dojo SKILL.md stays under 250 lines (classifier and context resolution extracted to reference files)
- [ ] All responses include routing envelope with `query_type` and `envelope_version: 2` fields
- [ ] `patterns_selected` is always a list (even single-element)
- [ ] HOP purity maintained -- no mode-specific logic in SKILL.md
- [ ] Pattern files unchanged -- no mode-specific content added
- [ ] Compare mode reuses existing voice-jarvis.md (no new voice file)

### Quality Gates

- [ ] Manual smoke test matrix covers all query types x 2+ patterns each
- [ ] Cross-skill context test: advisor response followed by dojo follow-up
- [ ] Edge cases tested: same pattern twice, 3+ patterns in compare, empty context, `--context-pattern` flag
- [ ] Envelope extraction regex documented for observability pipeline consumers

## Alternative Approaches Considered

### Extract classifier to a separate reference file

**Considered:** Move the query-type classifier out of SKILL.md into `references/query-classifier.md` to stay under the 250-line ceiling.

**Decision: Extract on day one.** The dojo compatibility analysis showed that keeping everything inline pushes SKILL.md to ~273 lines, exceeding the 250-line ceiling by 23. Extracting classifier (~30 lines) and context resolution (~20 lines) to reference files keeps SKILL.md at ~220 lines with 30 lines of headroom. The extracted files are still routing logic (not content parameters), just progressively disclosed.

### Duplicate advisor scoring in dojo for `discover` query type

**Considered:** Run inline pattern scoring inside the dojo when the user describes a problem without naming a pattern.

**Rejected:** Violates DRY, creates maintenance burden, and the advisor already does this well. The discover query type emits a handoff message to `/advisor` instead.

### Semantic embedding for pattern matching

**Considered:** Pre-encode pattern descriptions as embeddings and classify by vector similarity (aurelio-labs/semantic-router approach).

**Rejected for v2:** Would require infrastructure (embedding store, similarity computation) that doesn't exist in the skill architecture. The LLM running the skill IS the semantic engine -- giving it better classification instructions (structural signal table) achieves 80% of the benefit at zero infrastructure cost.

### LLM scoring of all patterns before routing

**Considered:** Have the LLM score each pattern 0-100 before selecting (from v1 backlog, item: scoring-based routing).

**Deferred:** The query-type classifier handles the compound query problem (the primary gap). Scoring-based routing addresses false-positive matching, which is a lower-priority issue. Can be added as a Phase C if false positives become a measurable problem.

## Dependencies and Prerequisites

- v1 dojo and advisor skills must be merged and working (currently on `chore/fold-claude-code-guide-findings` branch)
- No new infrastructure required -- all changes are prompt-level (SKILL.md and mode files)
- No changes to pattern files or voice files

## Risk Analysis and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Extracted reference files not read by LLM | Low | Classifier/context logic skipped | Reference reads are explicit Step 1 instructions, same pattern as mode/voice reads |
| Query-type classifier misroutes | Medium | Wrong delivery template | Explicit naming = intentional, keyword = ambiguous. Tables, not heuristics |
| Compare mode output is too long (2 patterns x all slots) | Medium | Context bloat, slow response | Compare template selects 6 slots, not all 11. ~600 word target |
| Follow-up pronoun resolution fails | Medium | "Pattern not found" on valid follow-up | 1-message lookback + clear fallback message. `--context-pattern` flag as agent escape hatch |
| Cross-skill context bridge parses stale envelope | Low | Resolves wrong pattern | 1-message lookback limits staleness; explicit "No context found" fallback |
| Semantic signals produce different rankings than keywords alone | Medium | Non-deterministic advisor behavior | Signals are additive only; same scoring guide applies to all characteristics |
| LLM collapses classifier step on long queries | Medium | Skips classification, falls through to single | Classifier is a table (proven reliable), placed early in Step 1 |
| `context: fork` breaks follow-up resolution | Low | All follow-ups fail | Document constraint in SKILL.md; context resolution requires main-thread access |

## Testing Strategy

### Manual smoke test matrix (extends existing 29-test matrix)

| # | Query | Expected query_type | Expected mode | Expected pattern(s) |
|---|-------|-------------------|---------------|---------------------|
| 30 | `/dojo compare wave dag` | compare | compare | wave-computation, task-dag |
| 31 | `/dojo wave vs task-dag` | compare | compare | wave-computation, task-dag |
| 32 | `/dojo difference between retry and spec` | compare | compare | retry-with-resume, spec-as-source-of-truth |
| 33 | `/dojo compare wave wave` | compare (error) | N/A | Error: cannot compare with itself |
| 34 | `/dojo compare wave dag retry` | disambiguation | N/A | "3+ patterns. Which pair for compare?" |
| 35 | `/dojo wave dag retry` | disambiguation | N/A | "You named 3+ patterns. Which pair?" |
| 36 | `/dojo lookup wave dag` | compare | compare | wave-computation, task-dag |
| 37 | "explain that one" (after dojo response) | follow-up | sensei | (from dojo-envelope) |
| 38 | "explain that one" (after advisor response) | follow-up | sensei | (from advisor-envelope) |
| 39 | "explain that one" (no context) | follow-up (error) | N/A | "No pattern context found" |
| 40 | `/dojo explain --context-pattern=task-dag` | structured follow-up | sensei | task-dag |
| 41 | `/dojo compare --context-patterns=task-dag,wave-computation` | structured follow-up | compare | task-dag, wave-computation |
| 42 | `/advisor "CI pipeline: lint, test, build, deploy"` | N/A (advisor) | advisor | task-dag (high), wave-computation (medium) |

### Multi-turn test scenarios

These cannot be automated (`claude -p` has no conversation state). Manual interactive testing:

1. **Advisor-to-dojo handoff:** `/advisor "tasks with dependencies"` → "explain that one" → verify task-dag delivered in Sensei mode
2. **Sequential follow-ups:** `/dojo explain wave` → "now explain dag" → verify dag delivered (most recent envelope used, not wave)
3. **Agent structured follow-up:** `/dojo explain --context-pattern=task-dag` → verify direct routing without envelope parsing
4. **No context available:** Fresh conversation → "explain that one" → verify "No pattern context found" message

## v2 Backlog (deferred from this plan)

- **Pattern-combination awareness** -- curated pairings registry for advisor (5 pairs: execution, durability, quality, coordination, routing). Deferred because advisor's ranked output already communicates relevant patterns. Add when usage data shows demand
- **Scoring-based routing** -- score patterns 0-100 before selecting (from v1 backlog). Add as Phase C if false positives become measurable
- **Multi-pattern sequential output** -- 3+ patterns in sequence (e.g., "explain wave dag retry" delivers all three). Currently routes to disambiguation. No evidence of demand
- **Dynamic pairing discovery** -- derive pairings from pattern files' `related_patterns` slots instead of curated registry. More automated but less precise
- **Compare 3+ patterns** -- extend compare mode beyond 2. Currently routes to disambiguation
- **XML tag wrapping** -- wrap classification tables in `<classifier>` tags if routing drift is observed. Research suggests ~12% improvement in strict adherence

## File Summary

**New files: 3**

| File | Role | Lines | Phase |
|------|------|-------|-------|
| `.claude/skills/agentic-dojo/references/query-classifier.md` | Extracted query-type classification logic | ~30 | A1 |
| `.claude/skills/agentic-dojo/references/context-resolution.md` | Extracted follow-up context resolution logic | ~20 | A1 |
| `.claude/skills/agentic-dojo/references/mode-compare.md` | Comparison mode parameter (voice ID + synthesis template + constraints) | ~80 | A2 |

**Modified files: 2**

| File | Changes | Net lines | Phase |
|------|---------|-----------|-------|
| `.claude/skills/agentic-dojo/SKILL.md` | Reference reads for classifier + context, compare in Step 2, envelope schema, error contracts | +13 (207→~220) | A1, A2 |
| `.claude/skills/pattern-advisor/SKILL.md` | 3-line condensed semantic signal guidance | +3 (138→~141) | B1 |

**Unchanged files:**

- All 9 pattern files (`.claude/references/patterns/pattern-*.md`)
- All voice files (`voice-miyagi.md`, `voice-jarvis.md`, `voice-alfred.md`)
- `mode-sensei.md`, `mode-reference.md`, `mode-advisor.md`
- `.claude/CLAUDE.md`

## Sources and References

### Origin

- **Parent plan:** [docs/plans/agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md](agentic-dojo-skill/2026-02-21-feat-agentic-dojo-skill-plan.md) -- v1 architecture, v2 backlog items (scoring-based routing, compare mode, confidence field)
- **Agent-native architecture analysis:** Conversation session 2026-02-22 -- deterministic delivery, smarter routing as the design constraint

### Community Research (2026-02-22)

- [Amazon multi-agent BERT routing](https://x.com/omarsar0/status/2016880021030522997) (611 likes) -- fine-tuned classifier for multi-agent routing
- [MCP vs API routing framing](https://x.com/pvergadia/status/2024318030306496670) (479 likes) -- MCP offloads routing to the model
- [vLLM Semantic Router v0.1 Iris](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html) -- routing continuity across turns, 6 signal types
- [Botpress AI Agent Routing Guide 2026](https://botpress.com/blog/ai-agent-routing) -- compound queries as unsolved problem
- [aurelio-labs/semantic-router](https://github.com/aurelio-labs/semantic-router) -- embedding-based routing, 92-96% precision
- [LLMRouter library](https://github.com/ulab-uiuc/LLMRouter) -- 16+ routing strategies catalog
- [Intent Recognition gist](https://gist.github.com/mkbctrl/a35764e99fe0c8e8c00b2358f55cd7fa) -- LLM-as-classifier vs semantic routing tradeoffs

### Internal References

- Existing dojo SKILL.md: `.claude/skills/agentic-dojo/SKILL.md` (207 lines, the routing target)
- Existing advisor SKILL.md: `.claude/skills/pattern-advisor/SKILL.md` (138 lines)
- Community research from v1: `docs/plans/agentic-dojo-skill/reviews/community-research-report.md`
- v1 review findings: `docs/plans/agentic-dojo-skill/reviews/summary.md` (44 findings across 5 passes)
