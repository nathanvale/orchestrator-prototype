# Iterative Refinement Pattern

**Introduced in: Stage 3 (Full Phase 1)**

---

## What It Is

Iterative Refinement is a human-in-the-loop gate between plan generation and plan execution. After the Orchestrator decomposes a user prompt into a task graph and writes a spec file, it stops and presents the plan for user review before dispatching any agents. The user can approve, modify, or cancel. No Builder is dispatched until the user has explicitly confirmed the plan.

```
[Decompose Prompt]
       |
       v
[Write Spec File]
       |
       v
[Present Plan to User] <---------+
       |                         |
       v                         |
  Approve? ----NO (Modify)-------+
       |
      YES
       |
       v
[Token Estimation]
       |
       v
[Dispatch Agents]
```

Combined with token estimation (Step 8), this forms a two-part checkpoint: the user sees what will be done and approximately what it will cost -- then agents run. This ordering matters. Presenting the plan before dispatching agents means the user can catch decomposition errors before they generate a large number of tokens on the wrong approach. The cost of presenting a plan is near zero; the cost of discovering a misunderstanding after 10 builder/validator cycles is not.

---

## How We Use It Here

The refinement loop runs across Steps 7 and 8 of [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md).

**Step 7: Plan Refinement**

The Orchestrator presents the task graph from the spec file as a formatted table:

| Task ID | Description | Depends On | Wave |
|---------|-------------|------------|------|
| T1      | Define User types in `src/types/user.ts` | -- | 1 |
| T2      | Implement `GET /users` handler | T1 | 2 |
| T3      | Implement `POST /users` handler | T1 | 2 |
| T4      | Write integration tests for user routes | T2, T3 | 3 |

Then asks: "Does this plan look right?"

The user has four options:

1. **Approve** (default) -- plan is correct, proceed to Step 8
2. **Modify tasks** -- change task descriptions, split or merge tasks, adjust dependencies
3. **Add more detail** -- provide additional context the decomposition missed (a specific API shape, a constraint, an existing file to consider)
4. **Cancel** -- halt orchestration entirely, emit `orchestration.cancelled`

If the user modifies or adds detail, the Orchestrator updates the spec file and re-presents the plan. This loop continues until the user approves or cancels. Emit `plan.approved` when the user confirms.

**Why the spec file is updated during refinement, not discarded:**

The spec file is the source of truth for the entire execution. If the user modifies the plan, those modifications must be written back to the spec file before agents run. An in-memory plan that diverges from the spec file is a consistency bug waiting to surface at wave 2 when the spec is re-read to determine what to dispatch next.

**Step 8: Token Estimation**

After plan approval, the Orchestrator presents a cost estimate:

- Base rate: approximately 4,500 tokens per task (builder dispatch + validator dispatch, averaged across task complexity)
- Formula: `N tasks x 4,500 tokens = ~Y total`
- Example: "This plan has 4 tasks. Estimated cost: ~18,000 tokens."

The estimate is informational -- there is no approval gate, no confirmation required. It is presented so the user has a mental model of scale before execution begins. After presenting the estimate, proceed immediately to task creation (Step 9).

**Why no approval gate on the estimate:**

The user already approved the plan in Step 7. Asking for approval again on the cost estimate would be redundant friction. The estimate is a data point, not a decision point. If the user's response to the estimate is "that's too many tokens," they have the option to go back and simplify the plan -- but this is a user-initiated action, not an orchestrator-imposed gate.

---

## Where It Comes From

**HITL (Human-in-the-Loop) patterns in ML pipelines:** Active learning and model deployment pipelines route uncertain or high-stakes predictions to a human reviewer before acting on them. The iterative refinement gate applies the same principle to agent orchestration: the plan is the model output; the user is the reviewer; approval gates the deployment of agents. The key HITL insight -- that human review is most valuable at the point of highest uncertainty -- maps directly to plan review at the decomposition stage.

**"Plan then execute" in AI coding agents:** Devin and OpenHands both show the plan before executing it. The pattern gained traction in 2024 as a direct response to users discovering that agents had misunderstood the scope of a task only after spending significant tokens on the wrong implementation. Showing the plan first costs nothing and catches the failure mode early.

**Preview modes in infrastructure-as-code:** `terraform plan` and `pulumi preview` show exactly what will change before applying any changes. The user reviews additions, modifications, and deletions -- then types `yes` to execute. Iterative refinement applies the same model to agent orchestration: the task graph is the "plan output," and no infrastructure (code, files) changes until the user confirms.

**Code review as a pattern:** Pull requests are a formalized version of "propose changes, review, approve or request changes, merge." The refinement loop mirrors this: the Orchestrator proposes (presents the task graph), the user reviews (approves or requests modifications), and the loop continues until approval or cancellation. The analogy is useful for explaining why refinement is not a blocker but a quality gate.

---

## Related Documents

| Document | What It Covers |
|----------|---------------|
| [`.claude/skills/orchestrator/SKILL.md`](../../.claude/skills/orchestrator/SKILL.md) | Steps 7 and 8 -- the full refinement loop and token estimation protocol |
| [`docs/patterns/spec-as-source-of-truth.md`](spec-as-source-of-truth.md) | The spec file that gets presented and modified during refinement |
| [`specs/master-plan.md`](../../specs/master-plan.md) | Stage 3 description and how iterative refinement fits in the full phase 1 protocol |
| [`docs/patterns/task-dag.md`](task-dag.md) | The task graph structure that refinement presents and the user reviews |
