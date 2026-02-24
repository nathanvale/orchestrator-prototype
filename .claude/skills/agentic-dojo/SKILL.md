---
name: dojo
description: >-
  Pattern knowledge for agentic orchestration. Teaches all 19 patterns
  across 9 stages: dispatch loops, DAGs, wave computation, retry, HOP,
  builder-validator, iterative refinement, fast path, spec files,
  idempotency, topological sort, task decomposition, team profiles,
  plugin architecture, difficulty routing, spec hardening, HITL,
  hydration, parallel dispatch, worktree isolation, browser validation,
  and the Ralph Wiggum visual retry loop.
  Use when: the user asks about agentic patterns, orchestration concepts,
  dispatch loops, DAG execution, wave computation, retry logic, higher-order
  prompts, builder-validator, spec files, fast path, iterative refinement,
  parallel execution, browser validation, or visual retry loops.
  Also use when an agent queries for pattern guidance.
argument-hint: "e.g. 'explain wave computation' or 'lookup retry'"
allowed-tools: Read, Glob, Grep
hooks:
  Stop:
    - hooks:
        - type: prompt
          prompt: >-
            Check if the assistant's response contains a fenced code block
            with the info string `dojo-envelope`. The block must contain
            YAML with at least these fields: mode_selected, pattern_selected,
            route_reason. If the envelope block is missing or incomplete,
            respond with STOP_REASON: "Response is missing the required
            dojo-envelope block. Add it before finishing." If the envelope
            is present and valid, allow the response.
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
  builder-validator    dispatch-loop       higher-order-prompt
  task-dag             wave-computation    spec-as-source-of-truth
  retry-with-resume    fast-path-gate      iterative-refinement
  team-profiles        plugin-architecture difficulty-routing
  spec-hardening       hitl-protocol       hydration-pattern
  parallel-dispatch    worktree-isolation  browser-validation
  ralph-wiggum-loop

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
| team, profiles, switching | team-profiles |
| plugin, marketplace, extract | plugin-architecture |
| difficulty, routing, codex, escalat | difficulty-routing |
| harden, hardening, ambiguity | spec-hardening |
| hitl, bounce, bounce-back, human-loop | hitl-protocol |
| hydrat, checkpoint, persist, cross-session | hydration-pattern |
| parallel, concurrent, fan-out | parallel-dispatch |
| worktree, isolation, worktrees | worktree-isolation |
| browser, screenshot, visual, agent-browser | browser-validation |
| ralph, wiggum, visual-retry, visual-loop | ralph-wiggum-loop |

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
| team, profile, switching, inject, domain | Team Profiles | .claude/references/patterns/pattern-team-profiles.md |
| plugin, marketplace, extract, distribute, install | Plugin Architecture | .claude/references/patterns/pattern-plugin-architecture.md |
| difficulty, route, codex, escalate, hard task, capability | Difficulty Routing | .claude/references/patterns/pattern-difficulty-routing.md |
| harden, hardening, ambiguous, concrete, acceptance criteria | Spec Hardening | .claude/references/patterns/pattern-spec-hardening.md |
| HITL, human-in-the-loop, bounce-back, pause, mid-execution | HITL Protocol | .claude/references/patterns/pattern-hitl-protocol.md |
| hydration, checkpoint, cross-session, resume state, persist state | Hydration Pattern | .claude/references/patterns/pattern-hydration-pattern.md |
| parallel dispatch, concurrent, fan-out, wave parallelism, sequential flag | Parallel Dispatch | .claude/references/patterns/pattern-parallel-dispatch.md |
| worktree, isolation, git worktree, diff-and-apply, merge conflict | Worktree Isolation | .claude/references/patterns/pattern-worktree-isolation.md |
| browser, screenshot, visual validation, agent-browser, dev server, UI validation | Browser Validation | .claude/references/patterns/pattern-browser-validation.md |
| ralph wiggum, visual retry, screenshot loop, visual fix cycle, no-browser | Ralph Wiggum Loop | .claude/references/patterns/pattern-ralph-wiggum-loop.md |
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
- Body: follow the mode's Synthesis Template and Constraints, using
  the pattern's slot content as source material (reference by slot
  name, do not expand inline). Write in the voice specified by the
  voice file. Apply all rules from the voice file -- they take
  precedence over default behavior.
  If a slot has no content, write '[Not documented for this pattern]'.
- Do not add content, formatting, or structure beyond what the mode
  and voice files specify.

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
  Body: Follow Sensei template and constraints in Miyagi voice using
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
