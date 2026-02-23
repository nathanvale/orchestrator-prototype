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

Read-only validation skill for orchestration module branches. This skill
encodes the full framework contract from the lobby restructure so any
validator agent can mechanically verify branch compliance.

This skill never writes code, creates files, or modifies the codebase.

---

## Workflow

### Step 1: Determine Scope

Parse the task description to identify:

- **Target branch(es):** which `orchestration/*` branch(es) to validate
- **Validation mode:** single-branch or full-chain audit

If the task says "validate orchestration/8-parallel", validate that one
branch. If it says "full framework audit" or "all branches", run the
full chain checklist.

### Step 2: Load Checklist

Read `references/checklist.md` for the complete validation rules. The
checklist has sections:

- **A. Lobby checks** -- main-only artifacts, dojo/advisor coverage
- **B. Per-branch checks** -- execution infra, CLAUDE.md, navigation, main-only absence, pattern counts
- **C. Chain integrity** -- SKILL.md monotonicity, agents, references, flags, clean diffs
- **D. Protection + infrastructure** -- branch protection, /learn, README
- **E. Lobby hygiene** -- configuration, agent-native, master plan, CI

For single-branch validation, run Section B checks only (plus the
relevant subset of Section C for chain position).

For full-chain audit, run all sections A through E.

### Step 3: Execute Checks

For each check, use the appropriate tool:

- **File existence:** `git show <branch>:<path>` via Bash (exit code 0 = exists)
- **File content:** `git show <branch>:<path>` via Bash, pipe to grep/wc
- **Line counts:** `git show <branch>:<path> | wc -l` via Bash
- **Pattern counts:** `git ls-tree <branch> <dir>/ | wc -l` via Bash
- **Clean diffs:** `git diff <branch-a>..<branch-b> --stat` via Bash
- **Flag parsing:** `git show <branch>:.claude/skills/orchestrator/SKILL.md | grep '<flag>'` via Bash
- **Artifact absence:** `git show <branch>:<path>` should return error (exit code 128)

### Step 4: Report

Use this exact format:

```
## Validation Report

**Target:** <branch name(s)>
**Mode:** <single-branch | full-chain>

### Section B: Per-Branch Checks
- [PASS] B1: Execution infrastructure present
- [FAIL] B2: CLAUDE.md missing cross-branch hint -- <evidence>
...

### Issues
<numbered list of failures with evidence, or "None">

VERDICT: PASS
```

Rules:
- Any FAIL blocks overall VERDICT
- Include evidence for every FAIL (file path, expected vs actual)
- Do not suggest fixes -- describe the problem only
