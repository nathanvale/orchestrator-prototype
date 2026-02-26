---
slug: context-engineering
display_name: "Context Engineering"
one_liner: "Actively manage the quality and composition of an agent's context window through controlled handoffs, context surgery, and spec-file re-reads -- because context degradation directly determines agent capability."
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

context-engineering

## Quick Summary

Context Engineering is the active management of an agent's context window quality and composition. Three core techniques: (1) ESC-ESC Context Surgery -- edit conversation history retroactively to remove wrong turns and fix misunderstandings; (2) Controlled Handoffs over Auto-Compaction -- manually summarize, review, and hand verified summaries to fresh sessions instead of relying on intransparent auto-compression; (3) Wave-Boundary Spec Re-reads -- the orchestrator re-reads the spec file from disk at every wave boundary, defending against context compaction evicting the task graph. The underlying principle: context quality directly determines agent capability.

## When To Use

- Long-running orchestration sessions where context naturally degrades over many turns
- Multi-wave execution where the task graph must remain available despite compaction
- Recovery from wrong-turn scenarios where the agent pursued an incorrect path
- Handoffs between agents where context must be filtered and summarized
- Situations where auto-compaction is too opaque or unpredictable
- Any session where you observe declining agent performance despite clear instructions
- Minimum viable context optimization -- reducing token count while preserving high-signal information

## Core Mechanism

**ESC-ESC Context Surgery (CLI Agents):**

In CLI-based agents (like Claude CLI or Tessl), double-escape opens an editor showing the full conversation history. Edit the history directly -- rephrase prompts, delete wrong turns, correct misunderstandings, remove redundant exchanges. Save and close. The agent continues with the corrected history as if the mistakes never happened.

**Controlled Handoffs over Auto-Compaction:**

Auto-compaction algorithms are intransparent -- you don't know what was kept or discarded. Instead: (1) ask the current agent to summarize the session state, decisions made, and outstanding issues; (2) review the summary and edit it if necessary; (3) start a fresh session and provide the verified summary as context. This makes the handoff explicit and auditable.

**Wave-Boundary Spec Re-reads:**

The orchestrator re-reads the spec file from disk at the start of every wave. This defends against context compaction evicting the task graph, task descriptions, or acceptance criteria. The spec is the source of truth; re-reading it ensures the agent always has access to the full task structure regardless of compaction.

**Minimum Viable Context (Anthropic):**

Find the smallest possible set of high-signal tokens that maximize the likelihood of the desired outcome. Remove redundant tool outputs, verbose explanations, and repeated information. Preserve architectural decisions, unresolved bugs, and implementation details. The goal is density, not volume.

**Frequent Intentional Compaction (HumanLayer FIC):**

Deliberately structure how you feed context to the AI. Instead of a single long session, break work into phases and explicitly reset context between phases with a curated summary. This prevents degradation from accumulating unchecked.

## Key Rules

1. Context degradation is not theoretical -- agent capability visibly declines as the context fills or when wrong paths are taken.
2. Auto-compaction is intransparent -- you cannot audit what was kept or discarded. Prefer manual handoffs when session state matters.
3. Spec files and task graphs should be re-read from disk at wave boundaries, not assumed to be in context.
4. Context surgery (editing history) is a legitimate debugging technique, not a hack -- use it to remove unproductive exchanges.
5. Minimum viable context is the goal -- every token should contribute to the desired outcome. Verbose explanations and redundant outputs are noise.
6. When an agent's performance degrades mid-session, check context length and wrong-turn history before assuming the model is incapable.
7. Controlled handoffs should include: session summary, decisions made, unresolved issues, and next steps. The receiving agent should confirm understanding before proceeding.

## Implementation Notes

**ESC-ESC in CLI Agents:**

If the agent pursues a wrong path, press ESC twice to open the conversation editor. Delete the incorrect exchanges or rephrase the prompt that led to the wrong turn. Save and exit. The agent resumes with the corrected history.

**Wave-Boundary Re-reads in Orchestrator:**

```typescript
async function executeWave(waveNumber: number, tasks: Task[]) {
  // Re-read spec from disk to defend against compaction
  const spec = await readSpecFile();
  const context = buildWaveContext(spec, waveNumber, tasks);

  for (const task of tasks) {
    await dispatchTask(task, context);
  }
}
```

