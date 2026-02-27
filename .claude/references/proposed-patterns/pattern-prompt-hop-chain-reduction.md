---
slug: prompt-hop-chain-reduction
display_name: "Prompt Hop Chain Reduction"
one_liner: "Collapse multi-file instruction chains into single-location inline instructions for gate behaviors, because each file-read hop degrades reliability geometrically."
intel_date: 2026-02-26
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

## Pattern ID

prompt-hop-chain-reduction

## Quick Summary

When an LLM skill system distributes instructions across multiple files connected by "read this file, then follow its instructions" directives, each file-read hop is a failure point where the model may skip the read, synthesize what it thinks the file says, or merge instructions from multiple sources into a blended behavior that matches none of them. A 3-hop chain at 90% adherence per hop compounds to ~73% reliability -- a 17-point drop, not a 10-point drop. Hop Chain Reduction collapses these chains for critical-path behaviors: inline the minimum viable instruction set (2-3 concrete examples, exact tool call parameters, explicit stop barrier) into the primary skill file. Keep enhancement layers (full response banks, extended voice examples) in reference files as optional reads for variety.

## When To Use

- A behavior must execute deterministically (exact text, exact tool call, exact parameters) and the instructions are currently spread across 2+ files with read-then-follow directives
- A gate behavior (tool call, precondition check, stop barrier) is failing intermittently and the instructions live in a reference file loaded via a hop chain
- You observe intent summarization -- the LLM produces output that matches the general intent but skips the specific implementation (e.g., prints a question in prose instead of calling AskUserQuestion)
- You see merge failures -- elements from different files blended into a single behavior that matches neither source
- A critical instruction buried in a reference file is being ignored due to position bias or attention dilution

## Core Mechanism

**Gate vs Guide distinction:**

A **gate** is a behavior that must execute exactly or the entire flow breaks (e.g., "call AskUserQuestion with header 'Topic'"). A **guide** shapes output quality but tolerates variation (e.g., "use newspaper slang"). Gates need inline instructions. Guides can live in reference files.

**Compound failure rates:**

| Chain Length | Adherence per Hop | Compound Reliability |
|-------------|-------------------|---------------------|
| 1 hop | 90% | 90% |
| 2 hops | 90% | 81% |
| 3 hops | 90% | 73% |
| 4 hops | 90% | 66% |

Hop chains degrade geometrically, not linearly. This is the core insight driving the pattern.

**The reduction:**

```
BEFORE (3 hops, ~73% reliability):
  SKILL.md: "No-Topic Hard Gate"
    -> "Read references/investigate.md"
      -> investigate.md Step 1: "Read no-topic-responses.md"
        -> no-topic-responses.md: [10 response variations]
          -> "Call AskUserQuestion(header='Topic')"

AFTER (1 hop, ~90-95% reliability):
  SKILL.md: "No Topic? Ask First, Do Nothing Else"
    -> [3 inline response examples]
    -> [Exact AskUserQuestion parameters]
    -> "Stop. Resume at Route the Assignment after response."
    -> (Optional: "For variety, read no-topic-responses.md")
```

**What to inline (minimum viable instruction set):**

1. Concrete examples of expected output (2-3 variations, not the full bank)
2. Exact tool call parameters (tool name, header, question text)
3. Explicit stop condition ("stop and wait", "do not proceed")
4. What comes next after the gate clears ("resume at Route the Assignment")

**What stays in reference files (enhancement layer):**

1. Full response banks (for variety beyond the inline examples)
2. Edge case handling (unusual flag combinations)
3. Detailed formatting templates
4. Extended voice examples

**The optional read pattern:**

After inlining the critical behavior, add a non-blocking read directive:

```markdown
For additional response variety, you may read
[references/no-topic-responses.md](references/no-topic-responses.md)
and pick from its full bank instead of the examples above.
```

If the LLM reads it, more variety. If it doesn't, the behavior still works correctly.

## Key Rules

