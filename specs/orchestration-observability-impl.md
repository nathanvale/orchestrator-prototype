# Plan: Orchestration Observability - Event Emission from HOP Orchestrator

## Context

Observability is the backbone of agentic engineering. Without it, you're in a black box -- agents coordinate, tasks dispatch, verdicts arrive, and you have no visibility into any of it. In a system where an LLM is making coordination decisions (decomposing tasks, choosing which agent to dispatch, interpreting verdicts), observability isn't a nice-to-have bolted on later. It's the foundation that makes everything debuggable, learnable, and trustable.

Two systems exist side by side:

1. **Orchestrator prototype** (`~/code/orchestrator-prototype/`) -- an educational repo teaching agent orchestration patterns incrementally via long-living stage branches. Stage 1 (minimum viable dispatch) is built. The orchestrator is entirely markdown-based -- SKILL.md instructions that the LLM follows.

2. **@side-quest/observability** (`~/code/side-quest-observability/`) -- a production-ready event bus with HTTP+WS server, ring buffer EventStore, Vue dashboard, and voice feedback. Currently receives 5 Claude Code hook events via a dumb-hook/smart-server pattern.

**Observability is part of Stage 1, not an add-on.** The dispatch loop and event emission are taught together because they're inseparable in practice. Every orchestration stage emits events from day one -- this is how you learn what the orchestrator is actually doing at each decision point.

**The constraint:** The orchestrator is a markdown prompt (SKILL.md), not TypeScript. It can only emit events through tools available to the LLM -- primarily Bash.

## Approach: Self-Contained Emit Script (Dumb Pipe Pattern)

Mirror the proven `emit-event.ts` hook pattern: a tiny self-contained script in the prototype repo that the orchestrator calls via Bash. Zero external dependencies. Fails silently if the server isn't running.

### Why this approach

- **Consistent with observability architecture** -- same dumb-pipe pattern as the plugin hooks
- **Zero coupling** -- the orchestrator prototype doesn't depend on @side-quest/observability being installed
- **Works from SKILL.md** -- the orchestrator calls `bun run scripts/emit-event.ts <type> '<json>'` via Bash
- **Fails silently** -- if no server is running, the script exits 0 immediately
- **Educational** -- teaches the fire-and-forget event emission pattern

### What changes where

**In `~/code/orchestrator-prototype/` (the educational repo):**

| # | File | Action |
|---|------|--------|
| 1 | `scripts/emit-event.ts` | NEW -- self-contained emitter (~40 lines, zero deps) |
| 2 | `.claude/skills/orchestrator/SKILL.md` | MODIFY -- add emit calls at each dispatch step |
| 3 | `docs/patterns/event-driven-observability.md` | NEW -- pattern doc (What, How, Where + sources) |
| 4 | `specs/master-plan.md` | MODIFY -- add observability as a cross-cutting concern to stage descriptions |
| 5 | `.claude/settings.json` | MODIFY -- pre-approve `Bash(bun run scripts/emit-event.ts *)` |

**In `~/code/side-quest-observability/` (on `feat/initial-observability-system` branch):**

| # | File | Action | Why |
|---|------|--------|-----|
| 6 | `packages/server/src/types.ts` | MODIFY -- add `OrchestrationType` union to EventType | Typed autocomplete for known orchestration events |
| 7 | `packages/client/src/components/EventCard.vue` | MODIFY -- add orchestration color in getEventColor() | Amber left border for orchestration events |

5 files in the prototype, 2 additions in the observability system. The `(string & {})` escape hatch means the system works even without changes #6 and #7 -- those add polish and prove extensibility.

---

## File Details

### 1. `scripts/emit-event.ts` (orchestrator-prototype)

