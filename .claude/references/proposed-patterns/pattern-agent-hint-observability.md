---
slug: agent-hint-observability
display_name: "Agent-Hint Observability"
one_liner: "Instrument CLIs and services with structured logging that auto-switches between human-readable and machine-parseable output, embedding actionable hints (error codes, next-actions, retryability) so AI agents can diagnose failures and self-correct without parsing prose."
intel_date: 2026-02-27
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

agent-hint-observability

## Quick Summary

Agent-Hint Observability is the practice of instrumenting CLIs and services so that every error, warning, and diagnostic carries machine-readable metadata -- error codes, suggested next-actions, and retryability flags -- alongside human-readable messages. The core enforcement mechanism is tri-modal output: the same tool emits human-friendly text to a TTY, structured JSON Lines to stderr when piped, and a typed JSON envelope on stdout for programmatic consumers. AI agents calling the tool get actionable hints ("retry after 5s", "run auth", "escalate to human") without parsing prose, while humans see familiar colored terminal output. The pattern bridges structured logging (LogTape, Pino, etc.) with an explicit error-action contract inspired by RFC 7807 Problem Details.

## When To Use

- CLI tools consumed by both humans and AI agents -- you need one codebase to serve both audiences
- Error recovery must be machine-driven -- agents need to branch on "retry", "re-auth", or "escalate" without parsing error text
- Parallel or multi-step agent workflows where correlating log lines across subtasks requires a shared run ID
- Debugging failures in agent-invoked tools where the agent currently gets only an opaque error string
- Libraries that must be logging-silent when used as a dependency but fully observable when run as a CLI
- Tools where you observe agents hallucinating recovery steps because the error output lacks structured affordances
- Any service where "most agent observability is just logs + vibes" (r/AI_Agents) and you want to move beyond that

## Core Mechanism

The pattern has three interlocking layers:

**Layer 1: Structured Logging with Auto-Format Switching**

Use a structured logging library (LogTape, Pino, etc.) that treats log entries as data, not strings. Each log call carries a message template with `{placeholder}` properties that become queryable fields in JSON output:

```typescript
logger.debug('Request {method} {url} (timeout={timeoutMs}ms)', {
  method: 'GET',
  url: endpoint,
  timeoutMs: 5000,
  ...getLogContext(), // spreads { runId } from AsyncLocalStorage
})
```

The sink auto-switches based on output context:
- **TTY stderr** -- human-readable with ANSI colors and `[prefix]` labels
- **Piped stderr** -- JSON Lines (one JSON object per line), machine-parseable
- **`--json` flag** -- forces JSON Lines regardless of TTY detection
- **`--quiet` flag** -- suppresses all output below `error` level

**Layer 2: Error-Action Contract (Agent Hints)**

Every error response includes machine-readable fields that tell the consuming agent what to do next. This follows the RFC 7807 Problem Details pattern extended with action semantics:

```typescript
const ERROR_CODE_ACTIONS: Record<string, { action: string; retryable: boolean }> = {
  E_NETWORK:       { action: 'CHECK_NETWORK',    retryable: false },
  E_RATE_LIMITED:  { action: 'WAIT_AND_RETRY',    retryable: true  },
  E_UNAUTHORIZED:  { action: 'RUN_AUTH',          retryable: false },
  E_STALE_DATA:    { action: 'REFETCH_AND_RETRY', retryable: true  },
  E_USAGE:         { action: 'FIX_ARGS',          retryable: false },
  E_RUNTIME:       { action: 'ESCALATE',          retryable: false },
}
```

The `writeError` function injects these hints into every JSON error envelope:

```json
{
  "status": "error",
  "message": "Rate limited by Reddit API",
  "error": {
    "code": "E_RATE_LIMITED",
    "action": "WAIT_AND_RETRY",
    "retryable": true
  }
}
```

The agent reads `action` and `retryable` -- it never parses `message`.

**Layer 3: Context Propagation via AsyncLocalStorage**

A `runId` is generated once at CLI startup and propagated automatically to every log call via `AsyncLocalStorage`. This means all log lines from a single invocation -- across parallel subtasks, retries, and nested function calls -- share the same correlation ID without threading it as a parameter:

```typescript
const logContext = new AsyncLocalStorage<{ runId: string }>()

export function withContext<T>(ctx: { runId: string }, fn: () => T): T {
  return logContext.run(ctx, fn)
}

// At CLI entry:
withContext({ runId: crypto.randomUUID().slice(0, 8) }, () => runSearch(args))
```