1. **Single-owner principle** -- every gate behavior has exactly one defining location in the prompt system. When the same gate appears in multiple files with different wording, the LLM may follow one, neither, or a blend.
2. **Tool call as the gate** -- make the structured tool call the enforcement point, not printed text. The LLM can half-execute a text instruction (print text but skip the tool call). It cannot half-execute a tool call.
3. **Stop barriers** -- an explicit "stop and wait" after a gate prevents the LLM from continuing without the gate being satisfied. List specific things not to do (read files, ask other questions, dispatch tasks) and state exactly when to resume.
4. **Calm authority over shouting** -- Claude 4.5/4.6 models are more responsive to system prompts than earlier models. "MANDATORY HARD GATE" / "ALWAYS" / "NEVER" / "FORBIDDEN" language can cause erratic over-prompting backlash. Lead with what to do in calm, direct language.
5. **Position-aware ordering** -- put gates before guides in the skill file. Put critical behaviors before optional enhancements. The no-topic gate must appear above the routing section, not below it.
6. **Back-references over duplicates** -- when a reference file needs to acknowledge a gate already handled in SKILL.md, use a two-sentence back-reference ("Already handled by SKILL.md. If somehow empty, return to SKILL.md.") instead of a duplicate gate definition.

## Implementation Notes

**Decision flowchart for inline vs reference file:**

```
Is this behavior a GATE or a GUIDE?
  |
  +-- GUIDE -> Keep in reference file. Progressive disclosure works fine.
  |
  +-- GATE -> Does it require a specific tool call?
        |
        +-- Yes -> INLINE. Put exact tool parameters in SKILL.md.
        |          Add stop barrier after the tool call.
        |
        +-- No -> Does it require specific text output?
              |
              +-- Yes -> INLINE 2-3 examples in SKILL.md.
              |          Keep full bank in reference file as optional.
              |
              +-- No -> Is it a precondition check (if X then stop)?
                    |
                    +-- Yes -> INLINE. Put before the code path it guards.
                    |
                    +-- No -> Keep in reference file with clear instructions.
```

**Case study -- Newsroom no-topic gate:**

The bug: `/newsroom:investigate` with no topic should print one approved response and call AskUserQuestion. Instead, the LLM printed generic text ("The /newsroom:investigate skill has been loaded...") with no structured tool call, and sometimes asked about depth/sources before capturing a topic.

Root cause: 3-hop chain with two competing gate definitions (SKILL.md vs investigate.md) using different wording, plus the routing section appearing BEFORE the gate in SKILL.md (position bias).

The fix (three surgical changes):
1. **SKILL.md** -- moved gate above routing, inlined 3 response examples + exact AskUserQuestion parameters, added stop barrier, made full response bank an optional read
2. **investigate.md** -- replaced duplicate gate with back-reference ("Already handled by SKILL.md")
3. **Tone** -- replaced "MANDATORY HARD GATE" with "No Topic? Ask First, Do Nothing Else"

**Stop barrier example:**

```markdown
Then stop and wait. Do not read any reference files. Do not ask about
depth, sources, or mode. Do not call Task. Do not print anything else.
Resume at "Route the Assignment" only after the user responds with a topic.
```

Key elements: imperative verb ("stop"), exhaustive prohibition of specific next-actions, explicit resume condition with exact location.

**Calm authority example:**

Before (over-prompted):
```markdown
## MANDATORY HARD GATE
**ALWAYS** use AskUserQuestion. **NEVER** skip. **MUST** call.
**FORBIDDEN:** Generic preambles, proceeding without topic.
```

After (calm, direct):
```markdown
## No Topic? Ask First, Do Nothing Else
When $ARGUMENTS is empty, do these two things and stop:
1. Print one of these lines: [examples]
2. Call AskUserQuestion with header "Topic"
Then stop and wait.
```

## Failure Modes

