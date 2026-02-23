# Module Branch Validation Checklist

Comprehensive checklist for validating orchestration module branches
against the lobby restructure framework. Source of truth:
`docs/plans/2026-02-23-refactor-lobby-branch-restructure-plan.md` and
`specs/master-plan.md`.

---

## A. Lobby Checks (main branch only)

### A1. Main-Only Artifacts PRESENT

| Path | What to verify |
|------|---------------|
| `.claude/commands/learn.md` | Exists, lists all stages, has YAML envelope with `stages:` count |
| `.claude/commands/lobby.md` | Exists |
| `.claude/skills/agentic-dojo/SKILL.md` | Exists |
| `.claude/skills/pattern-advisor/SKILL.md` | Exists |
| `.claude/references/patterns/pattern-*.md` | Count matches expected total (currently 19) |
| `docs/patterns/*.md` | Count matches expected total (currently 19) |
| `.claude/CLAUDE.md` | Describes lobby identity + documents 11-slot pattern contract |
| `README.md` | Learning hub with N-stage module table + GitHub compare URLs |
| `specs/master-plan.md` | Full definitions for all stages, accurate status table, branch tree with line counts |

### A2. Execution Artifacts ABSENT from main

These must NOT exist on main:

| Path | Why |
|------|-----|
| `.claude/skills/orchestrator/` | Orchestrator lives on module branches only |
| `.claude/agents/` | Agents are execution artifacts |
| `.claude/commands/orchestrate.md` | Only on module branches |
| `scripts/emit-event.ts` | Only consumed by orchestrator |
| `src/` directory | No code to run on main |
| `tests/` directory | No code to test on main |

### A3. Dojo + Advisor Coverage

| Check | How to verify |
|-------|--------------|
| Dojo zero-state list has N patterns | Read SKILL.md, count patterns in the zero-state block |
| Dojo keyword table has N entries | Count rows in keyword table (each with a file path) |
| Dojo alias table covers all N patterns | Count distinct "Resolves To" values |
| Advisor scoring table has N entries | Count rows with scoring signals |

### A4. Source Anchors

| Check | How to verify |
|-------|--------------|
| All pattern refs have populated source anchors | Read each `pattern-*.md`, verify `## Source Anchors` is not empty |
| No "Planned" labels for completed stages | Grep for "Planned" -- only acceptable for stages not yet built |
| All anchors use `orchestration/*` format | Grep for `stage/` in anchors -- should return zero matches |
| Spot-check 3 anchors | Pick 3, run `git show <branch>:<file>` and verify line range exists |

### A5. Pattern Contract

| Check | How to verify |
|-------|--------------|
| All pattern refs have 11 slot headings | For each `pattern-*.md`, verify all 11 `##` headings exist |
| CLAUDE.md documents the contract | Read CLAUDE.md, verify 11-slot schema is documented |

The 11 required slot headings:
1. `## Pattern ID`
2. `## Quick Summary`
3. `## When To Use`
4. `## Core Mechanism`
5. `## Key Rules`
6. `## Implementation Notes`
7. `## Failure Modes`
8. `## Signals & Diagnostics`
9. `## Tradeoffs`
10. `## Related Patterns`
11. `## Source Anchors`

---

## B. Per-Branch Checks (for each `orchestration/*` branch)

### B1. Execution Infrastructure PRESENT

| Path | Required on |
|------|-------------|
| `.claude/skills/orchestrator/SKILL.md` | All stages (1-9) |
| `.claude/commands/orchestrate.md` | All stages (1-9) |
| `.claude/commands/lobby.md` | All stages (1-9) |
| `.claude/agents/builder.md` | All stages (1-9) |
| `.claude/agents/validator.md` | All stages (1-9) |
| `scripts/emit-event.ts` | All stages (1-9) |
| `.claude/CLAUDE.md` | All stages (1-9) |
| `.claude/settings.json` | All stages (1-9) |
| `src/` directory | All stages (1-9) -- verification target for orchestrated tasks |
| `tests/` directory | All stages (1-9) -- test targets |
| `package.json` | All stages (1-9) -- inherited config |
| `tsconfig.json` | All stages (1-9) -- inherited config |
| `biome.json` | All stages (1-9) -- inherited config |

