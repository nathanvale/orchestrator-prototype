---
name: module-branch-validator
description: >-
  Validates that a module branch follows the lobby restructure framework.
  Checks execution infrastructure, CLAUDE.md composition, navigation,
  cumulative chain integrity, main-only artifact absence, and pattern
  doc counts. Reports VERDICT: PASS or VERDICT: FAIL.
  Use when: validating an orchestration module branch after building it,
  or auditing the full branch chain for framework compliance.
allowed-tools: Read, Glob, Grep, Bash
---

# Module Branch Validator

Read-only validation skill for module branches. This skill encodes the
full framework contract from the lobby restructure so any validator
agent can mechanically verify branch compliance.

This skill never writes code, creates files, or modifies the codebase.

---

## Parameters

The orchestrator MUST resolve these before injecting the skill into a
validator's prompt. Replace the `$VARIABLE` placeholders with actual
values.

```
MODULE:           $MODULE           # e.g. "orchestration"
BRANCH:           $BRANCH           # e.g. "orchestration/8-parallel" or "all" for full-chain
STAGE:            $STAGE            # e.g. 8, or "all" for full-chain
LOBBY_BRANCH:     $LOBBY_BRANCH     # e.g. "main" or "refactor/lobby-restructure"
MODE:             $MODE             # "single-branch" or "full-chain"
PREVIOUS_BRANCH:  $PREVIOUS_BRANCH  # e.g. "orchestration/7-hitl" (for single-branch diff check)
TOTAL_STAGES:     $TOTAL_STAGES     # e.g. 9 (total stages in this module)
TOTAL_PATTERNS:   $TOTAL_PATTERNS   # e.g. 19 (total patterns on lobby)
```

### Parameter Notes

- **MODULE** determines the branch prefix (`orchestration/*`,
  `prompt-eng/*`, etc.) and which checklist tables to use.
- **LOBBY_BRANCH** is where the validator reads lobby state from. During
  the build phase this may be a feature branch (e.g.,
  `refactor/lobby-restructure`), not `main`. After merge it becomes
  `main`.
- **STAGE** maps to the expected counts row in the Quick Reference
  table in the checklist. For full-chain mode, all stages are checked.
- **PREVIOUS_BRANCH** is needed for the clean diff check (C5). For
  stage 1, this is `main`. For full-chain mode, each consecutive pair
  is checked automatically.

---

## Workflow

### Step 1: Resolve Parameters

Verify all parameters are populated (no `$VARIABLE` literals remain).
If any are missing, report immediately:

```
VERDICT: FAIL -- missing parameter: $VARIABLE
```

### Step 2: Load Checklist

Read `references/checklist.md` for the complete validation rules. The
checklist has sections:

- **A. Lobby checks** -- main-only artifacts, dojo/advisor coverage
- **B. Per-branch checks** -- execution infra, CLAUDE.md, navigation,
  main-only absence, prompts, pattern counts, examples, agents catalog
- **C. Chain integrity** -- SKILL.md monotonicity, agents, references,
  flags, clean diffs, immutability, teams, lobby command, anchor format
- **D. Protection + infrastructure** -- branch protection, /learn, README
- **E. Lobby hygiene** -- configuration, agent-native, master plan, CI

**Mode determines scope:**

| Mode | Sections to run |
|------|----------------|
| single-branch | B (all checks for BRANCH) + C subset (chain position for STAGE) |
| full-chain | A + B (for every branch in MODULE) + C + D + E |

### Step 3: Execute Checks

Use the resolved parameters to run checks. Substitute BRANCH,
LOBBY_BRANCH, MODULE, and STAGE into the checklist commands.

**Key command patterns:**

| Check type | Command |
|-----------|---------|
| File exists on branch | `git show $BRANCH:<path>` (exit 0 = exists) |
| File exists on lobby | `git show $LOBBY_BRANCH:<path>` (exit 0 = exists) |
| File content | `git show $BRANCH:<path> \| grep '<pattern>'` |
| Line count | `git show $BRANCH:<path> \| wc -l` |
| Tree count | `git ls-tree $BRANCH <dir>/ \| wc -l` |
| Clean diff | `git diff $PREVIOUS_BRANCH..$BRANCH --stat` |
| Artifact absent | `git show $BRANCH:<path>` (should return error) |
| Lobby artifact present | `git show $LOBBY_BRANCH:<path>` (exit 0) |
| Lobby pattern count | `git ls-tree $LOBBY_BRANCH .claude/references/patterns/ \| wc -l` |

**Use the Quick Reference table** in the checklist to look up expected
counts for STAGE (docs/patterns, agents, references, teams, flags,
prompts).

### Step 4: Report

```
## Validation Report

**Module:** $MODULE
**Target:** $BRANCH (stage $STAGE)
**Mode:** $MODE
**Lobby:** $LOBBY_BRANCH

### Section B: Per-Branch Checks
- [PASS] B1: Execution infrastructure -- all 13 paths present
- [FAIL] B2: CLAUDE.md missing cross-branch hint -- <evidence>
...

### Section C: Chain Position
- [PASS] C1: SKILL.md lines -- N (within range for stage $STAGE)
...

### Issues
<numbered list of failures with evidence, or "None">

VERDICT: PASS
```

Rules:
- Any FAIL blocks overall VERDICT
- Include evidence for every FAIL (file path, expected vs actual)
- Do not suggest fixes -- describe the problem only
- Include resolved parameter values in the report header
