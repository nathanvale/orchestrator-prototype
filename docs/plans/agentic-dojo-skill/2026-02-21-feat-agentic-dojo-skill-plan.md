---
title: "feat: Build agentic-dojo pattern knowledge skill"
type: feat
status: active
date: 2026-02-21
origin: docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md
---

# feat: Build agentic-dojo pattern knowledge skill

## Enhancement Summary

**Deepened on:** 2026-02-22
**Research agents used:** architecture-strategist, code-simplicity-reviewer, agent-native-reviewer, pattern-recognition-specialist, best-practices-researcher, patterns-skill-analyzer
**Review passes:** 5 (architect, skeptic, DX advocate, AI prompting expert x2, DX expert) + 1 (Claude Code guide sweep)
**Findings resolved:** 44 (30 original + 14 from Claude Code guide sweep)
**Community research:** 3 beats (skill architecture, persona/voice, prompt routing)
**Spike tested:** `use-when` frontmatter field (proven non-functional for skill discovery)

### Key Improvements

1. **SKILL.md is a Higher-Order Prompt (HOP)** -- the router is the fixed wrapper (classify, dispatch, synthesize); mode files and pattern files are the variable parameters. SKILL.md never generates content itself -- it orchestrates the combination of mode + pattern through explicit scoped instructions
2. **Router uses table-based classification** (not prose conditionals) -- borrowed from the working `patterns` skill which achieves 95-line SKILL.md with this approach
3. **Pattern files are mode-agnostic** -- neutral content parameters with canonical frontmatter slot maps. No mode-specific framing
4. **Agent-native parity** -- structured routing envelope (`dojo-envelope`) with `route_reason` field on every response. Both human and agent consumers get actionable metadata
5. **SKILL.md target tightened** to 150-200 lines (the `patterns` skill proves 95 lines is achievable for a 9-topic router)
6. **Shared pattern library** -- pattern files live at `.claude/references/patterns/` as an explicit Read path convention (not a Claude Code framework concept -- SKILL.md must contain explicit Read instructions for each file)
7. **Hardened routing** -- collapsed to 3 steps (Route, Read, Synthesize) for reliable execution. Table-based classification with pattern alias table, explicit "no match" framing
8. **Explicit defaults** for every routing dimension -- Sensei is the default mode for human queries; bare slugs with no context default to Reference
9. **v1 scope: 2 modes** -- Sensei + Reference only. Sparring, Kata, Buddy deferred to v2 with full specs documented
10. **Pattern Advisor** -- separate skill (Phase 5) with Alfred Pennyworth voice, shared pattern library. Handoff commands are copy-paste suggestions for the user (skills cannot invoke other skills)
11. **Testing via manual interactive smoke tests + envelope parsing** -- `claude -p` cannot invoke slash commands, so automated CLI testing is not viable. Test matrix serves as a manual checklist with envelope-based verification

### New Considerations Discovered