Self-contained script, zero external dependencies. Same pattern as `plugins/observability/hooks/emit-event.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Fire-and-forget event emitter for the HOP Orchestrator.
 *
 * Why: The orchestrator (SKILL.md) is a markdown prompt that coordinates
 * Builder/Validator agents. It can't import TypeScript modules. This script
 * is called via Bash to publish orchestration lifecycle events to the
 * @side-quest/observability server if it's running. Fails silently if not.
 *
 * Usage: bun run scripts/emit-event.ts <event-type> '<json-data>'
 * Example: bun run scripts/emit-event.ts orchestration.started '{"prompt":"add hello world"}'
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// Self-destruct after 2s (safety net)
setTimeout(() => process.exit(0), 2000)

// Kill switch
if (process.env.SIDE_QUEST_EVENTS === '0') process.exit(0)

const eventType = process.argv[2]
const jsonData = process.argv[3] || '{}'
if (!eventType) process.exit(0)

// Discover server from global port file
const portFile = join(homedir(), '.cache', 'side-quest-observability', 'events.port')
let port: number
try {
  port = parseInt(readFileSync(portFile, 'utf-8').trim(), 10)
  if (isNaN(port) || port <= 0) process.exit(0)
} catch {
  process.exit(0) // No server running -- silent exit
}

// POST partial envelope -- server wraps it
const controller = new AbortController()
setTimeout(() => controller.abort(), 500)
try {
  await fetch(`http://127.0.0.1:${port}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: eventType,
      app: 'orchestrator-prototype',
      appRoot: process.cwd(),
      source: 'cli',
      data: JSON.parse(jsonData),
    }),
    signal: controller.signal,
  })
} catch {
  // Fire and forget -- never fail the orchestrator
}
```

~40 lines. Zero imports from @side-quest/*. Reads the port file, POSTs, exits.

**Note on `source` field:** Uses `'cli'` rather than a new `'orchestration'` value. The `source` field in EventEnvelope is typed as `'cli' | 'hook'`. Extending it would require a type change + server validation update. Using `'cli'` is accurate (it IS a CLI script emitting events) and avoids touching the envelope contract. The `type` field (e.g., `orchestration.started`) already distinguishes orchestration events from other CLI events.

### 2. SKILL.md Modifications (orchestrator-prototype)

Add emit calls at each step boundary. The orchestrator calls Bash to run the script:

```markdown
### Step 1: Parse the User Prompt
...
After parsing, emit the start event:
Bash: bun run scripts/emit-event.ts orchestration.started '{"prompt":"$USER_PROMPT","builderAgent":"$BUILDER_AGENT","validatorAgent":"$VALIDATOR_AGENT"}'

### Step 2: Create a Task
...
After TaskCreate, emit:
Bash: bun run scripts/emit-event.ts task.created '{"taskId":"<id>","subject":"<subject>"}'

### Step 3: Dispatch the Builder
Before dispatching, emit:
Bash: bun run scripts/emit-event.ts agent.dispatched '{"taskId":"<id>","role":"builder","agentType":"$BUILDER_AGENT","model":"sonnet"}'
...
After builder returns, emit:
Bash: bun run scripts/emit-event.ts agent.completed '{"taskId":"<id>","role":"builder","agentType":"$BUILDER_AGENT"}'

### Step 4: Dispatch the Validator
Before dispatching, emit:
Bash: bun run scripts/emit-event.ts agent.dispatched '{"taskId":"<id>","role":"validator","agentType":"$VALIDATOR_AGENT","model":"haiku"}'
...
After validator returns, emit:
Bash: bun run scripts/emit-event.ts agent.completed '{"taskId":"<id>","role":"validator","agentType":"$VALIDATOR_AGENT"}'