Verify with: `git show <branch>:<path>` (exit code 0 = exists)

### B2. CLAUDE.md Has All 4 Required Elements

Every module branch CLAUDE.md must contain:

1. **Stage identity** -- what this stage adds AND what it does NOT do
2. **"Return to main for /dojo"** -- guidance to use main for pattern learning
3. **Cross-branch `git show` hint** -- example command like `git show main:docs/patterns/<pattern>.md`
4. **Cross-branch reading section** -- explains how to read files from other branches

Verify by reading CLAUDE.md and checking for each element. Look for:
- "does NOT" or "NOT in Stage" (element 1)
- "main" + "dojo" or "lobby" (element 2)
- "git show" (element 3)
- "cross-branch" or "reading" section heading (element 4)

### B3. README.md Has Navigation Footer

| Check | Required on |
|-------|-------------|
| Previous link | Stages 2-9 (stage 1 has no previous -- links to main) |
| Next link | Stages 1-8 (stage 9 says "planned/future") |
| All Modules link to main | All stages (1-9) |

Look for a navigation table or section at the bottom of README.md with
Previous / Next / All Modules entries.

### B4. Main-Only Artifacts ABSENT

These must NOT exist on any module branch:

| Path | Why |
|------|-----|
| `.claude/skills/agentic-dojo/` | Main only (future: plugin) |
| `.claude/skills/pattern-advisor/` | Main only |
| `.claude/skills/module-branch-validator/` | Main only (validation skill) |
| `.claude/commands/learn.md` | Main only |
| `.claude/references/patterns/` | Main only (structured refs with 11-slot frontmatter) |

Verify with: `git show <branch>:<path>` should return error (exit 128)

### B5. Test Prompts Directory

Each stage should have a `prompts/stage-N/` directory with test prompts
specific to that stage's features.

| Stage | Expected directory |
|-------|--------------------|
| 1 | `prompts/stage-1/` (at least 2 prompt files) |
| 2 | `prompts/stage-2/` (at least 2 prompt files) |
| 3 | `prompts/stage-3/` (at least 3 prompt files) |
| 4 | `prompts/stage-4/` (at least 2 prompt files) |
| 5 | `prompts/stage-5/` (at least 1 prompt file) |
| 6 | `prompts/stage-6/` (at least 2 prompt files) |
| 7 | `prompts/stage-7/` (at least 2 prompt files) |
| 8 | `prompts/stage-8/` (at least 3 prompt files) |
| 9 | `prompts/stage-9/` (at least 3 prompt files) |

Verify with: `git ls-tree <branch> prompts/stage-N/ | wc -l`

Note: Earlier stages' prompts are inherited through the chain. Stage 5
should also have `prompts/stage-1/` through `prompts/stage-4/`.

### B6. `docs/patterns/` Cumulative Count

Pattern docs accumulate through the chain. Each stage must have at least
the count from the previous stage plus its new patterns.

| Stage | Branch | Minimum Count | Patterns Expected |
|-------|--------|--------------|-------------------|
| 1 | orchestration/1-dispatch | 3 | builder-validator, dispatch-loop, higher-order-prompt |
| 2 | orchestration/2-dag | 6 | + task-dag, wave-computation, spec-as-source-of-truth |
| 3 | orchestration/3-full | 9 | + retry-with-resume, fast-path-gate, iterative-refinement |
| 4 | orchestration/4-hop | 9 | (team-profiles first appears on stage 5) |
| 5 | orchestration/5-plugin | 11 | + team-profiles, plugin-architecture |
| 6 | orchestration/6-codex | 13 | + difficulty-routing, spec-hardening |
| 7 | orchestration/7-hitl | 15 | + hitl-protocol, hydration-pattern |
| 8 | orchestration/8-parallel | 17 | + parallel-dispatch, worktree-isolation |
| 9 | orchestration/9-browser | 19 | + browser-validation, ralph-wiggum-loop |

