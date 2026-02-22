---
name: advisor
description: >-
  Recommends agentic orchestration patterns for a given plan or problem
  description. Scores patterns against plan characteristics and provides
  ranked recommendations with handoff commands to the /dojo skill.
  Use when: the user describes a plan, architecture, or problem and wants
  to know which orchestration patterns apply. Also use when an agent needs
  pattern selection guidance.
argument-hint: "e.g. 'I need to run 5 tasks with dependencies between them'"
allowed-tools: Read, Glob, Grep
hooks:
  Stop:
    - hooks:
        - type: prompt
          prompt: >-
            Check if the assistant's response contains a fenced code block
            with the info string `advisor-envelope`. The block must contain
            YAML with at least these fields: ranked_patterns,
            characteristics_detected, next_commands. If the envelope block
            is missing or incomplete, respond with STOP_REASON: "Response
            is missing the required advisor-envelope block. Add it before
            finishing." If the envelope is present and valid, allow the
            response.
---

# Pattern Advisor

A Higher-Order Prompt for pattern recommendation. This skill never generates
content itself -- it extracts plan characteristics, scores patterns against
those characteristics, and synthesizes ranked recommendations through scoped
instructions.

This skill never writes code, creates files, or modifies the codebase.

IMPORTANT: Every response MUST end with an advisor-envelope block (see
Envelope Format below). Do not skip it.

---

## Step 1: Classify

If $ARGUMENTS is empty, emit zero-state and stop:

Pattern Advisor -- recommend orchestration patterns for your plan

Usage:
  /advisor "<plan or problem description>"

Examples:
  /advisor "I need to run 5 tasks with dependencies between them"
  /advisor "My agent keeps failing mid-run and I need it to recover"
  /advisor "I want one prompt to drive multiple different agent types"

Available patterns (15 total):
  builder-validator    dispatch-loop       higher-order-prompt
  task-dag             wave-computation    spec-as-source-of-truth
  retry-with-resume    fast-path-gate      iterative-refinement
  team-profiles        plugin-architecture difficulty-routing
  spec-hardening       hitl-protocol       hydration-pattern

If $ARGUMENTS is too vague to extract any characteristics (e.g. a single
word with no context), ask for clarification instead of guessing:

  "Might I ask for a bit more detail? A sentence or two describing the
  problem or plan would allow me to offer a more considered recommendation."

### Characteristic Extraction

Extract signals from $ARGUMENTS. For each signal present, note it:

| Signal | Present if $ARGUMENTS mentions... |
|--------|-----------------------------------|
| multiple-tasks | multiple tasks, many steps, batch, list of items |
| dependencies | depends on, must run after, ordering, sequence, prerequisite |
| verification-needed | validate, verify, check, quality, critic, review |
| failure-recovery | retry, resume, failure, crash, recover, idempotent |
| complexity-varies | simple cases, complex cases, skip, shortcut, threshold |
| iterative-feedback | improve, refine, iterate, feedback, clarify, revise |
| persistent-state | save progress, resume, checkpoint, durable, persist |
| parameterization | reusable, generic, multiple agent types, template, configurable |
| parallel-execution | parallel, concurrent, at the same time, simultaneously |
| long-running | long, multi-step, extended, hours, many rounds |
| structured-output | YAML, structured, machine-readable, downstream agent |
| role-switching | different agents, team switch, research vs engineering, swap agents |
| extraction | extract, plugin, distribute, marketplace, reusable across projects |
| escalation | hard tasks, complex refactor, more capable engine, codex |
| vague-input | ambiguous, unclear spec, missing file paths, vague criteria |
| ambiguity | design conflict, conflicting patterns, architectural decision |
| cross-session | resume session, interrupted, overnight, long pause, session ended |

### Pattern Scoring

Score each of the 15 patterns against the extracted characteristics.
A pattern scores higher when more of its when_to_use and signals_diagnostics
content aligns with the extracted signals.

Scoring guide (approximate relevance):

| Pattern | High score when... |
|---------|-------------------|
| task-dag | multiple-tasks + dependencies |
| wave-computation | multiple-tasks + dependencies + parallel-execution |
| dispatch-loop | multiple-tasks, long-running, structured-output |
| builder-validator | verification-needed (any plan benefits from quality gates) |
| retry-with-resume | failure-recovery + persistent-state |
| spec-as-source-of-truth | persistent-state + long-running + failure-recovery |
| higher-order-prompt | parameterization + multiple agent types |
| fast-path-gate | complexity-varies (simple vs complex routing) |
| iterative-refinement | iterative-feedback + clarify + improve |
| team-profiles | parameterization + role-switching + multiple agent types |
| plugin-architecture | extraction + parameterization (reusability across projects) |
| difficulty-routing | complexity-varies + escalation + parallel-execution |
| spec-hardening | vague-input + verification-needed + iterative-feedback |
| hitl-protocol | ambiguity + iterative-feedback + long-running |
| hydration-pattern | persistent-state + cross-session + failure-recovery |

Minimum threshold: a pattern must match at least 1 characteristic signal
to appear in recommendations. If fewer than 3 patterns meet threshold,
include the closest matches and note low confidence.

If no patterns score above threshold, say so explicitly:

  "The description provided does not map clearly to any of the 15 patterns
  in my reference. Might I suggest elaborating on the problem structure,
  failure modes, or agent coordination needs?"

## Step 2: Read

Read these files in order:

1. Top 3 scoring patterns via explicit paths:
   - `.claude/references/patterns/pattern-<slug>.md` for each top pattern
   - Use the `when_to_use` and `signals_diagnostics` slots as evidence
2. `references/mode-advisor.md` -- synthesis template
3. `references/voice-alfred.md` -- voice rules

## Step 3: Synthesize

Generate the response following the mode-advisor.md Synthesis Template,
written in the Alfred voice from voice-alfred.md.

IMPORTANT: End every response with the routing envelope. Do not skip it.

## Envelope Format

Every response MUST end with a routing envelope in a fenced code block
using the `advisor-envelope` info string (not `yaml`):

```advisor-envelope
ranked_patterns:
  - slug: <top-pattern-slug>
    score: high
  - slug: <second-pattern-slug>
    score: medium
  - slug: <third-pattern-slug>
    score: medium
characteristics_detected:
  - <signal-1>
  - <signal-2>
next_commands:
  - "/dojo explain <top-pattern-slug>"
  - "/dojo lookup <top-pattern-slug>"
```