### Step 5: Report Result
After parsing verdict, emit:
Bash: bun run scripts/emit-event.ts verdict.received '{"taskId":"<id>","verdict":"PASS|FAIL"}'
...
At the very end:
Bash: bun run scripts/emit-event.ts orchestration.completed '{"taskId":"<id>","verdict":"PASS|FAIL"}'
```

Each emit is a single Bash call. If the server isn't running, each exits in <5ms (port file check fails). Total overhead for Stage 1: 6 emit calls x ~5ms = ~30ms when server is down, ~500ms when server is up (6 x 500ms timeout worst case, but fire-and-forget so non-blocking if Bash supports `&`).

### 3. `docs/patterns/event-driven-observability.md` (orchestrator-prototype)

New pattern doc following the established structure (What, How, Where):

- **What:** Fire-and-forget event emission from a markdown-based orchestrator to an external event bus
- **How:** Self-contained script called via Bash, discovers server via port file, POSTs partial envelope, fails silently. Each orchestration run gets a unique `orchestrationId` threaded through all events for correlation.
- **Why this pattern:** The orchestrator is a prompt, not a program. It can only interact with the outside world through tool calls. Bash is the universal escape hatch. This is a genuine unsolved gap -- nobody has implemented prompt-based agent telemetry where a markdown skill instructs an LLM to emit structured events.
- **Sources:**
  - Dumb-hook/smart-server pattern from @side-quest/observability
  - Fire-and-forget pattern from Temporal/Dagster activity emission
  - disler's Claude Code hooks (same POST-to-localhost architecture)
  - OpenClaw-OPS-Suite (@tom_doerr, 1,291 likes) -- validates real-time agent dashboard at 68-agent scale
  - AG2 + Cisco OTel contributions -- industry convergence on OpenTelemetry for multi-agent tracing (future direction for Stage 2+)
  - @VibeCoderOfek -- flat vs hierarchical trace debate (informs our "start flat, add hierarchy later" decision)

### 4. `types.ts` Addition (side-quest-observability)

Add an `OrchestrationType` union alongside the existing unions:

```typescript
/**
 * HOP Orchestrator lifecycle events.
 *
 * Why: Typed union for orchestration events published by the
 * orchestrator prototype. These arrive via the programmatic
 * POST /events endpoint (not hooks). The (string & {}) escape
 * hatch already accepts them, but explicit types give autocomplete
 * and exhaustive switch coverage.
 */
export type OrchestrationType =
  | 'orchestration.started'
  | 'orchestration.completed'
  | 'task.created'
  | 'agent.dispatched'
  | 'agent.completed'
  | 'verdict.received'

// Update the union:
export type EventType =
  | ClaudeHookEvent
  | WorktreeEvent
  | SessionEvent
  | OrchestrationType   // <-- add this
  | (string & {})
```

This is purely for developer ergonomics -- autocomplete and switch exhaustiveness. The system works without it.

### 5. `EventCard.vue` Color Addition (side-quest-observability)

In `getEventColor()`, add orchestration event color routing:

```typescript
// Orchestration events -- amber/orange
if (type.startsWith('orchestration.') || type.startsWith('task.') ||
    type.startsWith('agent.') || type.startsWith('verdict.')) {
  return 'var(--color-event-orchestration, #f59e0b)'  // amber-500
}
```

This gives orchestration events a distinct amber left border in the event feed, visually grouping them. Falls back to `#f59e0b` if the CSS variable isn't defined.

---

## Master Plan Update (orchestrator-prototype/specs/master-plan.md)

The master plan currently treats observability as implicit. It needs an explicit cross-cutting section that establishes observability as the backbone -- not a feature, but a requirement of every stage.

Add to the master plan:
- A new "Observability" section after "The HOP Pattern" explaining that every stage emits events
- Update the "Stages at a Glance" table to include which events each stage introduces
- Add `scripts/emit-event.ts` to the directory structure
- Add `docs/patterns/event-driven-observability.md` to the pattern docs listing
- Note in Stage 1 that `emit-event.ts` + emit calls in SKILL.md are part of the deliverable

---

## Correlation Model

### orchestrationId (this plan)

Each `/orchestrate` invocation generates a unique `orchestrationId` (crypto.randomUUID). Every event emitted during that run includes it in the `data` payload:

```typescript
// In emit-event.ts, the orchestrator passes orchestrationId as part of the JSON data:
// bun run scripts/emit-event.ts orchestration.started '{"orchestrationId":"abc123","prompt":"add hello world"}'

// All subsequent events include the same orchestrationId:
// bun run scripts/emit-event.ts agent.dispatched '{"orchestrationId":"abc123","taskId":"1","role":"builder"}'
```