## Key Rules

1. **stdout is data, stderr is diagnostics.** JSON envelopes and program output go to stdout. Log messages, progress indicators, and error diagnostics go to stderr. Mixing them corrupts both streams -- a real bug (see Anthropic SDK issue #157 where debug logs on stdout broke JSON-RPC).

2. **Every JSON error envelope must include `action` and `retryable` fields.** The agent must never need to parse the human-readable `message` field to decide what to do next. If you add a new error code, you must add its action mapping.

3. **Log format switches automatically based on output context.** TTY gets human-readable; piped/`--json` gets JSON Lines. An env var override (`LOG_FORMAT=text`) ensures test determinism in non-TTY environments.

4. **Libraries are silent by default.** A `getLogger()` call in library code produces zero output until `setupLogging()` is called by the CLI entry point. Library consumers never see unexpected log messages.

5. **Warnings include remediation context.** Every warning answers three questions: (1) what happened, (2) what the tool did about it, (3) whether user action is needed. Raw warnings without context alarm users and confuse agents.

6. **`writeError()` owns user-facing errors; `logger.error()` owns diagnostic traces.** Never duplicate the same error message in both channels. The user sees "Search failed" on stderr via `writeError()`. The log trace carries the structured context (retry count, response codes, timing) via `logger.error()`.

7. **Shutdown is guaranteed.** `shutdownLogging()` runs on every exit path via try/finally (normal, error) and SIGINT handler. It is idempotent -- safe to call before setup, after failed setup, or multiple times.

## Implementation Notes

**Sink selection logic:**

```typescript
function shouldUseJsonLogs(options: LoggingOptions): boolean {
  if (process.env.LOG_FORMAT === 'text') return false
  if (process.env.LOG_FORMAT === 'json') return true
  if (options.json) return true
  return !process.stderr.isTTY
}
```

**Fingers-crossed buffering (advanced):**

For default mode (no flags), buffer all log messages in memory and only flush if an `error`-level event fires. Users get zero noise on success but the full debug trace on failure:

```typescript
fingersCrossed(baseSink, {
  triggerLevel: 'error',
  maxBufferSize: 500,
})
```

This is powerful but adds complexity -- defer it until you have evidence that users need retroactive debug traces.

**Logger category hierarchy:**

Namespace loggers by module so you can enable per-module debug logging later:

```
app                    # Root
├── app.cli            # Arg parsing, entry/exit
├── app.cache          # Cache hits, misses, stale fallbacks
├── app.http           # HTTP retries, rate limits
├── app.search         # Search orchestration
│   ├── app.search.reddit
│   └── app.search.x
└── app.auth           # Authentication flows
```

**ProgressDisplay interaction:**

Animated spinners and structured logs interleave badly on stderr. Suppress spinners when `--debug` or `--quiet` is active:

| Flag | Progress Mode | Log Level |
|------|--------------|-----------|
| (none) | animated | warning |
| `--debug` | off | debug |
| `--quiet` | off | error |

**Status commands as agent primitives:**

Beyond error hints, expose a `status` subcommand that returns a `diagnosis` and `nextAction` in its JSON payload. An agent calling `tool status --json` gets `{ "diagnosis": "needs-auth", "nextAction": "RUN_AUTH" }` and can branch without any string parsing.

## Failure Modes

- **Stdout/stderr mixing:** Debug logs written to stdout corrupt the JSON envelope. Agents parse a hybrid blob and fail silently. This is a correctness bug, not a cosmetic issue -- the Anthropic SDK had exactly this problem (issue #157).
- **Missing action mappings:** A new error code is added without an `ERROR_CODE_ACTIONS` entry. The agent gets `action: undefined` and falls through to a default that may be wrong. Mitigate with a fallback (`action: 'ESCALATE', retryable: false`) and a lint rule that requires every error code to have a mapping.
- **Warnings without remediation context:** A bare "Cache write failed" warning causes the user to panic and the agent to attempt unnecessary recovery. Always answer: what happened, what the tool did, and whether action is needed.
- **TTY detection mismatch in tests:** Tests run via `spawnSync()` (non-TTY) get JSON Lines format unexpectedly, breaking assertions written for human-readable output. The `LOG_FORMAT=text` env var override exists precisely for this.
- **Fingers-crossed buffer overflow:** If a run generates more log messages than `maxBufferSize` before an error, the oldest are silently dropped. Size the buffer for your typical run (e.g., 200-500 messages).
- **AsyncLocalStorage context leak:** If a `Promise.all()` branch leaks a promise that resolves after the `withContext()` scope closes, its logs lose the `runId`. Non-critical -- logs still emit, just without the correlation ID.

## Signals & Diagnostics

- **Pattern is needed:** Agents calling your CLI get opaque error strings and hallucinate recovery steps. Debugging agent-invoked failures requires re-running with source code changes. You have multiple disconnected debug systems (env vars, flags, `console.error`). Users say "it failed but I don't know why."
- **Pattern is working:** Agents branch on `action` and `retryable` fields without parsing error text. `--debug` produces a complete structured trace. JSON Lines output is parseable by `jq` and downstream tooling. All log lines from one run share a `runId`. Default mode produces zero diagnostic noise on success.
- **Pattern is failing:** Agents still parse `message` strings because `action` fields are missing or wrong. Stdout contains log messages mixed with data. Tests are flaky because log format varies between TTY and non-TTY. Warnings lack remediation context and trigger false alarms.

## Tradeoffs

**Gain:** AI agents can self-correct based on structured error metadata without parsing prose. Humans get the same familiar CLI experience with colored terminal output. A single codebase serves three consumers (human, script, agent) via automatic format switching. Debugging agent-invoked failures drops from "edit source, rebuild, re-run" to `--debug`. The error-action contract serves as executable documentation of the tool's failure modes and recovery paths. Context propagation via `runId` enables log correlation across parallel subtasks without parameter threading.

**Cost:** Every new error code requires a corresponding action mapping -- this is ongoing maintenance. The structured logging library is a new dependency (though LogTape is 5.3 KB with zero transitive deps). The three-output-mode logic (TTY detection, format switching, progress display suppression) adds real complexity to the CLI entry point. Fingers-crossed buffering, while powerful, is hard to reason about and test. The pattern front-loads significant design work that only pays off when your tool is actually consumed by agents -- if it's human-only, a simpler logging setup suffices.

## Related Patterns

- **context-engineering** -- observability feeds the context agents need to self-correct; agent hints are a form of pre-processed context that reduces agent reasoning load
- **self-reflecting-analytics** -- agents summarizing their own execution traces builds on the structured logs this pattern produces
- **no-fake-no-mock** -- real structured output is tested end-to-end; the log invariant tests (no logs in stdout, clean stderr in quiet mode) are a form of no-fake testing
- **three-layer-influence** -- agent hints are machine-readable influence at the tool layer; the error-action contract is how tools influence agent behavior without natural language

## Source Anchors

- [Designing API Error Messages for AI Agents -- Nordic APIs](https://nordicapis.com/designing-api-error-messages-for-ai-agents/) -- RFC 7807 Problem Details for agents; "AI agents rely entirely on explicit semantics and clear affordances to reason about next steps, and without this, they can behave unpredictably"; recovery paths via HATEOAS links, `retry_after` timing, and `doc_uri` references
- [Keep the Terminal Relevant: Patterns for AI Agent-Driven CLIs -- InfoQ](https://www.infoq.com/articles/ai-agent-cli/) -- tri-modal output, semantic exit codes, MCP integration; "Human and agent interfaces require fundamentally different interaction models, not optional enhancements"; AWS CLI v2 cautionary tale on pager breaking CI
- [Structured logging -- LogTape](https://logtape.org/manual/struct) -- `{placeholder}` properties as structured fields; JSON Lines formatter for machine parsing; zero-dependency, library-first no-op default
- [Get structured output from agents -- Anthropic Agent SDK](https://platform.claude.com/docs/en/agent-sdk/structured-outputs) -- `subtype` field on result messages ("success" or "error_max_structured_output_retries") as precedent for machine-readable result codes that agents branch on
- [@benhylak on X](https://x.com/benhylak/status/2026712861666587086) (412 likes, 30 reposts) -- "today, we're introducing self diagnostics: the first ever way for agents to proactively self-report issues they encounter"
- [@rauchg/Vercel on X](https://x.com/rauchg/status/2021409454047232430) (483 likes, 27 reposts) -- shipped `get_runtime_logs` in MCP server + `vc logs --status-code 404 --limit 10` as agent primitives; "Just ask Claude Code to fix your crashes"
- [Observability is Broken -- r/AI_Agents](https://www.reddit.com/r/AI_Agents/comments/1qv6wow/observability_is_broken/) (12 comments) -- community consensus: "most 'agent observability' is just logs + vibes"; proposed fix: structured JSON logs, trace IDs, preflight checks, confidence scoring