Verify with: `git ls-tree <branch> docs/patterns/ | wc -l`

**Note:** Stage 4 has 9 (not 10) because `team-profiles.md` was first
added on stage 5 alongside `plugin-architecture.md` during the lobby
restructure. This is a known historical artifact.

### B7. `specs/examples/` Output Files

Example spec outputs demonstrate what the orchestrator produces at each
stage. Not every stage requires a new example, but stages that introduce
significant new behavior should have one.

| Stage | Expected example file |
|-------|-----------------------|
| 2 | `specs/examples/stage-2-rest-api.md` |
| 4 | `specs/examples/stage-4-research-team.md` |
| 8 | `specs/examples/stage-8-parallel-dispatch.md` |
| 9 | `specs/examples/stage-9-browser-validation.md` |

Verify with: `git show <branch>:specs/examples/<filename>` (exit 0 = exists)

### B8. `docs/agents.md` Agent Catalog

The agent catalog documents all agents available at this stage:

| Stages | Expected content |
|--------|-----------------|
| 1-3 | builder, validator (2 agents) |
| 4-8 | + research-builder, research-validator (4 agents) |
| 9 | + browser-validator concept (4+ agents or updated descriptions) |

Verify with: `git show <branch>:docs/agents.md` and check agent entries.

---

## C. Chain Integrity

### C1. SKILL.md Line Counts Are Monotonically Non-Decreasing

Record line count for each stage. Verify N <= N+1 for all consecutive
pairs. Known actual values:

| Stage | Branch | Lines |
|-------|--------|-------|
| 1 | orchestration/1-dispatch | 152 |
| 2 | orchestration/2-dag | 407 |
| 3 | orchestration/3-full | 710 |
| 4 | orchestration/4-hop | 769 |
| 5 | orchestration/5-plugin | 769 |
| 6 | orchestration/6-codex | 945 |
| 7 | orchestration/7-hitl | 1114 |
| 8 | orchestration/8-parallel | ~1200 (range: 1100-1250) |
| 9 | orchestration/9-browser | ~1300 (range: 1200-1400) |

Verify with: `git show <branch>:.claude/skills/orchestrator/SKILL.md | wc -l`

### C2. Stage-Specific Agents

| Stages | Expected agents in `.claude/agents/` |
|--------|-------------------------------------|
| 1-3 | builder.md, validator.md (2 agents) |
| 4-9 | + research-builder.md, research-validator.md (4 agents) |

Verify with: `git ls-tree <branch> .claude/agents/ | wc -l`

### C3. Stage-Specific References

| Stage | Expected files in `.claude/skills/orchestrator/references/` |
|-------|-------------------------------------------------------------|
| 1 | No references/ directory (0 files) |
| 2-5 | dag-execution.md (1 file) |
| 6 | + codex-escalation.md (2 files) |
| 7-8 | + hitl-protocol.md (3 files) |
| 9 | + browser-validation.md (4 files) |

Verify with: `git ls-tree <branch> .claude/skills/orchestrator/references/ | wc -l`

### C4. Cumulative Flag Parsing

Grep SKILL.md on each stage for flag presence:

| Stages | Flags present in SKILL.md |
|--------|--------------------------|
| 1-3 | No flags |
| 4-5 | `--team` |
| 6 | + `--no-codex` |
| 7 | + `--resume` |
| 8 | + `--sequential` |
| 9 | + `--no-browser` |

Verify with: `git show <branch>:.claude/skills/orchestrator/SKILL.md | grep -- '--flag-name'`

Each new flag is additive -- a stage must have ALL flags from previous
stages plus its own.

### C5. Clean Diffs Between Consecutive Stages

For each pair of consecutive branches:

```bash
git diff orchestration/1-dispatch..orchestration/2-dag --stat
git diff orchestration/2-dag..orchestration/3-full --stat
git diff orchestration/3-full..orchestration/4-hop --stat
git diff orchestration/4-hop..orchestration/5-plugin --stat
git diff orchestration/5-plugin..orchestration/6-codex --stat
git diff orchestration/6-codex..orchestration/7-hitl --stat
git diff orchestration/7-hitl..orchestration/8-parallel --stat
git diff orchestration/8-parallel..orchestration/9-browser --stat
```

Each diff should show:
- Additions and modifications (expected)
- NO wholesale SKILL.md rewrites (100% changed lines = suspicious)
- NO deletions of inherited files (chain should be additive)

### C6. Original `stage/*` Branches Untouched

The original `stage/*` branches must not have any lobby restructure
commits. Verify the most recent commit on each:

```bash
git log stage/1-dispatch --oneline -1
git log stage/2-dag --oneline -1
git log stage/3-full --oneline -1
```

None should contain lobby-related commit messages.

### C7. Teams Directory (Stage 4+)

| Stages | Expected in `.claude/skills/orchestrator/teams/` |
|--------|--------------------------------------------------|
| 1-3 | No teams/ directory |
| 4-9 | engineering.md, research.md (2 files) |

Verify with: `git ls-tree <branch> .claude/skills/orchestrator/teams/ | wc -l`

### C8. Lobby Command Branch Name

On each branch, `.claude/commands/lobby.md` must reference the correct
branch name (either literally or via a `git branch --show-current`
instruction for the agent).

Verify by reading lobby.md on each branch and confirming the branch
name matches.

### C9. Branch Immutability

Completed module branches must have no post-creation commits. After the
initial verification pass, no further commits should be added.

For each completed branch, check the commit history:

```bash
git log <branch> --oneline -5
```

The most recent commits should be the initial stage build. No
lobby-related or patch commits should appear after the creation date.

**Exception:** The current build phase may have active branches not yet
frozen. Only check immutability for branches marked "Complete -- pushed,
immutable" in the master plan status table.

### C10. Source Anchor Format Compliance

Source anchors in `.claude/references/patterns/pattern-*.md` must use
the canonical format:

```
<branch>:<file-path>:L<start>-L<end> -- <description>
```

Verify:
- All anchors use `orchestration/*` branch names (not `stage/*`)
- Line ranges use `L<start>-L<end>` format
- Each anchor has a `--` separator followed by a description
- No empty `## Source Anchors` sections for completed stages

---

## D. Protection + Infrastructure

### D1. Branch Protection

GitHub branch protection rules must cover `orchestration/*`:

```bash
gh api repos/<owner>/<repo>/rulesets
```

Verify the response includes a ruleset matching `orchestration/*` with
no direct pushes and no force pushes allowed.

### D2. /learn Command

| Check | How to verify |
|-------|--------------|
| Lists all N stages | Count stage rows in learn.md |
| Correct branch names | Each row references `orchestration/N-name` |
| Diff links use correct consecutive pairs | Stage N diff compares `orchestration/(N-1)..orchestration/N` |
| YAML envelope has `stages: N` | Parse the envelope at the bottom |

### D3. README Module Table

| Check | How to verify |
|-------|--------------|
| N rows in module table | Count table rows |
| Correct branch names | Each row links to `orchestration/N-name` |
| GitHub compare URLs use correct pairs | Stage N compare URL is `orchestration/(N-1)...orchestration/N` |

---

## E. Lobby Hygiene

### E1. Configuration Hygiene

| Check | How to verify |
|-------|--------------|
| `tsconfig.json` has comment about `src/` | Read tsconfig.json, look for comment explaining src/ is for module branches |
| `lobby.md` no `$CURRENT_BRANCH` literal | Read lobby.md, verify it does NOT contain the literal string `$CURRENT_BRANCH` |
| `specs/lobby-restructure.md` moved to `docs/plans/` | Verify file does NOT exist at `specs/lobby-restructure.md`; verify it exists at `docs/plans/lobby-restructure.md` (or similar) |