This lets the dashboard filter/group all events from a single orchestration run. SKILL.md generates the ID in Step 1 and threads it through all emit calls.

### Relationship to EventEnvelope correlationId

`orchestrationId` lives in `data` -- it's application-level correlation, not infrastructure-level. This is intentionally separate from the `EventEnvelope.correlationId` field.

The existing specs explicitly defer envelope-level correlation hierarchy:
- `side-quest-plugins/specs/plans/observability-master-plan.md:30` -- "Any correlation hierarchy migration (`sessionCid` / `cid` / `parentCid`) is deferred to a separate post-OBS-8 proposal"
- `side-quest-plugins/specs/obs-8-full-hook-coverage-impl.md:13` -- "Any future correlation hierarchy migration is explicitly out of scope for OBS-8"

`orchestrationId` does NOT conflict with this scope guard because:
- It lives in `data`, not in envelope required fields
- The `EventEnvelope` schema is unchanged
- No server-side generation logic needed -- the orchestrator creates and threads it
- When envelope hierarchy (`sessionCid`/`cid`/`parentCid`) eventually lands, `orchestrationId` would naturally map to a `parentCid` value

**Decision:** Start flat (Stage 1 is single-task, no nesting needed). `orchestrationId` in `data` provides sufficient grouping. Defer hierarchical parent/child spans to Stage 2+ when DAG waves create actual nesting.

---

## Progressive Rollout Across Stages

Events grow with each orchestrator stage, mirroring the educational approach:

### Stage 1 Events (this plan)
```
orchestration.started      -- prompt received
task.created               -- single task created
agent.dispatched           -- builder or validator launched
agent.completed            -- builder or validator returned
verdict.received           -- PASS/FAIL parsed
orchestration.completed    -- result reported to user
```

### Stage 2 Events (future -- when DAG is added)
```
decomposition.completed    -- task graph constructed
spec.written               -- spec file persisted to disk
spec.reread                -- spec re-read at wave boundary
wave.started               -- wave N begins
wave.completed             -- wave N all verdicts in
```

### Stage 3 Events (future -- when retry/questions added)
```
clarification.requested    -- prompt too vague, questions asked
clarification.received     -- user answered
fastpath.evaluated         -- complexity assessed
fastpath.taken             -- simple task, skip DAG
retry.started              -- retry attempt N
retry.succeeded            -- retry passed
retry.failed               -- retry failed again
retry.exhausted            -- all retries spent, escalate to user
escalation.requested       -- orchestrator blocked, needs human
```

Each stage adds its events to the `OrchestrationType` union in @side-quest/observability and adds corresponding emit calls in the orchestrator's SKILL.md. Pattern docs updated progressively.

---

## Community Research Findings

Research via `/newsroom:investigate` across Reddit, X, and the web validated our approach and surfaced key patterns:

### Validation: Dumb Pipe is Consensus

The fire-and-forget emitter pattern is the dominant approach across the community:

- **disler's Claude Code hooks** -- POST JSON to localhost, fail silently. Exact same architecture as our `emit-event.ts`
- **TTS variant** (@OleksiyRutkovskyy) -- hooks that emit audio events via the same fire-and-forget POST pattern
- **68-agent dashboard** (@tom_doerr, OpenClaw-OPS-Suite, 1,291 likes) -- real-time monitoring of 68 Claude Code agents, all using dumb-pipe event emission to a central dashboard

Our approach mirrors the community consensus exactly. No need to deviate.

### Gap Identified: Prompt-Based Agent Telemetry

**Nobody has solved this yet.** The community has hook-based telemetry (Claude Code hooks emit events from TypeScript). But orchestrator-level telemetry -- where a markdown prompt (SKILL.md) instructs an LLM to call Bash to emit structured events at decision points -- has no existing implementation.

