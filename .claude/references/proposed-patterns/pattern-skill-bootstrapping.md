---
slug: skill-bootstrapping
display_name: "Skill Bootstrapping"
one_liner: "A single meta-prompt that produces both a capability artifact (script, tool, agent) AND the AGENTS.md rules for future agents to use it -- creating a self-bootstrapping loop where each cycle adds compound capability."
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

skill-bootstrapping

## Quick Summary

Skill Bootstrapping is the generative pattern behind self-reflecting analytics, orchestration skills, and any situation where a coding agent builds a new tool. The core insight: asking an agent to build a tool is only half the job. The other half is asking it to simultaneously produce the rules and documentation so that future agents (including itself in future sessions) know the tool exists, how to invoke it, and what constraints apply. A single meta-prompt produces a triple: (1) the capability artifact -- a script, tool, or agent definition, (2) the usage rules -- an AGENTS.md section or skill reference scoped to the artifact's directory, and (3) a self-check -- a verified example proving the artifact works. This triple is the minimum viable unit for compound capability. Without the rules, the artifact is invisible to future agents. Without the self-check, the artifact may be broken. Without the artifact, the rules describe nothing.

## When To Use

- When building any new tool, script, or agent definition that other agents will use in future sessions
- When the orchestrator needs a new skill and the current session should produce both the implementation and the documentation
- When a capability gap is identified (by meta-prompting, by the user, or during a failed orchestration) and needs to be filled with a self-documenting solution
- When onboarding a new external tool (API, CLI, service) into the agent's skill set -- the bootstrap prompt produces the wrapper script and the rules simultaneously
- When the output of a meta-prompting proposal is "pattern gap: need a tool for X" -- skill bootstrapping is how you fill that gap

## Core Mechanism

The Skill Bootstrapping triple is produced by a single meta-prompt with three explicit deliverables:

**Deliverable 1: The Capability Artifact**
A script, tool, or agent definition file. This is the thing that does the work.

Requirements:
- CLI contract: documented arguments, example usage, JSON output where applicable
- Standalone: runs independently with no implicit dependencies on the current session's context
- Idempotent where possible: running it twice with the same input produces the same output

**Deliverable 2: The Usage Rules (Scoped AGENTS.md)**
A rules section or file that documents:
- **Scope:** which directories and files the rules apply to (never global unless genuinely global)
- **Boundaries:** what the tool can and cannot do, what side effects it has, what it must never modify
- **CLI Contract:** argument format, output format, example invocation
- **Self-Check Requirement:** "Run one verified example after changes"
- **Script/Tool Catalog:** updated list of available tools in this scope

The rules are placed at the appropriate level in the hierarchy:
- Tool-specific rules: alongside the tool in its directory
- Component-level rules: in the component's AGENTS.md section
- Project-level rules: in the project root (rare -- only for tools used everywhere)

**Deliverable 3: The Self-Check**
A concrete, runnable verification that proves the artifact works:
- For scripts: a sample invocation with expected output
- For agent definitions: a test dispatch with a trivial task
- For API wrappers: a smoke test against a known endpoint

The self-check is run immediately after the artifact is created. If it fails, the artifact is not considered bootstrapped.

**The Bootstrapping Loop:**

```
Meta-Prompt (human or meta-prompting proposal)
    |
    v
Agent produces: artifact + rules + self-check
    |
    v
Self-check passes? --NO--> Agent fixes artifact, re-runs check
    |
   YES
    |
    v
Rules are visible to future agents
    |
    v
Future agent encounters a task where the tool is relevant
    |
    v
Future agent reads rules, invokes artifact
    |
    v
Artifact output informs future decisions
    |
    v
New capability gap identified --> new meta-prompt --> cycle repeats
```

Each cycle adds a new capability to the agent's skill set. Over N cycles, the agent's available tools grow, and each tool is self-documenting and self-verifying.

## Key Rules

