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
TEAM:             engineering (default) | resolved from --team flag
BUILDER_AGENT:    (resolved from team profile)
VALIDATOR_AGENT:  (resolved from team profile)
SPEC_DIR:         specs/
```

In Stages 1-3, these were hardcoded defaults. The dispatch protocol referenced `$BUILDER_AGENT` and `$VALIDATOR_AGENT` as variables throughout, but they always resolved to `builder` and `validator`. In Stage 4, these variables are resolved dynamically from team profile files in `.claude/skills/orchestrator/teams/`.

### Why Parameterize From Day One?

Parameterizing from day one costs nothing. The variable references in SKILL.md are just markdown strings. There is no runtime overhead, no extra configuration, no indirection to reason about.

But it saves a significant refactor later. If we hardcoded `builder` and `validator` directly into the dispatch steps, Stage 4's team-switching feature would require finding and replacing every occurrence in the protocol. With variables, Stage 4 just changes the values at the top of the HOP Configuration block -- or passes them as flags.

More importantly, parameterizing from day one forces the architecture to be domain-agnostic by construction. If BUILDER_AGENT is a variable, the orchestration logic cannot accidentally depend on what a specific builder does. The dispatch protocol has to work for any builder. This constraint is what makes the HOP proof in Stage 4 possible: the orchestrator does not change at all when you switch teams.

### Stage 4: Full HOP Proof

Stage 4 completes the proof by introducing team profiles and `--team` flag switching. A user can invoke:

```
/orchestrate "add a utility function"                            # uses --team engineering (default)
/orchestrate "research top 5 TS testing frameworks" --team research
```

The team profile resolution happens in Step 1 of the 12-step dispatch protocol:

1. Parse `--team <name>` from the prompt (default: `engineering`)
2. Read the team profile from `.claude/skills/orchestrator/teams/<name>.md`
3. Extract `builder` and `validator` from the YAML frontmatter
4. Set `$BUILDER_AGENT` and `$VALIDATOR_AGENT` to the resolved values

#### Before and After

**Stage 3 HOP Configuration (hardcoded):**
```
BUILDER_AGENT:    builder
VALIDATOR_AGENT:  validator
```

**Stage 4 HOP Configuration (resolved from team profile):**
```
TEAM:             engineering (default) | resolved from --team flag
BUILDER_AGENT:    (resolved from team profile)
VALIDATOR_AGENT:  (resolved from team profile)
```

#### Proof by Diff

The diff between an engineering orchestration and a research orchestration is exactly two agent names in the event stream:

```diff
- team.resolved    { team: "engineering", builderAgent: "builder", validatorAgent: "validator" }
+ team.resolved    { team: "research", builderAgent: "research-builder", validatorAgent: "research-validator" }
```

Everything else -- the 12-step dispatch protocol, task creation, wave computation, spec file format, retry logic, plan refinement, token estimation, observability events, result reporting -- is identical between both invocations. The orchestrator does not change at all when you switch teams.

#### What Changes vs What Stays the Same

| Aspect | Engineering Team | Research Team | Same? |
|--------|-----------------|---------------|-------|
| Dispatch protocol | 12 steps | 12 steps | Yes |
| Task creation | TaskCreate + dependencies | TaskCreate + dependencies | Yes |
| Wave computation | Kahn's algorithm | Kahn's algorithm | Yes |
| Spec file format | Same template | Same template | Yes |
| Retry mechanics | 3x with resume | 3x with resume | Yes |
| Plan refinement | User review loop | User review loop | Yes |
| Builder agent | `builder` | `research-builder` | **No** |
| Validator agent | `validator` | `research-validator` | **No** |

Two cells differ. Everything else is identical. This is the proof that the orchestrator is a true Higher-Order Prompt -- the fixed wrapper is completely decoupled from the variable parameters.

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
| [`docs/patterns/team-profiles.md`](team-profiles.md) | Team profile pattern -- how agent identities are bundled and resolved |