### E2. Agent-Native Improvements

| Check | How to verify |
|-------|--------------|
| CLAUDE.md has "Source Anchor Resolution" section | Read CLAUDE.md, look for section heading with `git show` + `sed` example |
| `/learn` has `git diff` commands | Read learn.md, verify CLI diff commands alongside relative URLs |
| Dojo description mentions all N patterns | Read dojo SKILL.md frontmatter `description` field |

### E3. Master Plan Hygiene

| Check | How to verify |
|-------|--------------|
| "Stages 4-7" section uses past tense | Read section, look for present/future tense like "are being rebuilt" -- should be past tense |
| `docs/patterns/` listing includes all N files | Read Directory Structure section, count listed files |
| Branch tree has actual line counts (not "planned") | Read tree diagram, verify no "(planned)" labels for completed stages |
| Status table shows completed stages correctly | Read status table, verify all built stages say "Complete -- pushed, immutable" |

### E4. CI Verification

| Check | How to verify |
|-------|--------------|
| `.github/workflows/pr-quality.yml` works on main | Read the workflow file; verify it doesn't reference `src/` or `tests/` that don't exist on main, OR handles their absence gracefully |

---

## Quick Reference: Expected Counts by Stage

| Stage | docs/patterns | agents | references | teams | flags | prompts dir |
|-------|--------------|--------|------------|-------|-------|-------------|
| 1 | 3 | 2 | 0 | 0 | 0 | stage-1 (2+) |
| 2 | 6 | 2 | 1 | 0 | 0 | stage-2 (2+) |
| 3 | 9 | 2 | 1 | 0 | 0 | stage-3 (3+) |
| 4 | 9 | 4 | 1 | 2 | 1 (--team) | stage-4 (2+) |
| 5 | 11 | 4 | 1 | 2 | 1 | stage-5 (1+) |
| 6 | 13 | 4 | 2 | 2 | 2 (+--no-codex) | stage-6 (2+) |
| 7 | 15 | 4 | 3 | 2 | 3 (+--resume) | stage-7 (2+) |
| 8 | 17 | 4 | 3 | 2 | 4 (+--sequential) | stage-8 (3+) |
| 9 | 19 | 4 | 4 | 2 | 5 (+--no-browser) | stage-9 (3+) |

---

## Reporting Format

For single-branch validation:

```
## Validation Report

**Target:** orchestration/N-name
**Mode:** single-branch

### Section B: Per-Branch Checks
- [PASS] B1: Execution infrastructure -- all 13 paths present
- [PASS] B2: CLAUDE.md -- all 4 elements found
- [PASS] B3: README navigation footer -- Previous/Next/All present
- [PASS] B4: Main-only artifacts absent -- 4/4 confirmed absent
- [PASS] B5: Test prompts -- prompts/stage-N/ has M files (expected >= X)
- [PASS] B6: docs/patterns count -- expected >= N, found M
- [PASS] B7: specs/examples -- expected files present
- [PASS] B8: docs/agents.md -- agent entries match stage

### Section C: Chain Position
- [PASS] C1: SKILL.md lines -- N (within range)
- [PASS] C2: Agents -- N files
- [PASS] C3: References -- N files
- [PASS] C4: Flags -- all N expected flags found
- [PASS] C5: Clean diff from previous stage
- [PASS] C7: Teams -- N files
- [PASS] C8: Lobby command -- correct branch name
- [PASS] C9: Immutability -- no post-creation commits
- [PASS] C10: Source anchors -- correct format

### Issues
None

VERDICT: PASS
```

For full-chain audit, include all sections A through E with a summary
table at the end:

```
| Branch | B1 | B2 | B3 | B4 | B5 | B6 | B7 | B8 | Status |
|--------|----|----|----|----|----|----|----|----| -------|
| orchestration/1-dispatch | PASS | PASS | PASS | PASS | PASS | PASS | N/A | PASS | PASS |
| orchestration/2-dag | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
...
```