This is the genuine contribution of this plan. The gap exists because:
1. Most orchestrators are code-based (Python/TypeScript), not prompt-based
2. Hook-based telemetry requires a hook system (Claude Code has one; generic LLM prompts don't)
3. The "Bash as universal escape hatch from a prompt" pattern is novel for telemetry

### Debate: Flat Events vs Hierarchical Traces

Community is split on trace structure:

- **Flat JSONL** (our current approach) -- simple, greppable, works for Stage 1
- **Hierarchical traces** (@VibeCoderOfek) -- "too flat for A->B->C failure chains" -- parent/child relationships needed when debugging multi-agent cascades
- **OTel winning the standards war** -- AG2 shipped full OpenTelemetry tracing, Cisco contributing multi-agent span conventions

**Decision for this plan:** Start flat (Stage 1 is single-task, no nesting needed). Add `orchestrationId` to all events within a single `/orchestrate` run for correlation. Defer hierarchical parent/child spans to Stage 2+ when DAG waves create actual nesting. This matches the educational philosophy -- teach flat first, then teach why you need hierarchy.

### Pattern: Offline Queue (Future Stage)

doneyli.substack.com documented a `pending_traces.jsonl` pattern -- when the server is down, buffer events to a local file, drain on reconnect. Our current approach (silent discard) is correct for Stage 1 but this pattern is worth noting for Stage 3+ when losing retry/failure events would mean losing debugging context.

### Key Projects to Watch

| Project | What | Relevance |
|---------|------|-----------|
| OpenClaw-OPS-Suite (@tom_doerr) | 68-agent real-time dashboard | Validates our dashboard approach at scale |
| clawmetry.com | Agent analytics SaaS | Commercial validation of the space |
| Tapes (Go) | LLM telemetry library | Clean trace model worth studying |
| gerundium_ai | W3C trace context for agents | Standards-track multi-agent tracing |
| AG2 + Cisco OTel | OpenTelemetry for multi-agent | Industry convergence on OTel spans |

---

## Verification

1. Start the observability server: `cd ~/code/side-quest-observability && bun run packages/server/src/cli/index.ts server`
2. Open dashboard: `http://localhost:7483`
3. In orchestrator-prototype: `bun run scripts/emit-event.ts orchestration.started '{"prompt":"test","orchestrationId":"test-123"}'`
4. Verify event appears in dashboard with amber left border
5. Run full `/orchestrate "add hello world"` -- see 6 events stream through dashboard, all sharing the same orchestrationId
6. Kill server, run orchestrator again -- verify zero errors (silent fail)

---

## Related Documents

### This Repo

| Document | Purpose |
|----------|---------|
| [Master Plan](./master-plan.md) | HOP staged rollout, directory structure, branch strategy |
| [Agent Catalog](../docs/agents.md) | Builder/Validator definitions dispatched by the orchestrator |
| [Pattern: Dispatch Loop](../docs/patterns/dispatch-loop.md) | The 5-step cycle this plan adds emit calls to |
| [Pattern: Builder/Validator](../docs/patterns/builder-validator.md) | Agent roles that emit `agent.dispatched`/`agent.completed` events |
| [Pattern: Higher-Order Prompt](../docs/patterns/higher-order-prompt.md) | HOP parameterization -- why events use `$BUILDER_AGENT` not hardcoded names |

### External Repos

| Document | Repo | Purpose |
|----------|------|---------|
| [Observability Master Plan](~/code/side-quest-plugins/specs/plans/observability-master-plan.md) | side-quest-plugins | OBS-8 scope guard, correlation hierarchy deferral, envelope contract |
| [OBS-8 Full Hook Coverage](~/code/side-quest-plugins/specs/obs-8-full-hook-coverage-impl.md) | side-quest-plugins | 14-event hook coverage impl, schema stability notes |
| [EventEnvelope types](~/code/side-quest-observability/packages/server/src/types.ts) | side-quest-observability | `OrchestrationType` union added by this plan |
| [EventCard.vue](~/code/side-quest-observability/packages/client/src/components/EventCard.vue) | side-quest-observability | Amber color routing added by this plan |