1. **Triple or nothing:** Never produce an artifact without rules. Never produce rules without an artifact. Never skip the self-check. All three are required for a skill to be considered bootstrapped.
2. **Scope rules narrowly:** Rules for a new analytics script apply to `scripts/analytics/`, not to the entire project. Overly broad rules interfere with unrelated agents and tools.
3. **Self-check runs immediately:** The self-check is not deferred -- it runs as part of the bootstrapping process. A skill that has not been verified is not a skill.
4. **CLI contract is mandatory:** Every artifact that other agents will invoke must document its arguments and output format. Agents cannot use tools they cannot invoke correctly.
5. **Catalog updates are part of bootstrapping:** When a new tool is added, the tool catalog in the scoped AGENTS.md must be updated. A tool not in the catalog is invisible to future agents scanning for available tools.
6. **Boundary documentation prevents blast-radius creep:** Explicitly state what the tool does NOT do and what it must NOT modify. Future agents respect documented boundaries; they probe undocumented ones.

## Implementation Notes

**Meta-prompt template for skill bootstrapping:**

A meta-prompt that reliably produces the triple follows this structure:

```
Build [tool description]. Requirements:

1. Create [artifact path] that [behavior description].
   - Takes [input format] as input
   - Outputs [output format]
   - [specific constraints]

2. Add rules to [AGENTS.md location] documenting:
   - Scope: which directories this applies to
   - Boundaries: what this tool must never modify
   - CLI contract: arguments, output format, example invocation
   - Self-check: one verified example command

3. Run the self-check and confirm the output matches expectations.
```

The three numbered deliverables make the triple explicit. Agents that receive a single vague instruction ("build an analytics tool") often produce the artifact but skip the rules and self-check.

**Interaction with meta-prompting:** When a meta-prompting proposal identifies a "pattern gap," the next step is a skill bootstrapping prompt that fills the gap. The meta-prompting pattern identifies what is needed; skill bootstrapping produces it. The two patterns form a discovery-to-implementation pipeline.

**Interaction with team-profiles:** Skill bootstrapping can produce new agent definitions (builders, validators, specialized agents). When a new agent type is bootstrapped, it requires both the agent definition file (`.claude/agents/<name>.md`) and a team profile update (`.claude/skills/orchestrator/teams/<name>.md`). The triple becomes a quadruple for agent bootstrapping: artifact + rules + team profile + self-check.