- The SKILL.md is itself a HOP -- it should pass scoped instructions down to each reference file load, not just load files and hope Claude figures out the connection
- Few-shot worked examples improve classification accuracy (community research) -- the worked example is a should-fix, not nice-to-have
- LLMs resist saying "no match" -- the error contract must explicitly frame "Pattern not found" as correct behavior
- Steps 3d-3g will fuse during generation (SIFo benchmark confirms step-skipping in long chains) -- collapsed to single 3d with sub-bullets
- Template substitution with inline `{{pattern.*}}` expansion breaks on multi-line content -- mode templates rewritten as section-ordering instructions referencing slot names
- Agent zero-state detection is infeasible (skills can't detect "no prior human turn") -- always emit human format
- The existing `patterns` skill router is a battle-tested reference implementation at 95 lines -- borrow its table schema

### Claude Code Guide Sweep Findings (2026-02-22)

14 findings from 6 parallel claude-code-guide agents + 1 empirical spike:

**Critical (must fix):**
- **F1:** `use-when` is not a documented frontmatter field. Spike proved it doesn't surface in skill discovery list -- only `description` is shown. Filed: [anthropics/claude-code#27569](https://github.com/anthropics/claude-code/issues/27569). Fix: merge trigger conditions into `description`
- **F2:** `skill:` frontmatter field doesn't exist for command-to-skill delegation. Commands and skills are the same thing. Filed: [anthropics/claude-code#27570](https://github.com/anthropics/claude-code/issues/27570). Fix: use `name: dojo` in SKILL.md, drop separate command file
- **F3:** `claude -p` cannot invoke slash commands (interactive mode only). Entire test harness design is invalid. Fix: manual interactive testing + envelope parsing
- **F4:** Pattern Advisor `/dojo` handoff commands are inert text -- slash commands only parse from user input. Fix: frame as copy-paste suggestions, or have advisor SKILL.md instruct Claude to invoke dojo via Skill tool

**Important (should fix):**
- **F5:** `.claude/references/` is not a Claude Code concept -- just an arbitrary directory. Fix: frame correctly as explicit Read path, not framework feature
- **F6:** Skill `references/` subdirectory is not auto-discovered. SKILL.md must explicitly link each file. Fix: already handled by Read column in routing tables
- **F7:** 5 sequential steps too many for reliable execution -- Claude collapses steps. Fix: collapse to 3 steps (Route, Read, Synthesize)
- **F8:** Envelope will be forgotten ~10-20% of the time on long responses. Fix: bracket instruction (state at top AND bottom of synthesis)
- **F9:** Command file redundant since SKILL.md with `name:` creates the slash command. Fix: drop `.claude/commands/dojo.md`

**Low (nice to fix):**
- **F10:** "Freshest context" read order is cargo-culting -- imperative framing matters more than read position. Fix: drop rationale, use simplest order
- **F11:** No conversation context carryover for pattern detection. Fix: add fallback to check preceding turns
- **F12:** No `disable-model-invocation` decision documented. Fix: set to false (allow auto-invocation)
- **F13:** "30% sensitivity reduction" claim is unsupported. Fix: keep worked example, drop specific statistic
- **F14:** "Anthropic warns about nested refs" claim is fabricated. Fix: drop claim, keep flat structure on its own merits

---

## Overview

Build a Claude Code skill that packages all orchestration patterns from stages 1-3 into a router-based knowledge system with two character-voiced interaction modes (Sensei and Reference). The skill uses progressive disclosure (Anthropic's three-tier architecture) and serves both humans learning agentic coding patterns AND agents needing pattern guidance during execution.

This is novel -- no one in the community is building multi-mode router skills yet (see brainstorm: `docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md`).

## Problem Statement / Motivation

The orchestrator-prototype has 9 pattern docs, a full skill, agent definitions, and specs across stages 1-3. This knowledge is scattered across files and branches -- useful for reading, but not queryable. There's no way to ask "explain wave computation" or "help me debug my retry logic" and get a focused, style-appropriate answer grounded in the actual implementation.

The dojo makes this knowledge interactive and accessible -- as a teaching tool, a coding companion, and a reference for other agents.

## Proposed Solution

A single skill (`agentic-dojo`) whose SKILL.md is a **Higher-Order Prompt (HOP)** -- a prompt that orchestrates other prompts rather than generating content itself.

The HOP pattern applied here:

**Fixed wrapper (SKILL.md router):**
- Classify intent: which mode? which pattern?
- Load the right parameter files (mode + pattern + voice references)
- Pass scoped instructions to each: extract voice ID from mode, extract voice rules from voice, extract content from pattern
- Synthesize: apply voice rules to content, transform per mode instructions
- The router never generates pattern knowledge or character voice -- it orchestrates their combination

**Variable parameters (reference files):**
- **Mode files** = voice ID + output format + synthesis template as section-ordering instructions (how to present)
- **Voice files** = voice rules + pacing + lexicon + substitution table (how to sound)
- **Pattern files** = content with canonical frontmatter slot maps (what to present)

This means:
1. Adding a 3rd mode = one new mode file. Zero pattern file changes.
2. Adding a 10th pattern = one new pattern file. Zero mode file changes.
3. The synthesis step lives in SKILL.md once, not duplicated across mode files.

Character voices (Miyagi, JARVIS) live in voice reference files, not as global output styles (see brainstorm: Output Styles vs Skills decision).

## Technical Approach

### Architecture (HOP Structure)

```
.claude/
  references/
    patterns/                         # SHARED -- generated from docs/patterns/
      pattern-builder-validator.md
      pattern-dispatch-loop.md
      pattern-higher-order-prompt.md
      pattern-task-dag.md
      pattern-wave-computation.md
      pattern-spec-as-source-of-truth.md
      pattern-retry-with-resume.md
      pattern-fast-path-gate.md
      pattern-iterative-refinement.md
  skills/
    agentic-dojo/
      SKILL.md                        # THE HOP: classify, dispatch, synthesize (150-200 lines)
      references/                     # Dojo-specific files (modes, voices)
        mode-sensei.md                # Parameter: teaching format + voice ID
        mode-reference.md             # Parameter: quick lookup format + voice ID
        voice-miyagi.md               # Voice rules: Mr. Miyagi
        voice-jarvis.md               # Voice rules: JARVIS
    pattern-advisor/
      SKILL.md                        # Advisor HOP wrapper
      references/
        mode-advisor.md               # Advisor mode
        voice-alfred.md               # Voice rules: Alfred Pennyworth
```

**Why shared patterns?** Both the dojo and the Pattern Advisor skill consume the same pattern library. Sharing at `.claude/references/patterns/` eliminates duplication and ensures both skills always reference the same content. Note: `.claude/references/` is not a Claude Code framework concept -- it's a project convention. Each SKILL.md must include explicit Read instructions pointing to these files.

**Why flat skill references?** The `patterns` skill uses flat `references/*.md` and works reliably. Mode and voice files sit directly in each skill's `references/` with `mode-` and `voice-` prefixes. Skill `references/` directories are not auto-discovered by Claude Code -- SKILL.md must explicitly link to each file with instructions on when to read it. The Read column in the routing tables serves this purpose.

**Progressive disclosure tiers (HOP layers):**
1. **Tier 1 -- Frontmatter** (~100 tokens) -- `description` field loaded at startup into the 2% character budget. This is the "does this HOP apply?" check. Trigger conditions are packed into `description` (not a separate `use-when` field)
2. **Tier 2 -- SKILL.md body** (target 150-200 lines, hard ceiling 250) -- the HOP fixed wrapper: classification tables, scoped pass-down instructions, synthesis rules
3. **Tier 3 -- References** (on-demand) -- the HOP variable parameters: mode files declare how to present, voice files declare how to sound, pattern files declare what to present. Zero cost until accessed

**HOP execution flow (3 steps):**
```
User: "explain wave computation"

SKILL.md (the HOP):
  Step 1 (Route):
    "explain wave computation" is not a reserved keyword. Continue.
    No prefix override. "explain" matches Sensei trigger. Mode = Sensei.
    "wave computation" matches alias "wave" -> wave-computation.
  Step 2 (Read):
    1. Read mode-sensei.md -> voice_id = miyagi
    2. Read pattern-wave-computation.md -> content with slot map
    3. Read voice-miyagi.md -> voice rules, pacing, lexicon
  Step 3 (Synthesize):
    Line 1: [Sensei | Wave Computation]
    Body: Follow Sensei template in Miyagi voice using wave-computation slots
    Last: dojo-envelope block with route metadata
```

The HOP never generates pattern knowledge or character voice. It classifies, loads parameters, and orchestrates their combination through the synthesis step.

### Research Insights: Router Design

**Best practice: Table-based classification outperforms prose conditionals.** The local `patterns` skill achieves a working 9-topic router in 95 lines using a 3-column classification table (`Intent | Trigger Signals | Reference File`). Claude pattern-matches on tables more reliably than prose conditionals. The dojo should use two separate tables (mode detection, then pattern detection) executed in order.

**Best practice: Worked examples are the most valuable lines in a router.** After the classification table, a worked example showing the full routing chain teaches Claude the routing better than abstract rules. Few-shot examples are a well-established technique for improving classification accuracy.

**Best practice: Every routing dimension needs an explicit default.** The `patterns` skill handles empty arguments with `(empty) -> Ask the user what they want to do`. The dojo needs defaults for: no mode signal (default to Sensei), no pattern match (load pattern index and ask), empty arguments (show available modes and patterns).

**Anti-pattern: Silent fallthrough.** Never silently fall through to a default. Show the routing table if the query is ambiguous. This helps both humans and agents detect misroutes.

**Anti-pattern: Force-matching.** LLMs resist saying "no match" -- they will force-match a low-confidence result rather than emit "not found." The error contract must explicitly instruct Claude that "Pattern not found" is correct and expected when no pattern matches.

### Conventions to Follow

Based on repo research of `stage/3-full`:

| Convention | Rule |
|------------|------|
| SKILL.md frontmatter | `description` (with trigger conditions inline), `name: dojo`, `allowed-tools`, `argument-hint`. No `use-when` field (not functional -- see F1) |
| Allowed tools | `allowed-tools: Read, Glob, Grep` (knowledge skill, not execution) |
| Pattern reference files | YAML frontmatter with canonical slot map + `display_name` + `one_liner` |
| Mode reference files | Open with `**Character:**` and `**Purpose:**` metadata |
| Voice reference files | Open with `**Character:**` and `**Purpose:**` metadata. Substitutions as lookup table |
| Reference directory | Dojo-specific files in `references/` with `mode-` and `voice-` prefixes. Shared patterns at `.claude/references/patterns/` |
| Scope boundary | SKILL.md includes "What This Skill Does NOT Do" section (placed between Step 2 and Step 3) |
| HOP separation | SKILL.md contains the synthesis step. Mode files declare voice ID + synthesis template (section-ordering). Voice files declare voice rules. Pattern files declare content. No file generates both |
| Hard line ceiling | SKILL.md: 250 lines max. Mode files: 120 lines max. Pattern files: 120 lines max |
| Alias matching | Each alias is matched as a complete word. No substring matching |

### Research Insights: Conventions

**Frontmatter fix (F1, spike-proven):** `use-when` is not a documented Claude Code frontmatter field. A spike on 2026-02-22 proved that only `description` text surfaces in the skill discovery list (the 2% character budget). The `use-when` field is invisible to Claude during auto-detection. Filed as [anthropics/claude-code#27569](https://github.com/anthropics/claude-code/issues/27569).

The `patterns` skill demonstrates the correct approach: pack "Use when:" trigger conditions inline within the `description` field.

Corrected frontmatter:

```yaml
---
name: dojo
description: >-
  Pattern knowledge for agentic orchestration. Teaches dispatch loops,
  DAGs, wave computation, retry, HOP, builder-validator, iterative
  refinement, fast path, spec files, idempotency, topological sort,
  task decomposition, and agent coordination through two modes.
  Use when: the user asks about agentic patterns, orchestration concepts,
  dispatch loops, DAG execution, wave computation, retry logic, higher-order
  prompts, builder-validator, spec files, fast path, or iterative
  refinement. Also use when an agent queries for pattern guidance.
argument-hint: "e.g. 'explain wave computation' or 'lookup retry'"
allowed-tools: Read, Glob, Grep
---
```

**`name: dojo` (F2):** Creates the `/dojo` slash command directly from the SKILL.md. No separate command file needed -- commands and skills are the same thing in Claude Code. Filed as [anthropics/claude-code#27570](https://github.com/anthropics/claude-code/issues/27570).

**`disable-model-invocation` (F12):** Not set (defaults to false) -- allow Claude to auto-invoke the dojo when it detects a relevant question. The description contains enough trigger keywords for reliable auto-detection.

**Keyword expansion:** The description must include all 9 canonical pattern names AND their key synonyms (idempotency, topological sort, executor-critic, spec format, agent coordination) for reliable auto-detection by both humans and agents.

### SKILL.md Draft (Complete Hardened Version)

Collapsed from 5 steps to 3 (F7) for reliable execution. Claude tends to collapse/skip steps in long sequential chains.

```markdown
---
name: dojo
description: >-
  Pattern knowledge for agentic orchestration. Teaches dispatch loops,
  DAGs, wave computation, retry, HOP, builder-validator, iterative
  refinement, fast path, spec files, idempotency, topological sort,
  task decomposition, and agent coordination through two modes.
  Use when: the user asks about agentic patterns, orchestration concepts,
  dispatch loops, DAG execution, wave computation, retry logic, higher-order
  prompts, builder-validator, spec files, fast path, or iterative
  refinement. Also use when an agent queries for pattern guidance.
argument-hint: "e.g. 'explain wave computation' or 'lookup retry'"
allowed-tools: Read, Glob, Grep
---

# Agentic Dojo

A Higher-Order Prompt for pattern knowledge. This skill never generates
content itself -- it classifies intent, loads mode + pattern parameters,
and synthesizes them through scoped instructions.

This skill never writes code, creates files, or modifies the codebase.

IMPORTANT: Every response MUST end with a dojo-envelope block (see
Envelope Format below). Do not skip it.

---

## Step 1: Route

Classify mode and pattern from $ARGUMENTS. If empty or matches a
reserved keyword (help, list, patterns, modes, ?), emit zero-state
and stop.

Zero-state (max 12 lines):

Agentic Dojo -- pattern knowledge for orchestration

Modes:
  explain <pattern>    Sensei teaches the concept (default)
  lookup <pattern>     Quick reference with structured output

Patterns:
  builder-validator    dispatch-loop     higher-order-prompt
  task-dag             wave-computation  spec-as-source-of-truth
  retry-with-resume    fast-path-gate    iterative-refinement

Examples:
  /dojo explain wave computation    (short forms: wave, dag, spec, hop...)
  /dojo lookup retry-with-resume

### Mode Detection

Priority cascade (first match wins):

**1. Prefix override** -- if $ARGUMENTS starts with a prefix below,
strip it and use the mapped mode. Remaining text = pattern query.

| Prefix | Mode |
|--------|------|
| sensei: | sensei |
| explain: | sensei |
| reference: | reference |
| lookup: | reference |

**2. Trigger words** -- classify from the query text.

| Query Signals | Mode |
|---------------|------|
| explain, teach, how does, why does, understand, what is | Sensei |
| lookup, define, quick, list, yaml | Reference |
| (both Sensei and Reference signals present) | Sensei |
| (no clear signal) | Sensei |

Sensei is the default for human queries. Bare pattern slugs with no
conversation context (agent invocations) default to Reference.

### Pattern Detection

**1. Alias table** -- each alias matched as a complete word. No substring matching.

| Alias | Resolves To |
|-------|-------------|
| wave, waves | wave-computation |
| dag, graph | task-dag |
| retry, resume | retry-with-resume |
| hop | higher-order-prompt |
| fast, gate | fast-path-gate |
| spec, source-of-truth, source, plan-file | spec-as-source-of-truth |
| builder, validator | builder-validator |
| dispatch, loop | dispatch-loop |
| refine, iterate | iterative-refinement |

**2. Keyword table** -- if no alias matched.

| Keywords | Pattern | File |
|----------|---------|------|
| builder, validator, verify, executor, critic | Builder/Validator | .claude/references/patterns/pattern-builder-validator.md |
| dispatch, loop, coordinator, queue | Dispatch Loop | .claude/references/patterns/pattern-dispatch-loop.md |
| HOP, higher-order, parameterize, agent-agnostic | Higher-Order Prompt | .claude/references/patterns/pattern-higher-order-prompt.md |
| DAG, task graph, decompose, dependencies | Task DAG | .claude/references/patterns/pattern-task-dag.md |
| wave, topological, parallel, execution order | Wave Computation | .claude/references/patterns/pattern-wave-computation.md |
| spec, source of truth, plan file, persist | Spec as Source of Truth | .claude/references/patterns/pattern-spec-as-source-of-truth.md |
| retry, resume, failure, recover, idempotent | Retry with Resume | .claude/references/patterns/pattern-retry-with-resume.md |
| fast path, simple, skip, gate, threshold | Fast Path Gate | .claude/references/patterns/pattern-fast-path-gate.md |
| refine, iterate, clarify, improve, feedback | Iterative Refinement | .claude/references/patterns/pattern-iterative-refinement.md |
| (no pattern match) | -- | Show pattern index and ask user to clarify |

**3. Conversation fallback** -- if no pattern detected from $ARGUMENTS,
check if a pattern was discussed in the preceding conversation turns.

### Error Contract

| Condition | Message | Behavior |
|-----------|---------|----------|
| Unknown pattern | `Pattern "{input}" not found. Available: {list}. Did you mean "{closest}"?` | If input prefixes exactly one slug or alias, suggest it. Otherwise list all without a specific suggestion |
| Unknown mode | `Mode "{input}" not recognized. Available modes: explain (sensei), lookup (reference).` | Show both user-facing and internal names |
| Multiple patterns detected | `Multiple patterns detected: {list}. Which one would you like?` | List matches and ask user to pick. Do not auto-select |
| Missing synthesis slot | `[Not documented for this pattern]` | Inline substitution, do not fail |

If no pattern in the alias table, keyword table, or conversation
context matches the input, say so explicitly. Do not force-match a
low-confidence result. It is correct to say "Pattern not found" when
no pattern matches.

## What This Skill Does NOT Do

- Never writes code, creates files, or modifies the codebase
- Never executes scripts or runs commands
- Does not cover patterns from stages 4-9 (team profiles, HITL, parallel dispatch, etc.)
- Does not cover Parallel Dispatch (stage 8) -- distinct from wave-level parallelism
- Does not cover Difficulty Routing (stage 6) -- distinct from Fast Path Gate
- Does not replace the orchestrator skill -- this teaches patterns, that executes them
- Does not compare patterns side-by-side (v2 consideration)

## Step 2: Read

Read these three files in order:

1. The mode file matching the detected mode:
   - Sensei: `references/mode-sensei.md` -- note the Voice ID
   - Reference: `references/mode-reference.md` -- note the Voice ID
2. The pattern file from the File column in the keyword table above
3. The voice file matching the Voice ID from the mode file:
   - miyagi: `references/voice-miyagi.md`
   - jarvis: `references/voice-jarvis.md`

## Step 3: Synthesize

Generate the response:
- Line 1: breadcrumb [Mode | Pattern Display Name]
- Body: follow the mode's Synthesis Template, using the pattern's
  slot content as source material (reference by slot name, do not
  expand inline). Write in the voice specified by the voice file.
  Use imperative voice rules from the voice file -- they take precedence.
  If a slot has no content, write '[Not documented for this pattern]'.
- Do not add content, formatting, or structure beyond what the
  template and voice specify.

IMPORTANT: End every response with the routing envelope. Do not skip it.

## Worked Example

Input: /dojo explain wave computation

Step 1 (Route):
  "explain wave computation" is not a reserved keyword. Continue.
  No prefix override (no colon). Check trigger words.
  "explain" matches Sensei trigger. Mode = Sensei.
  "wave computation" matches alias "wave" -> wave-computation.
  Pattern = wave-computation. Route reason: trigger-word: explain

Step 2 (Read):
  1. Read references/mode-sensei.md. Voice ID = miyagi.
  2. Read .claude/references/patterns/pattern-wave-computation.md.
  3. Read references/voice-miyagi.md.

Step 3 (Synthesize):
  Line 1: [Sensei | Wave Computation]
  Body: Follow Sensei template sections in Miyagi voice using
        wave-computation slots as source material
  Last: dojo-envelope block with route metadata

## Envelope Format

Every response MUST end with a routing envelope in a fenced code block
using the `dojo-envelope` info string (not `yaml`):

```dojo-envelope
mode_selected: sensei
pattern_selected: wave-computation
route_reason: "trigger-word: explain"
warnings: []
```

`route_reason` values:
- `prefix-override: sensei:` (or `reference:`, `explain:`, `lookup:`)
- `exact-slug`
- `alias: wave`
- `trigger-word: explain`
- `conversation-context`
- `default`

No `confidence` field. Confidence is derivable from route_reason:
prefix-override and exact-slug are high, trigger-word and alias are
medium, default is low.
```

**Key HOP insight:** The synthesis step (Step 3) lives in SKILL.md once. Mode files don't contain synthesis logic -- they declare parameters (voice ID, synthesis template as section-ordering instructions). Voice files declare how to sound (using imperative framing for reliable application). Pattern files declare content with canonical frontmatter slot maps. SKILL.md combines them. This is the same HOP separation as the orchestrator: fixed wrapper + variable parameters.

**HOP purity rule:** SKILL.md must contain zero mode-specific logic. No "if Reference mode, do X" conditionals. All mode-specific behavior lives in mode files. SKILL.md simply executes whatever synthesis template the selected mode file provides.

**Envelope reliability (F8):** The envelope instruction is stated twice in the SKILL.md (once at the top, once at the end of Step 3) to bracket the generation step. Claude tends to forget suffix instructions on long responses -- repetition is the mitigation.

### Canonical Pattern Frontmatter

Every pattern file includes this YAML frontmatter with an explicit slot map. The slot contract spec is the source of truth -- all pattern files use identical slot key names.

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

Mode synthesis templates reference slots by name as source material instructions. They do NOT use inline `{{pattern.*}}` expansion (which breaks on multi-line content). Instead:

**Before (broken):**
```
Open with a brief analogy. Then teach using:
- Summary: {{pattern.quick_summary}}
- Concept: {{pattern.core_mechanism}}
```

**After (correct):**
```
Generate these sections in order:
1. Opening analogy (1-2 sentences connecting the pattern to everyday experience)
2. "Summary" -- present the pattern's Quick Summary slot
3. "How It Works" -- explain using the pattern's Core Mechanism slot
4. "In Practice" -- walk through the pattern's Implementation Notes slot
5. "Watch Out" -- list the pattern's Failure Modes slot as pitfalls
6. "See Also" -- reference the pattern's Related Patterns slot
```

Claude reads the pattern file in 3b, holds the content in context, and uses the mode template as a structural guide for what to pull from where. The slot names are pointers, not containers.

### Implementation Phases

#### Phase 1: Branch + Dojo SKILL.md + Directory Structure (Commit 1)

Create experimental branch, directory structure for shared patterns and dojo skill, and the complete SKILL.md HOP.

**Tasks:**
- Create branch `experiment/agentic-dojo` from `stage/3-full`
- Create directory structure: `.claude/references/patterns/`, `.claude/skills/agentic-dojo/references/`, `.claude/skills/pattern-advisor/references/`
- Write complete SKILL.md with hardened HOP structure (3 steps: Route, Read, Synthesize), `name: dojo` frontmatter, inline trigger conditions in `description`
- Create stub files for mode/voice/pattern so the router never points to missing files
- Update `.claude/CLAUDE.md` to mention the dojo skill and add "Adding a New Pattern" checklist
- Verify path resolution for shared pattern files (explicit Read paths, not framework feature)

**Files:**

| File | Action |
|------|--------|
| `.claude/skills/agentic-dojo/SKILL.md` | Create -- full HOP router with `name: dojo`, target 150-200 lines |
| `.claude/skills/agentic-dojo/references/mode-sensei.md` | Create -- stub |
| `.claude/skills/agentic-dojo/references/mode-reference.md` | Create -- stub |
| `.claude/skills/agentic-dojo/references/voice-miyagi.md` | Create -- stub |
| `.claude/skills/agentic-dojo/references/voice-jarvis.md` | Create -- stub |
| `.claude/references/patterns/pattern-*.md` (9 stubs) | Create -- one-liner stubs |
| `.claude/CLAUDE.md` | Modify -- add dojo skill reference + "Adding a New Pattern" checklist |

**Adding a New Pattern checklist (for CLAUDE.md):**

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

**Success criteria:**
- Branch exists off `stage/3-full`
- SKILL.md is a complete hardened HOP with 3-step structure (Route, Read, Synthesize) and under 250 lines
- All stub files exist so the router never points to missing files
- SKILL.md has valid frontmatter: `name: dojo`, `description` (with inline trigger conditions), `argument-hint`, `allowed-tools`
- No `use-when` field (not functional per spike)
- SKILL.md contains zero mode-specific logic (HOP purity)
- Envelope instruction appears twice (top + bottom bracket)
- Paths to shared pattern files use explicit `.claude/references/patterns/` paths
- `.claude/CLAUDE.md` has "Adding a New Pattern" checklist

#### Phase 2: Dojo Mode + Voice Files (Commit 2)

Write 2 mode reference files as **HOP parameter declarations** -- each declares voice ID, synthesis template (section-ordering instructions), and constraints.
Write 2 voice reference files as **voice rule libraries** -- each declares voice rules, pacing, lexicon, and substitution table.

**Tasks:**
- Write `references/mode-sensei.md` -- teaching synthesis template + `voice_id: miyagi`
- Write `references/mode-reference.md` -- quick lookup synthesis template + `voice_id: jarvis` (with structured YAML output)
- Write `references/voice-miyagi.md` -- voice rules for Mr. Miyagi
- Write `references/voice-jarvis.md` -- voice rules for JARVIS

**Files:**

| File | Action |
|------|--------|
| `.claude/skills/agentic-dojo/references/mode-sensei.md` | Create (replace stub) |
| `.claude/skills/agentic-dojo/references/mode-reference.md` | Create (replace stub) |
| `.claude/skills/agentic-dojo/references/voice-miyagi.md` | Create (replace stub) |
| `.claude/skills/agentic-dojo/references/voice-jarvis.md` | Create (replace stub) |

**Mode file structure -- parameter declarations (each ~80-120 lines):**

Mode files are variable parameters for the HOP. They declare WHAT the format is and WHICH voice to use. SKILL.md Step 3 uses these declarations to synthesize the response.

```markdown
# [Mode Name] Mode

**Character:** [Name] ([Source])
**Purpose:** [When to use this mode]

---

## Voice ID

[Reference to a voice file, e.g., `miyagi` or `jarvis`]

## Synthesis Template

[Section-ordering instructions referencing slot names. NOT inline
{{pattern.*}} expansion. Each numbered item tells SKILL.md Step 3
which slot content to present and how to frame it.]

Generate these sections in order:
1. [Section instruction referencing a slot name]
2. [Section instruction referencing a slot name]
...

## Constraints

[Do's, don'ts, and fallback rules for this mode]
```

**Voice file structure -- parameter declarations (each ~60-100 lines):**

Voice files are variable parameters for the HOP. They declare HOW to sound (tone, pacing, lexicon, substitution table).

```markdown
# [Voice Name]

**Character:** [Name] ([Source])
**Purpose:** [When to use this voice]

---

## Voice Rules

[Character description, voice personality, stance]

## Pacing

[Sentence length, rhythm, cadence]

## Lexicon

[Preferred terms, phrasing]

## Substitutions

| Instead of | Use |
|------------|-----|
| optimize | refine |
| algorithm | approach |

## Do / Don't

[Do's and don'ts]

## Quote Policy

[Paraphrase-first; short quotes only if allowed]
```

**HOP parameter rules applied:**

1. **Reference YAML output:** `mode-reference.md` synthesis template declares YAML-first output format. SKILL.md Step 3 simply follows the template -- no mode-specific conditional in SKILL.md.

2. **Synthesis templates as section-ordering:** Both mode files express their synthesis template as numbered section-ordering instructions that reference pattern slot names as source material. This avoids inline `{{pattern.*}}` expansion which breaks on multi-line content.

3. **Agent envelope in both modes:** Both synthesis templates include the `dojo-envelope` block as their final section.

**Success criteria:**
- Both mode files are parameter declarations (voice ID + synthesis template + constraints)
- Both voice files are parameter declarations (voice rules + pacing + lexicon + substitution table)
- No mode file contains synthesis logic -- that's SKILL.md Step 3's job
- Each mode file under 120 lines
- Reference mode declares structured YAML output in its synthesis template
- Each file is self-contained (no nested references)
- SKILL.md still contains zero mode-specific logic after mode files are written

#### Phase 3: Shared Pattern Library (Commit 3)

Manually create all 9 pattern files from `docs/patterns/` source docs into the shared pattern library at `.claude/references/patterns/`. Each file conforms to the canonical frontmatter slot contract.

**Tasks:**
- For each of the 9 patterns in `docs/patterns/`, create an adapted version in `.claude/references/patterns/`
- Each pattern file includes YAML frontmatter with canonical slot map (`slug`, `display_name`, `one_liner`, `slots`)
- Adaptations: sections match the slot contract (Quick Summary, When To Use, Core Mechanism, Key Rules, Implementation Notes, Failure Modes, Signals & Diagnostics, Tradeoffs, Related Patterns, Source Anchors)
- Pattern files are mode-agnostic -- they declare WHAT to teach, not HOW to present it
- Target: 80-120 lines each
- **Authoring verification:** For each pattern file, cross-check its `slots` map contains every key referenced by mode-sensei.md AND mode-reference.md synthesis templates

**Files:**

| File | Action | Source |
|------|--------|--------|
| `.claude/references/patterns/pattern-builder-validator.md` | Create (replace stub) | `docs/patterns/builder-validator.md` |
| `.claude/references/patterns/pattern-dispatch-loop.md` | Create (replace stub) | `docs/patterns/dispatch-loop.md` |
| `.claude/references/patterns/pattern-higher-order-prompt.md` | Create (replace stub) | `docs/patterns/higher-order-prompt.md` |
| `.claude/references/patterns/pattern-task-dag.md` | Create (replace stub) | `docs/patterns/task-dag.md` |
| `.claude/references/patterns/pattern-wave-computation.md` | Create (replace stub) | `docs/patterns/wave-computation.md` |
| `.claude/references/patterns/pattern-spec-as-source-of-truth.md` | Create (replace stub) | `docs/patterns/spec-as-source-of-truth.md` |
| `.claude/references/patterns/pattern-retry-with-resume.md` | Create (replace stub) | `docs/patterns/retry-with-resume.md` |
| `.claude/references/patterns/pattern-fast-path-gate.md` | Create (replace stub) | `docs/patterns/fast-path-gate.md` |
| `.claude/references/patterns/pattern-iterative-refinement.md` | Create (replace stub) | `docs/patterns/iterative-refinement.md` |

**Success criteria:**
- All 9 pattern references created with canonical frontmatter slot maps
- All frontmatter `slots` maps use identical key names matching the slot contract
- Each under 120 lines
- No mode-specific content in pattern files
- Cross-links work from SKILL.md pattern index
- Authoring verification passed: every key in mode templates exists in pattern slots maps

#### Phase 4: Testing (Commit 4)

Test the `/dojo` skill through manual interactive smoke tests and envelope-based verification. No separate command file is needed -- `name: dojo` in SKILL.md creates `/dojo` directly (F2, F9).

**Why not automated CLI testing (F3)?** `claude -p` (headless mode) cannot invoke slash commands or skills -- they are interactive-mode only. The original `scripts/test-routing.sh` design using `claude -p "/dojo ..."` would silently fail. See Claude Code docs: "User-invoked skills like /commit and built-in commands are only available in interactive mode."

**Tasks:**
- Execute routing test matrix (~29 tests) manually in interactive mode
- Verify envelope is present and parseable on each response
- Parse `dojo-envelope` block (more reliable than breadcrumb line 1)
- Document test results
- Add `test-results/` to `.gitignore` for any saved failure output

**Files:**

| File | Action |
|------|--------|
| `.gitignore` | Modify -- add `test-results/` |

**Testing approach:**

1. **Manual interactive smoke tests** -- invoke `/dojo <prompt>` in a live Claude Code session. Verify routing via the `dojo-envelope` block (mode_selected, pattern_selected, route_reason). The envelope is more reliable to verify than the breadcrumb line because it's structured and grep-able.

2. **Envelope-first verification** -- for each test, check:
   - `mode_selected` matches expected mode
   - `pattern_selected` matches expected pattern
   - `route_reason` is a valid value (prefix-override, exact-slug, alias, trigger-word, conversation-context, default)
   - `warnings` is present (even if empty)

3. **Failure recording** -- on any misroute, save the full response to `test-results/<prompt-slug>.md` for analysis.

**Test matrix (29 tests):**

**Happy path -- Sensei mode (9 tests):**

| # | Prompt | Expected Mode | Expected Pattern |
|---|--------|--------------|-----------------|
| 1 | "explain builder-validator" | Sensei | Builder/Validator |
| 2 | "explain dispatch-loop" | Sensei | Dispatch Loop |
| 3 | "explain higher-order-prompt" | Sensei | Higher-Order Prompt |
| 4 | "explain task-dag" | Sensei | Task DAG |
| 5 | "explain wave-computation" | Sensei | Wave Computation |
| 6 | "explain spec-as-source-of-truth" | Sensei | Spec as Source of Truth |
| 7 | "explain retry-with-resume" | Sensei | Retry with Resume |
| 8 | "explain fast-path-gate" | Sensei | Fast Path Gate |
| 9 | "explain iterative-refinement" | Sensei | Iterative Refinement |

**Happy path -- Reference mode (9 tests):**

| # | Prompt | Expected Mode | Expected Pattern |
|---|--------|--------------|-----------------|
| 10 | "lookup builder-validator" | Reference | Builder/Validator |
| 11 | "lookup dispatch-loop" | Reference | Dispatch Loop |
| 12 | "lookup higher-order-prompt" | Reference | Higher-Order Prompt |
| 13 | "lookup task-dag" | Reference | Task DAG |
| 14 | "lookup wave-computation" | Reference | Wave Computation |
| 15 | "lookup spec-as-source-of-truth" | Reference | Spec as Source of Truth |
| 16 | "lookup retry-with-resume" | Reference | Retry with Resume |
| 17 | "lookup fast-path-gate" | Reference | Fast Path Gate |
| 18 | "lookup iterative-refinement" | Reference | Iterative Refinement |

**Routing tests (5 tests):**

| # | Prompt | Expected Mode | Expected Pattern | Why |
|---|--------|--------------|-----------------|-----|
| 19 | "explain wave computation" | Sensei | Wave Computation | Explicit verb |
| 20 | "how does the DAG work" | Sensei | Task DAG | Default for ambiguous human queries |
| 21 | "lookup retry-with-resume" | Reference | Retry with Resume | Explicit verb |
| 22 | "reference: wave-computation" | Reference | Wave Computation | Prefix override |
| 23 | "sensei: fast-path-gate" | Sensei | Fast Path Gate | Prefix override |

**Edge cases (4 tests):**

| # | Prompt | Expected Behavior |
|---|--------|------------------|
| 24 | (empty) | Zero-state menu |
| 25 | "foobar-pattern" | "Pattern not found" + suggestions |
| 26 | "explain builder and dispatch" | Primary match + mention secondary |
| 27 | "wave comp" | Wave Computation (prefix match) |

**Agent invocation (2 tests):**

| # | Prompt | Expected Mode | Expected Pattern |
|---|--------|--------------|-----------------|
| 28 | "retry-with-resume" (bare slug) | Reference | Retry with Resume |
| 29 | "sensei: fast-path-gate" | Sensei | Fast Path Gate |

**Success criteria:**
- `/dojo` slash command works (created by `name: dojo` in SKILL.md)
- Router correctly detects mode and pattern for all 29 test cases
- Character voices are distinct and recognizable
- Progressive disclosure works (only needed files are loaded)
- Reference mode produces structured YAML output
- Empty `/dojo` and reserved keywords show zero-state
- Override syntax works with both aliases (`explain:` and `sensei:`)
- Error messages match error contract for unknown pattern, unknown mode, multi-pattern
- Agent envelope is present and parseable with `dojo-envelope` info string
- `route_reason` field present in every envelope

#### Phase 5: Pattern Advisor Skill (Commit 5)

Create the Pattern Advisor as a separate skill that shares the pattern library and provides pattern recommendations.

**Handoff limitation (F4):** Skills cannot invoke other skills. `/dojo` commands emitted by the advisor are **inert text** -- slash commands only parse from user input, not from Claude's output. The advisor includes `/dojo` commands as copy-paste suggestions for the user. Alternatively, the advisor SKILL.md can instruct Claude to invoke the dojo via the `Skill` tool on the next turn, but this is not guaranteed.

**Tasks:**
- Write `.claude/skills/pattern-advisor/SKILL.md` with `name: advisor` -- different classification logic: extract plan characteristics from `$ARGUMENTS`, score each pattern against characteristics using `When To Use` and `Signals & Diagnostics` slots, load top 3 patterns
- Write `references/mode-advisor.md` -- synthesis template with ranked recommendations and `/dojo` handoff commands as copy-paste suggestions in "Next Steps"
- Write `references/voice-alfred.md` -- Alfred Pennyworth voice (experienced counsel, practical wisdom, dry wit, "might I suggest..." framing)
- Test with 3-5 plan descriptions that should match known patterns
- Verify shared pattern files work via explicit Read paths

**Files:**

| File | Action |
|------|--------|
| `.claude/skills/pattern-advisor/SKILL.md` | Create (with `name: advisor`) |
| `.claude/skills/pattern-advisor/references/mode-advisor.md` | Create |
| `.claude/skills/pattern-advisor/references/voice-alfred.md` | Create |

**Advisor synthesis template includes `/dojo` commands as copy-paste suggestions:**

```
## Next Steps
Copy-paste a command to dive deeper:
- `/dojo explain <top-pattern-slug>` -- Sensei teaches the concept
- `/dojo lookup <top-pattern-slug>` -- Quick structured reference
```

This creates a natural workflow: `/advisor "my plan description"` -> get recommendations -> user copy-pastes a `/dojo` command.

**Voice mapping:**

| Mode | Voice ID | Pop Culture Anchor | Why It Fits | Quote Policy |
|------|----------|-------------------|-------------|--------------|
| Advisor | alfred | Alfred Pennyworth (Batman) | Experienced counsel, practical wisdom, dry wit | No direct quotes; understated tone |

**Success criteria:**
- Advisor SKILL.md correctly extracts plan characteristics and scores patterns
- Advisor synthesis template includes `/dojo` commands as copy-paste suggestions in Next Steps
- Alfred voice is distinct from Miyagi and JARVIS
- Shared pattern files load correctly via explicit Read paths
- Advisor envelope includes `ranked_patterns` and `next_commands` fields

## Alternative Approaches Considered

(see brainstorm: `docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md`)

1. **Multi-command** (`/pattern:dag`, `/pattern:retry`) -- rejected: too many entry points, cognitive overhead
2. **Background knowledge** (always-loaded) -- rejected: too expensive token-wise for 9+ patterns
3. **Output styles** for character voices -- rejected: output styles are global and replace the system prompt; we need per-mode voice scoped to skill invocation
4. **Inline mode voices in SKILL.md** (simplicity reviewer suggestion) -- considered but rejected: the brainstorm spent significant time developing distinct character voices with detailed output formats; 6 lines per mode wouldn't capture the voice richness. Mode files are the right extraction
5. **Synthesis logic in each mode file** (pre-HOP framing) -- rejected: synthesis duplicated across mode files. The HOP insight moves synthesis to SKILL.md Step 3 once, making mode files pure parameter declarations. DRYer and matches how the orchestrator itself works (fixed wrapper + variable parameters)
6. **Inline `{{pattern.*}}` template expansion** -- rejected after hardening: breaks on multi-line content. Mode templates rewritten as section-ordering instructions referencing slot names as pointers, not containers
7. **Separate command files** (`/dojo` via `.claude/commands/dojo.md`) -- rejected after CC guide sweep: commands and skills are the same thing; `name: dojo` in SKILL.md creates the slash command directly (F2)
8. **Automated CLI test harness** (`scripts/test-routing.sh` via `claude -p`) -- rejected after CC guide sweep: headless mode cannot invoke slash commands (F3)
9. **`use-when` as separate frontmatter field** -- rejected after empirical spike: field is undocumented and does not surface in skill discovery list. Trigger conditions packed into `description` instead (F1)

## Acceptance Criteria

### Functional Requirements

- [ ] SKILL.md is a HOP with 3-step structure: Step 1 (Route), Step 2 (Read), Step 3 (Synthesize), plus error contract, "Does NOT Do", worked example, envelope format (F7)
- [ ] SKILL.md frontmatter uses `name: dojo`, `description` with inline trigger conditions, `argument-hint`, `allowed-tools` -- no `use-when` field (F1)
- [ ] SKILL.md has explicit defaults for: no mode signal (Sensei), no pattern match (ask), empty arguments (zero-state), reserved keywords (zero-state)
- [ ] SKILL.md has priority cascade for mode detection (prefix override > trigger word > default)
- [ ] Step 1 correctly detects both modes from prefix overrides and trigger words
- [ ] Step 1 includes conversation context fallback for pattern detection (F11)
- [ ] Step 1 correctly identifies all 9 patterns from aliases and keywords (single-token matching)
- [ ] Both mode files are parameter declarations (voice ID + synthesis template as section-ordering + constraints)
- [ ] Both voice files use imperative framing for voice rules (F10)
- [ ] Mode files declare parameters; SKILL.md Step 3 synthesizes -- no file does both
- [ ] SKILL.md contains zero mode-specific logic (HOP purity)
- [ ] Reference mode produces structured YAML output (declared in its synthesis template, not in SKILL.md)
- [ ] All 9 pattern files have canonical frontmatter slot maps matching the slot contract
- [ ] All 9 pattern files are mode-agnostic content parameters
- [ ] `/dojo` slash command works (created by `name: dojo` in SKILL.md, no separate command file) (F2, F9)
- [ ] Error contract produces standardized messages for 4 cases + explicit "no match" framing
- [ ] Routing envelope uses `dojo-envelope` info string with `route_reason` field (no `confidence`)
- [ ] Envelope instruction appears twice in SKILL.md -- top and bottom bracket (F8)
- [ ] Pattern Advisor produces ranked recommendations with `/dojo` commands as copy-paste suggestions (F4)

### Non-Functional Requirements

- [ ] SKILL.md under 250 lines (hard ceiling; official limit is 500 but conservative is better)
- [ ] Mode reference files are 80-120 lines each (parameter declarations, not synthesis)
- [ ] Voice reference files are 60-100 lines each (parameter declarations with imperative framing)
- [ ] Pattern reference files are 80-120 lines each (content declarations, not presentation)
- [ ] Dojo-specific references in flat `references/` directory with `mode-` and `voice-` prefixes
- [ ] Shared pattern library at `.claude/references/patterns/` (explicit Read paths, not framework feature) (F5)
- [ ] SKILL.md explicitly links to each reference file with Read instructions (F6)
- [ ] Progressive disclosure works -- only needed reference files are loaded
- [ ] `allowed-tools: Read, Glob, Grep` in frontmatter

### Quality Gates

- [ ] 29-test routing matrix executed via manual interactive testing (F3)
- [ ] Envelope-based verification (not breadcrumb-based -- more reliable)
- [ ] Character voices are distinct and recognizable in output
- [ ] Synthesis step correctly combines mode parameters with pattern content (not just loading both files)
- [ ] No pattern doc content is lost in adaptation (source -> skill reference)
- [ ] Branch is clean (no unrelated changes from `stage/3-full`)
- [ ] Empty `/dojo` and reserved keywords produce zero-state menu
- [ ] Failed test output saved to `test-results/` for analysis

## Dependencies and Prerequisites

- `stage/3-full` branch must be complete (it is -- 4 commits, all pattern docs exist)
- All 9 source pattern docs in `docs/patterns/` on `stage/3-full`
- Existing skill structure in `.claude/skills/orchestrator/` as reference for conventions

## Risk Analysis and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SKILL.md exceeds 250 lines (hardened structure adds lines) | Medium | Performance degradation | Tables + examples + synthesis = ~200 lines. Content lives in parameter files only |
| Mode detection trigger overlap ("what is" = Sensei or Reference?) | Medium | Wrong mode selected | "what is" moved to Sensei triggers. Priority cascade. Prefix override always wins |
| Pattern detection fails for synonyms | Medium | Wrong pattern or no match | Alias table with single-token matching + explicit "no match" framing |
| Claude collapses routing steps (F7) | Medium | Skipped classification | Collapsed from 5 steps to 3 (Route, Read, Synthesize). Research confirms step-skipping in long chains |
| Envelope forgotten on long responses (F8) | Medium | Missing routing metadata | Instruction bracketed: stated at top of SKILL.md AND at end of Step 3. Two-point repetition |
| Voice rules under-applied | Medium | Generic tone | Voice files use imperative framing (F10) -- "Always X", "Never Y" -- not passive descriptions |
| Character voices feel gimmicky | Low | Undermines credibility | Voices inform tone, not roleplay. Keep technical accuracy paramount |
| Shared pattern library path resolution fails | Low | Broken file loads | Verify explicit Read paths in Phase 1. `.claude/references/patterns/` is a convention, not framework (F5) |
| Multi-reference load causes context bloat | Low | Slow responses | Hard ceilings on all files; worst case = SKILL.md (250) + mode (120) + pattern (120) + voice (100) = 590 lines |
| LLM force-matches instead of saying "not found" | Medium | Misleading results | Explicit "no match" framing in error contract. Research-backed instruction |
| Stage 4-9 vocabulary collision (e.g., "parallel" = Wave or Parallel Dispatch?) | Low | Wrong pattern | Scope section explicitly excludes stage 4-9 pattern names that share vocabulary |
| Pattern Advisor `/dojo` handoff doesn't auto-execute (F4) | Known | User must copy-paste | Documented as copy-paste suggestions. Could add Skill tool instruction as enhancement |

## v2 Backlog

The following capabilities are intentionally deferred from v1. Full specs are documented here for future implementation.

### Deferred Modes

**Sparring Mode** (voice: Morpheus)
- Challenge format with scenario-based questions
- Requires human interaction (wait for answer)
- No-human fallback: switch to Sensei mode for same pattern and note the mode substitution
- Challenge Seed transformation: mode file declares how to transform any pattern's neutral Challenge Seed into Sparring format

**Kata Mode** (voice: Po)
- Practice format with step-by-step exercises
- Uses `TODO(human)` markers
- No-human fallback: generate expected answer inline instead of waiting for human response

**Buddy Mode** (voice: Scotty)
- Coding companion format with diagnostic questions
- Context-skip rule: skip diagnostic questions when `$ARGUMENTS` contains any of: a file path, an error message or stack trace, a specific pattern name, or a description of observed vs expected behavior

### Deferred Voice Files

- `voice-morpheus.md` -- Morpheus (The Matrix)
- `voice-po.md` -- Po (Kung Fu Panda)
- `voice-scotty.md` -- Scotty (Star Trek)

### Deferred Pattern Features

- **Challenge Seed** section in pattern files (excluded from v1 slot contract; needed for Sparring/Kata modes)
- **Generation script** (`scripts/generate-pattern-refs.ts`) -- automates pattern file creation from `docs/patterns/` source docs
- **CI drift check** for generated pattern files
- **Pre-commit hook** for pattern validation

### Deferred Capabilities

- **Dynamic zero-state** -- v1 targets stage/3-full where all 9 patterns exist. Dynamic listing adds complexity for a scenario that doesn't arise in v1
- **Compare mode** -- side-by-side pattern comparison
- **`confidence` envelope field** -- derivable from `route_reason` if ever needed
- **Agent zero-state format** -- structured YAML response to empty args for agent consumers. If needed later, add `--json` flag
- **Dry-run test mode** -- use `--smoke` subset flag instead
- **Scoring-based routing** -- have Claude score each pattern 0-100 before routing (suppresses false positive matches per OpenAI community research)
- **Belt/level system** -- progressive levels for Sensei mode (white belt = dispatch, black belt = HOP)
- **Concepts directory** -- architecture.md and glossary.md -- add if testing reveals users asking "how do patterns connect?" or querying standalone terms

## Open Questions (Deferred to v2)

(see brainstorm: Open Questions section)

- **Sparring subagent isolation:** Test `context: fork` vs inline
- **Cross-pattern queries:** Test "compare DAG and wave computation" -- the router stub for multi-pattern exists but needs validation
- **Pattern distribution across repos:** Not solved in v1. Noted as a v2 concern

## File Summary

Total new files: **17** (reduced from 20: dropped 2 command files per F2/F9, dropped test script per F3)

| # | File | Role | Phase |
|---|------|------|-------|
| 1 | `.claude/skills/agentic-dojo/SKILL.md` | Dojo HOP wrapper (creates `/dojo` via `name: dojo`) | 1 |
| 2 | `.claude/skills/agentic-dojo/references/mode-sensei.md` | Teaching mode | 2 |
| 3 | `.claude/skills/agentic-dojo/references/mode-reference.md` | Lookup mode | 2 |
| 4 | `.claude/skills/agentic-dojo/references/voice-miyagi.md` | Miyagi voice | 2 |
| 5 | `.claude/skills/agentic-dojo/references/voice-jarvis.md` | JARVIS voice | 2 |
| 6-14 | `.claude/references/patterns/pattern-*.md` (9) | Shared pattern library | 3 |
| 15 | `.claude/skills/pattern-advisor/SKILL.md` | Advisor HOP wrapper (creates `/advisor` via `name: advisor`) | 5 |
| 16 | `.claude/skills/pattern-advisor/references/mode-advisor.md` | Advisor mode | 5 |
| 17 | `.claude/skills/pattern-advisor/references/voice-alfred.md` | Advisor voice | 5 |

**Removed from original plan:**
- `.claude/commands/dojo.md` -- not needed; `name: dojo` in SKILL.md creates the slash command (F2)
- `.claude/commands/advisor.md` -- same reason (F2)
- `scripts/test-routing.sh` -- `claude -p` cannot invoke slash commands; manual testing instead (F3)

Modified files: **2**

| File | Phase |
|------|-------|
| `.claude/CLAUDE.md` | 1 |
| `.gitignore` | 4 |

**Changes from original plan:**
- **SKILL.md reframed as a HOP** -- fixed wrapper that classifies and synthesizes; mode/pattern files are variable parameters
- **Collapsed to 3 steps** (Route, Read, Synthesize) from original 5 -- Claude collapses long step chains (F7)
- **Reduced to 2 modes for v1** (Sensei + Reference) -- cut Sparring/Kata/Buddy; documented in v2 Backlog
- **Shared pattern library** at `.claude/references/patterns/` -- explicit Read paths, not a CC framework feature (F5)
- **Pattern Advisor added** as Phase 5 -- handoff commands are copy-paste suggestions, not auto-executing (F4)
- **Canonical frontmatter slot maps** on all pattern files -- explicit slot registry, no implicit H2 parsing
- **Mode synthesis templates as section-ordering** -- reference slot names as pointers, not inline `{{pattern.*}}` expansion
- **Envelope hardened** -- `dojo-envelope` info string, `route_reason` field, instruction bracketed top+bottom (F8)
- **Worked example** promoted from nice-to-have to should-fix
- **Dropped `use-when` frontmatter** -- spike proved non-functional; trigger conditions packed into `description` (F1)
- **Dropped separate command files** -- `name: dojo` in SKILL.md creates `/dojo` directly (F2)
- **Dropped automated test harness** -- `claude -p` cannot invoke slash commands; manual interactive testing (F3)
- **Added conversation context fallback** for pattern detection (F11)
- **Voice files use imperative framing** -- not passive descriptions (F10)
- Default mode changed from Reference to Sensei for human queries
- Explicit Read paths from `.claude/` root (not workspace-relative framework refs)

## Review & Hardening History

This plan went through 5 review passes across 3 rounds, producing 30 findings that were triaged and resolved through a hardening process validated by community research.

### Review Timeline

| Round | Reviewers | Findings | Date |
|-------|----------|----------|------|
| 1 | Architect, Skeptic, DX Advocate | 10 issues | 2026-02-22 (AM) |
| 2 | AI Prompting Expert, DX Expert | 12 additional findings on remediation | 2026-02-22 (midday) |
| 3 | Hardening triage (AI Prompting Expert x2, DX Expert) | 9 critical, 12 important, 9 nice-to-have resolved | 2026-02-22 (PM) |
| 4 | Claude Code Guide sweep (6 parallel agents) + `use-when` spike | 14 findings (4 critical, 5 important, 5 low) | 2026-02-22 (evening) |

### Key Hardening Decisions

- **C1 (Slot registry):** Canonical frontmatter derived from slot contract spec, not ad-hoc. Removed hallucinated slot names (`traps_and_pitfalls`, `minimal_example`)
- **C4 (Step fusion):** Steps 3d-3g collapsed to single 3d with sub-bullets. Research confirms LLMs skip steps in long sequential chains (SIFo benchmark)
- **C5 (Template substitution):** Inline `{{pattern.*}}` expansion replaced with section-ordering instructions referencing slot names as pointers
- **C6 (YAML ambiguity):** Envelope uses `dojo-envelope` info string to distinguish from content YAML
- **I7 (Confidence field):** Dropped from v1 envelope. Derivable from `route_reason` if needed
- **N4 (Worked example):** Promoted from nice-to-have to should-fix based on community research (few-shot examples improve classification accuracy -- specific percentages unverifiable, F13)

### Community Research Validation

Three research beats confirmed the plan's architectural decisions:

1. **Skill architecture:** The HOP pattern is ahead of the curve. No community precedent for slot-based template systems or skills-that-orchestrate-skills. Table-based classification and progressive disclosure are validated by Anthropic's official docs
2. **Persona/voice engineering:** Research confirms persona fails for accuracy but works for style. The dojo's voice-for-style-only architecture (pattern file = what, voice file = how) is the correct separation
3. **Prompt routing:** Classification prompts are more stable than reasoning prompts (sensitivity 0.25 vs 0.43). Few-shot examples and structured formats are the highest-value reliability interventions

### Review Artifacts

| File | What It Contains |
|------|-----------------|
| `docs/plans/agentic-dojo-skill/reviews/hardening-plan.md` | Triage decisions for all 30 findings (9 critical, 12 important, 9 nice-to-have) |
| `docs/plans/agentic-dojo-skill/reviews/community-research-report.md` | 3-beat research report validating architecture, voice, and routing decisions |
| `~/.claude/plans/parallel-seeking-ember.md` | Claude Code plan-mode artifact with 18 findings from rounds 1-2 (superseded by this merged plan) |

### GitHub Issues Filed

| Issue | What It Tracks |
|-------|---------------|
| [anthropics/claude-code#27569](https://github.com/anthropics/claude-code/issues/27569) | `use-when` frontmatter field -- undocumented, spike proves non-functional for discovery |
| [anthropics/claude-code#27570](https://github.com/anthropics/claude-code/issues/27570) | `skill:` frontmatter field -- command-to-skill delegation doesn't exist |

## Sources and References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md](../brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md) -- Key decisions carried forward: router-style architecture, character-voiced modes, progressive disclosure, skill-not-output-style for voices

### Internal References

- Existing skill: `.claude/skills/orchestrator/SKILL.md` on `stage/3-full` (~710 lines, conventions reference)
- Existing reference: `.claude/skills/orchestrator/references/dag-execution.md` on `stage/3-full`
- Pattern docs: `docs/patterns/*.md` on `stage/3-full` (9 files, source material)
- Command convention: `.claude/commands/orchestrate.md` on `stage/3-full`
- **Router reference implementation:** `~/.claude/skills/patterns/SKILL.md` (95-line router with table-based classification -- the structural model for the dojo)

### External References

- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) -- Anthropic official
- [Extend Claude with skills](https://code.claude.com/docs/en/skills) -- Claude Code docs
- [Output styles](https://code.claude.com/docs/en/output-styles) -- Output style system (why we chose skills over output styles)
- [The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) -- Anthropic PDF
- [Claude Agent Skills: First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)

### Community Research Sources

**Skill Architecture:**
- [Awesome Claude Skills repo](https://github.com/travisvn/awesome-claude-skills)
- [Self-improvement Loop: My favorite Claude Code Skill](https://www.reddit.com/r/ClaudeCode/comments/1r89084/) (245 pts, r/ClaudeCode)
- [Anthropic 33-page guide breakdown](https://x.com/Hartdrawss/status/2021517290320130103) (3,909 likes)
- [CLAUDE.md best practices from Boris Cherny](https://x.com/srishticodes/status/2025254119636959701) (3,869 likes)

**Persona/Voice Engineering:**
- [When "A Helpful Assistant" Is Not Really Helpful -- arxiv](https://arxiv.org/html/2311.10054v3)
- [Is Role Prompting Effective? -- learnprompting.org](https://learnprompting.org/blog/role_prompting)
- [Keep Claude in Character -- Anthropic](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/keep-claude-in-character)
- [47 persona configurations tested](https://x.com/godofprompt/status/2016480088095879567) (2,707 likes)

**Prompt Routing & Classification:**
- [Why LLMs Skip Instructions -- Unite.AI](https://www.unite.ai/why-large-language-models-skip-instructions-and-how-to-address-the-issue/)
- [Prompt Sensitivity Analysis -- brics-econ.org](https://brics-econ.org/prompt-sensitivity-analysis-how-small-changes-in-instructions-break-llm-performance)
- [Fuzzy Matching Reasoning -- OpenAI Community](https://community.openai.com/t/prompt-engineering-help-for-fuzzy-matching-reasoning/448909)
- [Claude Structured Outputs -- Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Prompt Chaining -- DataCamp](https://www.datacamp.com/tutorial/prompt-chaining-llm)

### Deepening Research

- Architecture strategist: Router structural analysis, mode-agnostic pattern files, multi-reference load budgeting
- Simplicity reviewer: YAGNI analysis, concepts directory deferral, mode file vs inline tradeoff
- Agent-native reviewer: Structured invocation protocol, Reference mode output contract, Sparring fallback
- Pattern recognition specialist: Frontmatter contradiction fix, naming consistency, explicit router defaults
- Best practices researcher: Table-based classification, worked examples, empty-argument handling
- Patterns skill analyzer: 95-line router benchmark, reference file conventions, Response Checklist pattern

### Claude Code Guide Sweep (2026-02-22)

6 parallel claude-code-guide agents, each focused on a different aspect:
- **SKILL.md structure agent:** Validated allowed-tools, line ceiling, progressive disclosure. Found use-when invalid (F1), missing argument-hint, no disable-model-invocation decision (F12)
- **Command + skill delegation agent:** Found skill: field doesn't exist (F2), commands merged into skills, separate command file unnecessary (F9)
- **References directory agent:** Found .claude/references/ not a CC concept (F5), references/ not auto-discovered (F6), nested refs claim fabricated (F14)
- **Prompt engineering agent:** Found 5 steps too many (F7), read order rationale cargo-culting (F10), envelope reliability risk (F8), missing conversation fallback (F11), 30% stat unsupported (F13)
- **Testing agent:** Found claude -p can't invoke slash commands (F3), breadcrumb checking fragile, envelope parsing more reliable
- **Agent-native agent:** Found skill-to-skill invocation impossible (F4), subagents can't dynamically invoke skills, envelope is a reasonable invention with no framework support

### Empirical Spike: use-when (2026-02-22)

Two spike skills with fictional pattern names tested whether `use-when` influences skill discovery. **Result:** Only `description` text surfaces in the system reminder skill list. The `use-when` field is invisible during the "should I invoke?" decision. Filed as [anthropics/claude-code#27569](https://github.com/anthropics/claude-code/issues/27569).

### Technical Review (2026-02-22)

**P1 fix applied:** Flattened reference directory from `references/modes/*.md` + `references/patterns/*.md` to flat `references/mode-*.md`, `references/voice-*.md`, and `references/pattern-*.md` (3 of 4 reviewers flagged the two-level nesting). Note: the flat structure is preferred for organizational clarity, not because of any framework limitation with nesting (F14 corrected a false claim about Anthropic docs warning against nesting)

**P2 fixes applied:**
- Kata no-human fallback added (mirroring Sparring)
- Reference output changed from plain-text block to fenced YAML (machine-parseable)
- Phase 1 stubs extended to cover all reference files, not just patterns
- Mode priority ordering added to resolve trigger overlap
- Buddy context-skip changed from 50-word threshold to semantic signals

### HOP Reframing (2026-02-22)

**Key insight:** The SKILL.md router is itself a Higher-Order Prompt -- a prompt that orchestrates other prompts rather than generating content itself. Explicitly framing it this way:
- Moves synthesis logic from mode files to SKILL.md Step 3 (DRY -- written once, not duplicated)
- Makes mode files pure parameter declarations (voice ID, synthesis template as section-ordering, constraints)
- Makes voice files pure parameter declarations (voice rules, pacing, lexicon, substitution table)
- Makes pattern files pure content parameters (explanations, rules, canonical slot maps)
- Creates the same separation as the orchestrator: fixed wrapper + variable parameters
- Means adding a 3rd mode or 10th pattern requires exactly one new file, zero changes to existing files
