# Higher-Order Prompt (HOP) Pattern

**Introduced in: Stage 1 (concept), Stage 4 (full proof)**

---

## What It Is

A Higher-Order Prompt is a prompt that takes another prompt as a parameter -- just like a higher-order function takes another function as an argument.

In functional programming, a higher-order function like `withRetry` wraps a target function with retry logic. The retry logic is fixed; what gets retried is variable:

```typescript
// Higher-order function
function withRetry<T>(fn: () => T, maxAttempts: number): T { ... }

// Usage -- fn is the variable parameter
withRetry(() => callExternalApi(), 3)
withRetry(() => writeToDatabase(), 5)
```

The HOP pattern applies this to prompts:

```
// Higher-order prompt
function orchestrate(BUILDER_AGENT, VALIDATOR_AGENT, USER_PROMPT) {
  // Fixed orchestration logic:
  // - Parse the user prompt
  // - Create a task
  // - Dispatch BUILDER_AGENT
  // - Dispatch VALIDATOR_AGENT
  // - Report result
}

// Usage -- agents are the variable parameters
orchestrate('builder', 'validator', 'add a greet function')
orchestrate('research-builder', 'research-validator', 'research top TS frameworks')
```

**Fixed wrapper** = the orchestration logic: the 5-step dispatch protocol, task creation, validation cycle, result reporting. This never changes between teams.

**Variable parameters** = agent identities: which builder runs, which validator checks, which persona voice is used. These are swapped by changing a few lines in the HOP Configuration block.

---

## How We Use It Here

The HOP variables are declared at the top of [`SKILL.md`](../../.claude/skills/orchestrator/SKILL.md):

```
USER_PROMPT:      (provided by the user)
BUILDER_AGENT:    builder
VALIDATOR_AGENT:  validator
SPEC_DIR:         specs/
```

In Stage 1, these are hardcoded defaults. The dispatch protocol references `$BUILDER_AGENT` and `$VALIDATOR_AGENT` as variables throughout -- in the agent dispatch calls, in the observability events, in the report. But in Stage 1, those variables always resolve to `builder` and `validator`.

### Why Parameterize From Day One?

Parameterizing from day one costs nothing. The variable references in SKILL.md are just markdown strings. There is no runtime overhead, no extra configuration, no indirection to reason about.

But it saves a significant refactor later. If we hardcoded `builder` and `validator` directly into the dispatch steps, Stage 4's team-switching feature would require finding and replacing every occurrence in the protocol. With variables, Stage 4 just changes the values at the top of the HOP Configuration block -- or passes them as flags.

More importantly, parameterizing from day one forces the architecture to be domain-agnostic by construction. If BUILDER_AGENT is a variable, the orchestration logic cannot accidentally depend on what a specific builder does. The dispatch protocol has to work for any builder. This constraint is what makes the HOP proof in Stage 4 possible: the orchestrator does not change at all when you switch teams.

### Stage 4: Full HOP Proof

Stage 4 adds `--team` flag support. A user can invoke:

```
/orchestrate "add a utility function"                            # uses --team engineering (default)
/orchestrate "research top 5 TS testing frameworks" --team research
```

The HOP Configuration block becomes:

```
BUILDER_AGENT:    builder          (or research-builder if --team research)
VALIDATOR_AGENT:  validator        (or research-validator if --team research)
```

Everything else -- the 5-step dispatch protocol, task creation, observability events, result reporting -- is identical between both invocations. Only the agent names change.

This is the proof. Same orchestrator, different agents, same results. The DAG engine (Stage 2), wave computation (Stage 2), and retry logic (Stage 3) are all part of the fixed wrapper -- they stay constant regardless of what agents are plugged in.

---

## Where It Comes From

**IndyDevDan** coined the term "Higher-Order Prompt" by analogy with higher-order functions. His framing: just as `map` and `filter` are higher-order functions that take functions as parameters, a HOP is a prompt that takes prompts (agent definitions) as parameters. The key insight is that the orchestration wrapper and the agent identities are separate concerns that should be separately configurable.

**Medium / Data Science Collective** published several articles in 2024-2025 exploring parameterized prompt templates for multi-agent systems. The convergent finding: separating the "what to do" (orchestration logic) from the "who does it" (agent identity) is the key to reusable orchestration.

**LangChain deep agents** (565 likes on the reference post): The LangChain community validated this pattern by showing that an agent graph with swappable node implementations outperforms one where the node implementations are baked into the graph definition. The graph is the fixed wrapper; the nodes are the variable parameters.

**skill-compose** (@tom_doerr, 159 likes): A prototype showing that Claude Code skills can be composed -- the output of one skill becomes the input of another, with the composition logic as the higher-order layer. HOP applies this to agent teams rather than skills.

**Community validation:** @ericzakariasson (241 likes) and @y_matsuwitter (442 likes) both independently described patterns where the same orchestration infrastructure ran different agent teams for different domains. The convergence from different communities on the same architecture is strong evidence that the pattern is correct.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`docs/patterns/builder-validator.md`](builder-validator.md) | The default agents that populate BUILDER_AGENT and VALIDATOR_AGENT in Stage 1 |
| [`docs/patterns/dispatch-loop.md`](dispatch-loop.md) | The fixed orchestration logic that the HOP wraps |
| [`docs/agents.md`](../agents.md) | Full agent catalog, including Stage 4 research agents that demonstrate HOP switching |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 4 section -- HOP parameterization proof design |
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | The HOP Configuration block with BUILDER_AGENT and VALIDATOR_AGENT variables |
