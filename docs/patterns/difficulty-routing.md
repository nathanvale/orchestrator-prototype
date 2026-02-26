# Difficulty Routing

**Introduced in: Stage 6**

---

## What It Is

Routing tasks to different execution engines based on assessed difficulty. Instead of sending all tasks to the same builder regardless of complexity, the orchestrator scores each task during decomposition and routes hard tasks to a more capable engine (Codex CLI) while keeping standard tasks on the faster, cheaper default builder (Claude Code sonnet).

This is a routing optimization, not a capability gate. The standard builder CAN handle hard tasks -- it just does so less reliably, leading to more retries and higher total cost. Difficulty routing reduces the expected retry rate for genuinely hard tasks by matching them to an engine better suited to deep reasoning.

---

## How We Use It Here

The orchestrator evaluates each task against a difficulty rubric during Step 4b (Difficulty Assessment):

**Hard signals (any match = hard):**
- Task touches 5+ files
- Task requires understanding complex existing code patterns (refactor, migration)
- Task involves algorithmic complexity (graph algorithms, concurrent state management)
- Task description uses words like "optimize", "refactor across", "migrate"
- Task has 5+ acceptance criteria
- Task requires cross-module dependency analysis

**Standard signals:**
- Greenfield file creation
- Modifies 1-2 files
- Follows existing patterns
- Clear input/output expectations

The difficulty field is advisory -- the orchestrator uses judgment. A task touching 5 files for a simple pattern (adding JSDoc) is still `standard`.

When a task is tagged `hard` and Codex CLI is available, the orchestrator routes to Codex instead of the standard builder. The validator always runs via Claude Code haiku regardless of builder.

**Fallback:** If Codex is not installed, exits non-zero, or times out (5 min), the orchestrator falls back to the standard builder. Fallback does not count against the retry cap.

**Override:** The `--no-codex` flag disables routing entirely -- all tasks use the standard builder.

---

## Why Difficulty Routing

### Cost Optimization

Don't use expensive engines for easy tasks. The standard builder handles the vast majority of tasks reliably. Only genuinely hard tasks benefit from escalation. This keeps the average cost per orchestration low while improving the success rate of the hardest tasks.

### Capability Matching

Some tasks genuinely need deeper reasoning -- complex refactors spanning many files, algorithmic work, or tasks requiring extensive codebase understanding. These are the tasks most likely to fail on first attempt and enter the retry loop. Routing them to a more capable engine reduces retries, which reduces total cost and latency.

### Graceful Degradation

Codex is optional. The orchestrator works identically without it -- all tasks route to the standard builder. Installing Codex adds a second tier of capability without changing the orchestration protocol. This makes difficulty routing a zero-risk optimization.

---

## Community Sources

**Multi-model routing:** The pattern of routing requests to different models based on complexity appears in several commercial AI systems. Anthropic's own recommended pattern of using Haiku for triage and Opus for complex reasoning reflects the same principle -- match the model to the task.

**OpenAI Codex CLI:** The `codex exec --full-auto` mode provides an alternative execution engine for code generation tasks, optimized for deep reasoning about codebases. Its structured output (JSONL events) makes it straightforward to integrate as an alternative builder.

**Complexity-based test splitting:** CI/CD systems like CircleCI split test suites by estimated runtime -- fast tests run first on cheaper infrastructure, slow tests run on more powerful runners. Same principle: route work to the right tier.

**Task complexity estimation in distributed systems:** Load balancers route requests to different backends based on estimated complexity. Simple reads go to read replicas; complex writes go to the primary. The routing heuristic is imperfect, but even a rough classification improves overall system efficiency.

---

## Trade-offs

| Advantage | Disadvantage |
|-----------|-------------|
| Reduces retry rates for hard tasks | Adds orchestration complexity (difficulty assessment step) |
| Cost-efficient (cheap engine for easy work) | Difficulty assessment is heuristic-based (can misclassify) |
| Graceful degradation (works without Codex) | Depends on external CLI (mitigated by fallback) |
| Zero-risk optimization (fallback is the default) | Codex timeout (5 min) adds latency when it fails |

**The misclassification risk:** The biggest concern is that the heuristic-based scoring will misclassify tasks -- tagging an easy task as `hard` (wasting Codex capacity) or a hard task as `standard` (leading to retries). The mitigation is that the standard builder retry loop still works as a safety net, and the difficulty signals are concrete enough to be reasonably accurate for most prompts.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Step 4b (Difficulty Assessment) and Step 10 (Codex dispatch branch) |
| [`.claude/skills/orchestrator/references/codex-escalation.md`](../../.claude/skills/orchestrator/references/codex-escalation.md) | Full difficulty scoring rubric, Codex CLI templates, fallback protocol |
| [`docs/patterns/spec-hardening.md`](spec-hardening.md) | Companion pattern -- hardening specs reduces failures regardless of routing |
| [`.claude/skills/orchestrator/references/dag-execution.md`](../../.claude/skills/orchestrator/references/dag-execution.md) | Difficulty Scoring section, Codex Dispatch section |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 6 overview and verification steps |