**Controlled Handoff Protocol:**

1. Ask agent to summarize: "Summarize the current session state, including decisions made, unresolved issues, and blockers."
2. Review the summary. Edit if incomplete or incorrect.
3. Start a fresh session: "Continuing from a previous session. Here is the state: [verified summary]. Next steps: [...]"
4. The fresh agent confirms understanding and proceeds.

**Minimum Viable Context Checklist:**

- Remove redundant tool outputs (multiple reads of the same file)
- Remove verbose explanations unless they contain decisions
- Preserve architectural decisions and unresolved bugs
- Preserve implementation details required for next steps
- Summarize or remove resolved issues

**Compaction Config (if using auto-compaction):**

If auto-compaction is unavoidable, configure it to preserve high-signal information:
```json
{
  "compaction": {
    "preserve": ["architectural_decisions", "unresolved_bugs", "implementation_details"],
    "discard": ["redundant_tool_outputs", "resolved_exchanges"]
  }
}
```

## Failure Modes

- **Invisible Compaction Loss:** Auto-compaction discards critical information (task graph, acceptance criteria) without warning. The agent continues but lacks essential context, producing incorrect outputs.
- **Wrong-Turn Accumulation:** The agent pursues an incorrect path for many turns. Context fills with unproductive exchanges. Performance degrades. Context surgery is not used; the session becomes unrecoverable.
- **Unaudited Handoffs:** Auto-compaction hands off to a fresh session with a summary you never reviewed. The summary omits critical details or introduces errors. The fresh agent continues from corrupted state.
- **Spec Eviction:** The orchestrator assumes the task graph is in context but it was compacted away. The agent loses track of which tasks are pending, completed, or blocked.
- **Verbose Context Pollution:** High token count but low signal density -- repeated tool outputs, verbose explanations, redundant exchanges. The agent spends context budget on noise instead of signal.
- **Fragile Session State:** Long-running sessions with no intentional compaction or handoffs. Context fills completely. The agent's performance degrades but the user does not realize context is the cause.

## Signals & Diagnostics

- **Pattern is needed:** Agent performance declines visibly mid-session despite clear instructions. Agent "forgets" decisions made earlier in the session. Context window nears capacity. Retry loops produce different but equally wrong outputs.
- **Pattern is working:** Wave boundaries trigger spec re-reads (observable in logs). Handoffs include explicit summaries that were reviewed. Agent performance remains stable across long sessions. Context window stays below critical capacity.
- **Pattern is failing:** Orchestrator loses track of task graph mid-run. Agent repeatedly asks for information that was provided earlier. Performance degrades suddenly after auto-compaction. Fresh sessions inherit corrupted state from unaudited summaries.

## Tradeoffs

**Gain:** Agent capability remains stable across long sessions. Critical information (task graphs, acceptance criteria, architectural decisions) is never lost to compaction. Handoffs are explicit and auditable. Context quality is actively managed instead of passively accumulated.

**Cost:** Manual context surgery and controlled handoffs require user intervention and review. Wave-boundary spec re-reads add token cost and latency. Minimum viable context optimization requires understanding which information is high-signal vs noise. Controlled handoffs are slower than auto-compaction.

## Related Patterns

- **Hydration Pattern** -- orchestrator injects spec and task-graph context into agent dispatch calls
- **Wave Computation** -- wave boundaries are natural points to re-read spec and reset context
- **Spec as Source of Truth** -- the spec file is re-read from disk, not assumed to be in context
- **Self-Reflecting Analytics** -- agents summarize session state before handoffs, enabling auditable transitions

## Source Anchors

- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; ESC-ESC context surgery, controlled handoffs vs auto-compaction, "when the context fills or when you walk the wrong paths, the intelligence of these agents degrades"
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- "handoffs over auto-compaction" principle documented
- [Effective context engineering for AI agents - Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- "minimum viable context"; compaction preserves "architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs"
- [Getting AI to Work in Complex Codebases - HumanLayer](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents) (1.5k stars) -- Frequent Intentional Compaction (FIC): "deliberately structuring how you feed context to the AI"
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich; context file redundancy as a form of context pollution