- **Skip-Read Failure:** The LLM skips a file read entirely and synthesizes behavior from the instruction name. Output matches the general intent but not the specific implementation. Tool calls are absent or have wrong parameters.
- **Merge Failure:** Instructions from multiple files get blended into a single behavior. Elements from different sections/files combine in unexpected ways (e.g., asking about depth/sources before capturing topic).
- **Position Bias Failure:** Instructions that appear later in loaded context get less attention. Early instructions in SKILL.md followed perfectly; instructions in the third reference file followed loosely or not at all.
- **Over-Prompting Backlash:** Excessive MANDATORY/NEVER/CRITICAL language causes the LLM to focus on prohibitions rather than constructive instructions. It knows what NOT to do but not what TO do. Particularly acute on Claude 4.5/4.6.
- **Duplicate Gate Confusion:** The same gate defined in two files with slightly different wording. The LLM follows one version, the other, or a hybrid that matches neither.
- **Implicit File-Read Dependencies:** "Read investigate.md for the full workflow" without indicating which parts are critical. The LLM skims or summarizes rather than following step-by-step.

## Signals & Diagnostics

- **Pattern is needed:** Gate behaviors fail intermittently. The LLM produces output matching the general intent but missing exact tool calls or exact text. You find the same behavior defined in two or more files with different wording. Critical instructions live 2+ hops deep in reference files.
- **Pattern is working:** Gate behaviors execute deterministically. Tool calls include exact parameters specified in the inline instruction. Stop barriers prevent premature continuation. Response variety is lower (2-3 inline examples) but correctness is high.
- **Pattern is failing:** Inline examples are too few and responses feel repetitive (add more inline or check the optional read). Over-inlining bloats the primary skill file and pushes later sections into attention dilution territory. Back-references in reference files are ignored and the LLM re-invents the gate behavior.

## Tradeoffs

**Gain:** Gate reliability rises from ~73% (3-hop) to ~90-95% (1-hop inline). Debugging is easier -- one file to check instead of chasing through a chain. Stop barriers prevent the most common failure mode (premature continuation past an unsatisfied gate).

**Cost:** Token cost per invocation increases slightly (inline examples are always loaded, not demand-loaded). Maintainability is harder -- inline examples duplicate data from the reference file. Response variety is reduced to 2-3 inline variations unless the LLM reads the optional reference file. Over-inlining can bloat SKILL.md and cause attention dilution for later sections, trading one problem for another.

**The sweet spot:** Inline the minimum viable gate (2-3 examples, exact tool params, stop barrier) and keep the enhancement layer in reference files with optional reads. This balances reliability against token cost and maintainability.

## Related Patterns

- **Context Engineering** -- hop chain reduction is a form of context quality management; reducing hops reduces the chance of context pollution from intermediate file reads
- **Plugin Architecture** -- progressive disclosure (SKILL.md + references/) creates hop chains by design; this pattern identifies when to break that convention for gates
- **Higher-Order Prompt** -- HOP variables are always inlined at the top of the skill file, consistent with the principle that critical configuration should not live behind file reads
- **Spec as Source of Truth** -- spec files are re-read from disk at wave boundaries for the same reason gates are inlined: critical information should not depend on indirect access

## Source Anchors

- `side-quest-plugins/docs/prompt-hop-chain-reduction-spec.md` -- full Staff Engineer specification with compound failure rate model, failure taxonomy, Anthropic guidance citations, and newsroom case study
- `side-quest-plugins/plugins/newsroom/skills/the-desk/SKILL.md` -- reference implementation of the inlined no-topic gate
- `side-quest-plugins/plugins/newsroom/skills/the-desk/references/investigate.md` -- reference implementation of the back-reference pattern
- [Anthropic Prompting Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts) -- "Be clear and direct", sequential steps for order-dependent behavior, long context positioning, Claude 4.5/4.6 over-prompting warnings
- [Atla AI: Why LLM Agents Still Fail](https://atla-ai.com/post/why-llm-agents-still-fail) -- compound failure rates across multi-step tasks
- [Lakera: Prompt Engineering Guide](https://lakera.ai/blog/prompt-engineering-guide) -- defensive prompting, structural guards