**Versioning:** The scoped AGENTS.md should include a version tag (e.g., `NY-Analytics (v1)` from the talk's slide). When the artifact changes significantly, bump the version. This signals to agents (and humans) that the rules may have changed.

**Progressive disclosure integration:** In side-quest-plugins, bootstrapped skills can use the references/ pattern -- the main SKILL.md documents the tool's existence (~100 tokens), and the full CLI contract, examples, and constraints live in a references/ file loaded only when the tool is invoked.

## Failure Modes

- **Artifact without rules:** The tool exists but no AGENTS.md documents it. Future agents do not know the tool is available. The capability is invisible -- it may as well not exist.
- **Rules without artifact:** AGENTS.md references a script that was never created or was deleted. Future agents attempt to invoke a nonexistent tool and waste tokens on errors.
- **Self-check skipped:** The artifact has a bug that the self-check would have caught. Future agents invoke the broken tool and produce incorrect results. The error propagates into downstream decisions.
- **Globally scoped rules:** Rules for a narrow-scope tool are placed in the root AGENTS.md. Every agent in the project reads rules that are irrelevant to its task, consuming context window tokens and potentially interfering with behavior.
- **Catalog not updated:** A new tool is bootstrapped but not added to the Script Catalog section. Future agents scanning for available tools do not find it. The tool exists but is not discoverable.
- **Boundary documentation missing:** The tool can modify files, but no boundary is documented. A future agent invokes the tool in a context where those modifications are destructive. Explicit boundary documentation ("this tool reads specs/ but never writes to them") prevents misuse.

## Signals & Diagnostics

- **Pattern is needed:** Agents repeatedly build one-off scripts that are never reused; tools built in one session are invisible in the next session; the same capability is rebuilt from scratch in multiple orchestration runs; meta-prompting identifies a "pattern gap" but no pipeline exists to fill it.
- **Pattern is working:** Every new tool in the project has a corresponding rules section in a scoped AGENTS.md; the Script Catalog grows over time; future agents successfully invoke tools built in prior sessions; self-checks pass after every tool change; the bootstrapping loop produces compound capability across runs.
- **Pattern is failing:** Tools are created without rules (invisible to future agents); rules reference deleted or renamed tools (broken references); self-checks are skipped and broken tools persist; rules are scoped globally and interfere with unrelated agents; the Script Catalog is stale and does not reflect available tools.

## Tradeoffs

**Gain:** Every new capability is self-documenting, self-verifying, and discoverable by future agents. The agent's skill set compounds across sessions -- each bootstrapping cycle adds a tool that persists. The triple structure (artifact + rules + self-check) prevents the three most common failure modes: invisible tools, broken tools, and undocumented tools. The pattern is the primitive that makes all other compound-learning patterns (meta-prompting, self-reflecting analytics, community pattern mining) possible -- they all require tools that future agents can discover and invoke.

**Cost:** Producing the triple takes more tokens than producing the artifact alone -- roughly 1.5-2x the cost of building just the tool. The rules and self-check are overhead that pays off only when the tool is reused in future sessions. For one-off, never-reused tools, the overhead is wasted. The scoping and cataloging requirements add maintenance burden -- catalogs must be kept current, scopes must be reviewed when directories are restructured.

## Related Patterns

- **self-reflecting-analytics** -- the canonical example of skill bootstrapping applied to observability; the analytics meta-prompt produces the analytics script, the scoped AGENTS.md, and the self-check
- **meta-prompting** -- identifies capability gaps ("pattern gap: need a tool for X") that skill bootstrapping fills; the two patterns form a discovery-to-implementation pipeline
- **plugin-architecture** -- in the side-quest-plugins context, each plugin IS a bootstrapped skill (manifest + commands/skills + README); the plugin anatomy mirrors the triple (artifact + rules + documentation)
- **higher-order-prompt** -- bootstrapped agent definitions extend the HOP by adding new team profiles that the fixed orchestration wrapper can consume without modification
- **spec-hardening** -- bootstrapped tools should have hardened specifications (concrete inputs, concrete outputs, concrete self-check) following the same rigor applied to task descriptions

## Source Anchors

Community evidence (not yet implemented in orchestrator stages):
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; slide: "Give coding agents analytics skills through AGENTS.md -- Leveraging Meta-Prompts to Automatically Build Data Pipelines and Analytics Tools"
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- written companion; three-panel architecture: Meta-Prompt (the seed) -> Analytics Script (the artifact) -> AGENTS.md (the rules)
- The slide's AGENTS.md shows the exact scoping and contract pattern: version tag (v1), scope declaration, boundary declaration, CLI Contract requirement, Self-Check requirement, Script Catalog
- Speaker: "We ask it please scan your home directory... build up a script to collect and analyze these traces... not only you can ingest and reflect, but you can collect data"
- The bootstrapping loop is implicit in the talk's structure: the analytics skill enables the orchestration skill enables the GitHub mining skill -- each cycle builds on the previous
- [@dani_avila7: Almost 40K downloads across just 3 Claude Code agents](https://x.com/dani_avila7/status/2017096001232781477) (1,441 likes, 138 reposts) -- evidence of skill/agent template distribution at scale via aitmpl.com
- [@antirez: Claude Code delegating to Codex via skill file](https://x.com/antirez/status/2017314325745086771) (865 likes, 49 reposts) -- practical example of a bootstrapped cross-agent skill
- [AGENTS.md Files: AI Agent Configuration -- Emergent Mind](https://www.emergentmind.com/topics/agents-md-files) -- median AGENTS.md is ~336 words, ~142 lines, consistent shallow hierarchy; "context debt" concept emerging
- [Complete Guide to Skills.md in 2026](https://www.flex.com.ph/articles/complete-guide-to-skillsmd-in-2026) -- Skills.md as complementary convention; YAML frontmatter (~100 tokens metadata), full instructions loaded on invocation
