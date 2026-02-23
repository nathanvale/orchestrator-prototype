---
title: "feat: /create-module HOP and Skills Learning Module"
type: feat
status: active
date: 2026-02-24
deepened: 2026-02-24
origin: docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md
---

# /create-module HOP and Skills Learning Module

## Enhancement Summary

**Deepened on:** 2026-02-24
**Research agents used:** create-agent-skills, agent-native-architecture, architecture-strategist, pattern-recognition-specialist, code-simplicity-reviewer, spec-flow-analyzer

### Key Improvements

1. Vendor source material into repo before build (eliminates volatile plugin cache dependency)
2. Add `disable-model-invocation: true` and `argument-hint` to `/create-module` frontmatter
3. Atomic Wave 2 on feature branch (prevents partial lobby state on main)
4. Resolve `src/` contradiction -- skills branches need minimal verification targets
5. Add inter-wave validation checkpoints
6. Module-scoped dojo alias prefix for cross-module collision resolution

### Open Decisions

| Decision | Options | Notes |
|----------|---------|-------|
| Pattern count | 19 (symmetry + fine-grained lookup) vs 10-12 (consolidate padding) | **Decide during implementation** -- see "Pattern Count" insight below |

### Confirmed Decisions (from deepening review)

| Decision | Outcome |
|----------|---------|
| Vendor source material | Yes -- Phase -1 copies to `docs/sources/skills-guide/` |
| `src/` vs `examples/` | Use `examples/` directory (skills branches don't have `src/`) |
| Wave 2 atomicity | Feature branch, merge as single commit |
| `/create-module` invocation | `disable-model-invocation: true` + `argument-hint` |
| Skill directory structure | `workflows/` (procedures) + `references/` (templates) |
| Dojo collision handling | Module-scoped alias prefix (`skills:slug`), keep simple |
| Portfolio-model validation | Skill inventory table in manifest replaces C1 line-count check |
| Advisor signals | 8 new signals for skills patterns |
| `/lobby` awareness | Detect module from branch prefix |
| Source anchor timing | Write at branch creation time (not batch backfill) |
| `/build-skill` scaffolder | Deferred (YAGNI -- the module teaches this) |
| `build-context.md` | Cut (speculative optimization) |
| Validator architecture | Common base + module manifests (Nathan's decision) |

---

## Overview

Build a `/create-module` HOP that generates learning modules for the orchestrator-prototype lobby, then use it to create the Skills module as its first customer. The Skills module teaches Claude Code skill authoring across 9 stages using content from an existing curated skills guide.

This is a two-part deliverable:
1. **The machine** -- `/create-module` HOP that can generate ANY learning module
2. **The first product** -- Skills module (19 patterns, 9 stages, 9 branches)

## Problem Statement / Motivation

The orchestrator-prototype has a proven lobby + module chain architecture with one module (Orchestration, 19 patterns across 9 stages). Building additional modules manually is slow, error-prone, and inconsistent. The architecture is parameterizable -- every module follows the same shape (stages, patterns, branches, docs, refs, dojo rows, advisor signals, test prompts, examples). A HOP can automate the entire build.

The Skills module is the ideal first customer because:
- A curated skills guide already exists with 7 reference files covering all the source material
- It creates symmetry (19 orchestration patterns + 19 skills patterns = 38 total)
- It proves the lobby architecture scales to multiple modules
- The content maps cleanly to 9 stages (see brainstorm: `docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md`)

## Proposed Solution

### Part A: `/create-module` HOP

A skill at `.claude/skills/create-module/` that takes a module definition and orchestrates the full build through steps:

- **Step 1 (parallel)**: Generate pattern docs + 11-slot pattern references
- **Step 2 (sequential, atomic)**: Lobby integration on feature branch (dojo tables, advisor scoring, learn.md, master-plan.md, CLAUDE.md) -- merged as single commit
- **Step 3 (sequential loop)**: Branch creation + source anchor update per stage
- **Step 4**: Verification smoke tests

### Research Insights: `/create-module` Design

**Best Practices (from create-agent-skills skill):**
- Add `disable-model-invocation: true` -- this skill has side effects (creates branches, writes files). Must not auto-trigger.
- Add `argument-hint: "[module-slug e.g. skills]"` for autocomplete
- Put essential principles inline in SKILL.md (11-slot contract, source anchor format, "docs/patterns/ is SoT" rule) -- these must always be loaded, not in references
- Keep SKILL.md under 500 lines by pushing step procedures into reference files
- Consider `workflows/` directory alongside `references/` to separate procedures from knowledge

**Recommended frontmatter:**
```yaml
---
name: create-module
description: >-
  Generate a complete HOP learning module with pattern docs, 11-slot
  references, lobby integration, proof skills, and staged branches.
  Use when building a new module for the orchestrator-prototype learning
  system. Creates docs/patterns/, .claude/references/patterns/, dojo
  table entries, advisor scoring, and per-stage module branches.
disable-model-invocation: true
argument-hint: "[module-slug e.g. skills]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---
```

**Recommended directory structure:**
```
create-module/
  SKILL.md                    # Router + essential principles (~200 lines)
  workflows/
    step-1-patterns.md        # Pattern doc + ref generation
    step-2-lobby.md           # Dojo tables, advisor, learn.md (atomic commit)
    step-3-branches.md        # Per-stage branch creation + anchor update
    step-4-verification.md    # Smoke tests
  references/
    module-template.md        # Module directory structure template
    pattern-template.md       # 11-slot pattern reference template
```

**Agent-native considerations (from agent-native-architecture skill):**
- Add a module existence check at the start (`$MODULE_NAME` must not conflict with existing modules)
- The builder needs a machine-readable schema for the 11-slot contract to self-validate
- Each step boundary should be an explicit checkpoint with validation criteria

### Part B: Skills Module (First Customer)

19 patterns across 9 stages, content sourced from the vendored skills guide at `docs/sources/skills-guide/`.

### Research Insights: Source Material Stability

**CRITICAL (all agents flagged this):** The skills guide currently lives at `~/.claude/plugins/cache/side-quest/claude-code/1.0.0/skills/skills-guide/` -- a plugin cache path that is volatile. Plugin caches are cleared on updates, and the path contains a version number that changes.

**Resolution:** Add a Phase -1 step: copy the 7 source files into the repo at `docs/sources/skills-guide/` and commit. This makes the build reproducible, eliminates the cache dependency, preserves the exact version of source material used, and enables `git diff` to show what content was transformed.

```bash
# Phase -1: Vendor source material
mkdir -p docs/sources/skills-guide/references
cp ~/.claude/plugins/cache/side-quest/claude-code/1.0.0/skills/skills-guide/SKILL.md docs/sources/skills-guide/
cp ~/.claude/plugins/cache/side-quest/claude-code/1.0.0/skills/skills-guide/references/*.md docs/sources/skills-guide/references/
git add docs/sources/skills-guide/ && git commit -m "chore: vendor skills guide source material for module generation"
```

### Part C: Layered Validator

Refactor the module-branch-validator into a common base checklist + per-module manifests, so the validator works for any module type without copy-pasting.

### Research Insights: Validator Design

**Architecture review says:** Use YAML frontmatter convention for manifests (not raw YAML-in-markdown). This aligns with how pattern-*.md files work:

```markdown
---
module: orchestration
branch_prefix: orchestration/
stages: 9
total_patterns: 19
stage_counts:
  1: { patterns: 3, agents: 2, references: 0, teams: 0, flags: 0 }
---

## Orchestration Module Manifest

Execution infrastructure, stage-specific counts, and validation rules.
```

**Simplicity reviewer challenges this entire approach:** "You have 1 module today. Adding a 2nd. The manifest system is premature abstraction -- you're building a plugin system for a validator that has 2 customers." They recommend adding a Skills section to the existing `checklist.md` instead.

**Nathan's decision holds:** Common base + manifests was explicitly chosen. But take the simplicity insight seriously -- keep the manifest format minimal. Don't over-specify with `required_on: all` conditionals. A markdown table in the manifest body is sufficient; the validator reads markdown naturally.

**Delete legacy `checklist.md`** on the same commit that introduces `common-checklist.md`. Do not maintain two sources of truth during a transition period.

## Technical Considerations

### Source Material Mapping

The skills guide has 7 reference files that map to the 9 stages:

| Guide File | Content Covers | Maps to Stages |
|-----------|---------------|----------------|
| `fundamentals.md` | Skill anatomy, SKILL.md format, frontmatter, progressive disclosure | 1 (anatomy), 2 (references) |
| `authoring.md` | Creation process, degrees of freedom, writing guidelines | 1 (description formula), 4 (argument parsing) |
| `patterns.md` | 5 workflow patterns + file org patterns + advanced features | 4-8 (sequential, iterative, multi-MCP, routing, domain) |
| `distribution.md` | 4 channels, plugin packaging, enterprise, API | 9 (distribution) |
| `testing.md` | 3 test areas, smoke test, iteration signals | 7 (testing/debug) |
| `troubleshooting.md` | 11 symptom/cause/fix scenarios | 7 (testing/debug) |
| `mcp-builders.md` | MCP + Skills complementary layers | 6 (multi-MCP coordination) |

The `/create-module` HOP transforms this source material into pattern docs and pattern references. It does NOT author from scratch -- it formats and distributes existing content.

### Research Insights: Pattern Count

**Simplicity reviewer flags:** Several of the 19 patterns are configuration fields promoted to pattern status, not genuine architectural concepts:

- `skills-frontmatter-formula` (stage 1) and `skills-description-formula` (stage 1) -- "three patterns for 'here's what a SKILL.md looks like.' That is one concept split into three to hit a count."
- `skills-hooks` (stage 3) -- "hooks is a single frontmatter field"
- `skills-model-selection` (stage 6) -- "the model field in frontmatter. One field."
- `skills-argument-parsing` (stage 4) -- "string substitution. One feature."

**Their recommendation:** Consolidate to 9-12 patterns. One per stage minimum. Collapse the stage-1 trio into "Skills Anatomy." Drop standalone fields.

**Counter-argument:** The orchestration module also has lightweight patterns (e.g., `fast-path-gate` is a single conditional). The 19-count creates consistency in the dojo's pattern library and each pattern gets its own 11-slot reference file that serves as a focused lookup target. A learner asking "what goes in the description?" gets a direct hit on `skills-description-formula` rather than finding it buried in a 100-line "Skills Anatomy" ref.

**Decision needed before implementation:** Keep 19 for consistency and fine-grained lookup, or consolidate to ~12 for quality? This affects file count, dojo table size, and implementation effort.

### Validator Architecture: Common Base + Module Manifest

The current `checklist.md` (490 lines) splits into:

**Common checklist** (works for any module):
- A1: Main-only artifacts PRESENT (learn.md, lobby.md, dojo, advisor, pattern refs, pattern docs)
- A2: Execution artifacts ABSENT from main
- A3: Dojo + advisor coverage (count-based, parameterized)
- A4: Source anchors populated and formatted
- A5: Pattern contract (11-slot headings)
- B2: CLAUDE.md has 4 required elements
- B3: README navigation footer
- B4: Main-only artifacts ABSENT from module branches
- B5: Test prompts directory (parameterized path: `prompts/$MODULE-N/`)
- B6: `docs/patterns/` cumulative count (reads from manifest)
- C5: Clean diffs between consecutive stages
- C8: Lobby command branch name
- C9: Branch immutability
- C10: Source anchor format compliance
- D1-D3: Branch protection, /learn, README table
- E1-E4: Lobby hygiene

**Module manifest** (per-module, generated by `/create-module`):

Uses frontmatter convention (consistent with pattern refs):

```markdown
---
module: orchestration
branch_prefix: orchestration/
stages: 9
total_patterns: 19
---

## Execution Infrastructure

| Path | Required On |
|------|-------------|
| .claude/skills/orchestrator/SKILL.md | All stages |
| .claude/commands/orchestrate.md | All stages |
| .claude/agents/builder.md | All stages |
| .claude/agents/validator.md | All stages |
| scripts/emit-event.ts | All stages |
| src/ | All stages |
| tests/ | All stages |

## Stage Counts

| Stage | patterns | agents | references | teams | flags |
|-------|----------|--------|------------|-------|-------|
| 1 | 3 | 2 | 0 | 0 | 0 |
| 2 | 6 | 2 | 1 | 0 | 0 |
...
```

### Research Insights: Portfolio Model Validation

**Architecture and spec-flow reviewers both flag:** The validator's C1 check (SKILL.md line count monotonicity) does not apply to the Skills portfolio model. There is no single growing SKILL.md -- there are N skill files growing to N+1 directories.

**Resolution:** The skills manifest should define a `skill_inventory` field:

```markdown
## Skill Inventory (Portfolio Model)

| Stage | Proof Skills Present |
|-------|---------------------|
| 1 | greet |
| 2 | greet, code-review |
| 3 | greet, code-review (+ hook) |
| 4 | greet, code-review, pr-review |
| 5 | greet, code-review, pr-review, write-doc |
...
```

The common checklist should have a generic "module artifact count is monotonically non-decreasing" check that reads the appropriate table from the manifest (line counts for orchestration, skill directories for skills).

### Dojo Scaling: Module-Grouped Tables

The dojo keyword and alias tables get module sub-sections:

```markdown
### Orchestration Patterns (19)
| Keywords | Pattern | File |
|----------|---------|------|
| dispatch, loop... | Dispatch Loop | pattern-dispatch-loop.md |
...

### Skills Patterns (19)
| Keywords | Pattern | File |
|----------|---------|------|
| anatomy, structure... | Skills Anatomy | pattern-skills-anatomy.md |
...
```

Same flat routing logic (first match wins), just visually organized. The zero-state display also groups by module.

### Research Insights: Dojo Collision Resolution

**Multiple agents flag keyword collision risk.** With 38 patterns, terms like "iterate", "refine", "context", "parallel" could match both modules. "explain iterative refinement" -- orchestration or skills?

**Resolution options:**
1. **Module-scoped alias prefix** (recommended): If input contains `skills:routing` or `orchestration:routing`, route to that module. Bare terms use first-match cascade. Backward-compatible.
2. **Multi-match disambiguation**: The existing error contract (dojo SKILL.md line 158) says "Multiple patterns detected: list. Which one?" -- extend this to show module affiliation alongside slugs.
3. **Both**: Add module prefix support AND show module names in disambiguation.

**Zero-state scaling:** Current zero-state is 12 lines for 19 patterns. With 38, relax to ~20 lines with module headers, each showing a compact 3-column grid. Or summarize to "19 orchestration + 19 skills" with an "expand" prompt.

**Future concern (v2):** At 3+ modules (57+ patterns), extract keyword/alias tables to a reference file (`references/pattern-index.md`). SKILL.md stays lean (routing logic + mode detection), index scales independently.

### Branch Structure for Skills Module

Unlike orchestration (one SKILL.md growing across stages), the Skills module uses a **portfolio model** -- each stage builds a distinct proof skill:

| Stage | Branch | Proof Skill | Lines (approx) |
|-------|--------|------------|----------------|
| 1 | `skills/1-anatomy` | `/greet` | ~30 |
| 2 | `skills/2-references` | `/code-review` | ~80 |
| 3 | `skills/3-hooks` | `/code-review` + Stop hook | ~100 |
| 4 | `skills/4-sequential` | `/pr-review` (3-phase) | ~150 |
| 5 | `skills/5-iterative` | `/write-doc` (self-review loop) | ~180 |
| 6 | `skills/6-multi-mcp` | `/research-and-write` | ~200 |
| 7 | `skills/7-routing` | `/file-ops` (context routing) | ~220 |
| 8 | `skills/8-domain` | `/license-check` | ~180 |
| 9 | `skills/9-distribution` | `/skill-suite` (meta-skill) | ~250 |

Each branch contains:
- `.claude/skills/<proof-skill>/SKILL.md` -- the proof skill for that stage
- All previous stages' proof skills (cumulative)
- `prompts/skills-N/` -- test prompts for the stage
- `specs/examples/skills-N-*.md` -- example output
- `.claude/commands/lobby.md` -- signpost back to main
- `.claude/CLAUDE.md` -- stage-specific identity
- `examples/` -- minimal verification target files (see below)

Each branch does NOT contain:
- `.claude/agents/` -- skills module doesn't need builder/validator agents
- `.claude/skills/orchestrator/` -- that's orchestration's domain
- `.claude/commands/orchestrate.md` -- not applicable
- `scripts/emit-event.ts` -- no orchestration infra

### Research Insights: `src/` Contradiction (CRITICAL)

**Spec-flow analyzer caught this:** The plan says "Each branch does NOT contain: `src/`, `tests/`" (line 168) but verification commands reference `src/example.ts` and `src/` (lines 178-187). This is a direct contradiction.

**Resolution:** Skills branches need minimal verification target files, but they should NOT use `src/` and `tests/` (those are orchestration's domain). Instead, use an `examples/` directory:

| Stage | Verification | Target Files |
|-------|-------------|-------------|
| 1 | `/greet "Nathan"` | (no files needed -- returns greeting) |
| 2 | `/code-review examples/sample.ts` | `examples/sample.ts` (~20 lines) |
| 3 | `/code-review examples/sample.ts` (check envelope) | Same |
| 4 | `/pr-review examples/` | `examples/` directory |
| 5 | `/write-doc "API reference for examples/utils.ts"` | `examples/utils.ts` |
| 6 | `/research-and-write "best practices for error handling"` | (no files needed -- uses web search) |
| 7 | `/file-ops "organize the examples/ directory"` | `examples/` with mixed files |
| 8 | `/license-check examples/` | `examples/` with files lacking license headers |
| 9 | `/skill-suite examples/` | Same as above (meta-skill composes prior skills) |

### Research Insights: Proof Skill Design

**From create-agent-skills skill:**
- Every proof skill needs proper frontmatter with real descriptions (not just a name)
- Stage 3's Stop hook should use `type: prompt` (inline), not external scripts
- Stage 5's iterative loop should cap at 2 iterations for ~180 lines
- Stage 9's meta-skill should demonstrate `context: fork` and `agent` fields
- Add a "Success Criteria" section to every proof skill
- Consider renaming `/file-ops` to something more descriptive (e.g., `/route-file-ops`)
- Escape `` !`command` `` syntax in any skill-teaching examples (add space before backtick to prevent execution during skill load)

### Pattern Library (19 Patterns)

| # | Slug | Stage | Source File |
|---|------|-------|-------------|
| 1 | `skills-anatomy` | 1 | fundamentals.md (Skill Anatomy section) |
| 2 | `skills-frontmatter-formula` | 1 | fundamentals.md (Frontmatter Reference section) |
| 3 | `skills-description-formula` | 1 | authoring.md (Description Rules section) |
| 4 | `skills-reference-overflow` | 2 | fundamentals.md (Progressive Disclosure section) |
| 5 | `skills-allowed-tools` | 2 | fundamentals.md (Security Restrictions + Invocation Control) |
| 6 | `skills-hooks` | 3 | fundamentals.md (hooks frontmatter field) |
| 7 | `skills-envelope-contract` | 3 | (derived from orchestration envelope pattern) |
| 8 | `skills-sequential-workflow` | 4 | patterns.md (Pattern 1: Sequential Workflow) |
| 9 | `skills-argument-parsing` | 4 | fundamentals.md (String Substitutions) |
| 10 | `skills-iterative-refinement` | 5 | patterns.md (Pattern 3: Iterative Refinement) |
| 11 | `skills-context-management` | 5 | patterns.md (Subagent Execution section) |
| 12 | `skills-multi-mcp-coordination` | 6 | patterns.md (Pattern 2: Multi-MCP Coordination) |
| 13 | `skills-model-selection` | 6 | fundamentals.md (model field) + mcp-builders.md |
| 14 | `skills-context-aware-routing` | 7 | patterns.md (Pattern 4: Context-Aware Tool Selection) |
| 15 | `skills-testing-and-debug` | 7 | testing.md + troubleshooting.md (full content) |
| 16 | `skills-domain-intelligence` | 8 | patterns.md (Pattern 5: Domain-Specific Intelligence) |
| 17 | `skills-agent-delegation` | 8 | patterns.md (Subagent Execution + Code Execution) |
| 18 | `skills-distribution` | 9 | distribution.md (full content) |
| 19 | `skills-composition` | 9 | patterns.md (anti-patterns) + authoring.md (skill types) |

### Research Insights: Pattern Naming

**Pattern recognition specialist notes:** The `skills-` prefix on all slugs is the correct namespacing convention. It prevents collision with orchestration slugs and establishes the pattern for future modules (`prompt-eng-*`, `research-*`). This is confirmed by the plan's own CLAUDE.md rules and the existing orchestration slugs (which are unnamespaced because they were first -- but future modules should always prefix).

## System-Wide Impact

### Interaction Graph

- `/create-module` generates pattern docs (Step 1) by reading vendored source material
- Step 2 modifies dojo SKILL.md, advisor SKILL.md, learn.md, master-plan.md, CLAUDE.md -- all on a feature branch, merged atomically
- Step 3 creates git branches, each from the previous. Source anchors updated on main immediately after each branch.
- Module-branch-validator (with manifest) validates each branch after creation
- After all branches: run verification smoke tests

### Research Insights: Atomic Wave 2

**Architecture reviewer:** Wave 2 modifies 5+ files on main. If it fails partway, main is inconsistent (e.g., dojo updated but advisor not).

**Resolution:** Wave 2 should operate on a feature branch (e.g., `feat/skills-lobby-integration`) and merge to main as a single commit only after all 5 files are verified. This prevents partial lobby states. The merge commit message:

```
feat(lobby): integrate Skills module (19 patterns, 9 stages)
```

### Error Propagation

- Step 1 failure: orphaned pattern docs with no lobby integration. Safe to retry.
- Step 2 failure: feature branch is abandoned, main untouched. Start fresh.
- Step 3 failure: broken chain. Check branch existence before creating (idempotent). Can resume from last successful stage.
- Anchor update failure: pattern refs have "Planned" anchors. Non-blocking -- can be fixed manually.

### Research Insights: Recovery Flow

**Spec-flow analyzer flags:** `--start-from-stage N` needs clearer semantics:
1. Check branch existence for stages 1 through N-1 (necessary but not sufficient)
2. Run a quick smoke check on stage N-1 (invoke proof skill)
3. Only then proceed to create stage N

**Branch rebuild workflow:** If `skills/4-sequential` has issues and branch protection prevents deletion:
1. Author manually disables branch protection via GitHub settings
2. Delete the branch: `git push origin --delete skills/4-sequential`
3. Re-run `/create-module` with `--start-from-stage 4`
4. Re-enable branch protection

This should be documented in the `/create-module` reference docs.

### State Lifecycle Risks

- Branch creation is the riskiest operation. Branches are immutable after creation -- if a branch has issues, it must be deleted and recreated (with user confirmation).
- Pattern docs on main can be updated independently of branches.
- Lobby integration operates on a feature branch -- revertable via `git branch -D`.

### API Surface Parity

- `/learn` must list both Orchestration and Skills modules
- `/dojo explain <any-skills-pattern>` must work after lobby integration
- `/advisor "I want to build a skill"` must recommend skills patterns

### Research Insights: `/build-skill` Deferral

**Simplicity reviewer:** "Shipping a scaffolder alongside a 'learn to build skills' module is like shipping a calculator with a math textbook." The `/build-skill` scaffolder is a nice-to-have convenience tool, not a core educational artifact. It doesn't appear in any verification step.

**Recommendation:** Defer `/build-skill` to a follow-up PR. The Skills module functions without it. If someone finishes the module and wants a scaffolder, that is literally what the module teaches them to build.

**Impact:** Removes 4 files from Phase 1 and eliminates Wave 3 entirely.

### Research Insights: Advisor Signal Vocabulary

**Spec-flow analyzer flags:** The advisor's characteristic extraction table has 18 orchestration-focused signals. Without new signals, the advisor scores 0 for "I want to build a skill." New signals needed:

| Signal | Triggers On |
|--------|------------|
| `skill-authoring` | "build a skill", "create a skill", "SKILL.md" |
| `frontmatter-config` | "frontmatter", "description field", "hooks field" |
| `progressive-disclosure` | "reference files", "context budget", "500 lines" |
| `skill-testing` | "test a skill", "smoke test", "undertriggering" |
| `skill-distribution` | "share a skill", "plugin", "enterprise", "publish" |
| `mcp-enhancement` | "MCP skill", "tool access", "workflow on top of MCP" |
| `skill-patterns` | "sequential workflow", "iterative refinement" (in skill context) |
| `skill-composition` | "meta-skill", "compose skills", "context: fork" |

Define these during Step 2 (lobby integration) alongside the scoring table additions.

### Research Insights: `/lobby` Module Awareness

**Spec-flow analyzer:** The `/lobby` command says "You are on a module branch" without specifying which module. With two modules, this is ambiguous.

**Resolution:** Update `/lobby` to detect module from branch name prefix (e.g., `skills/*` -> "Skills module, Stage N"). This is a minor update during Step 2.

### Research Insights: Cross-Branch Dojo Limitation

A learner on `orchestration/5-plugin` cannot ask the dojo about skills patterns because that branch predates the skills module. This is an accepted limitation. The `/lobby` command already tells users to return to main for dojo/advisor. No action needed.

## Acceptance Criteria

### Phase -1: Vendor Source Material

- [ ] Skills guide copied to `docs/sources/skills-guide/` and committed

### Phase 0: `/create-module` HOP

- [ ] `.claude/skills/create-module/SKILL.md` exists with step-based protocol
- [ ] `disable-model-invocation: true` and `argument-hint` in frontmatter
- [ ] Essential principles inline (11-slot contract, source anchor format, SoT rule)
- [ ] `workflows/` directory with per-step procedure files
- [ ] `references/` directory with module-template.md and pattern-template.md
- [ ] `.claude/commands/create-module.md` command shim exists
- [ ] HOP accepts `MODULE_NAME`, `STAGE_DEFINITIONS`, `PATTERN_DEFINITIONS`, `SOURCE_MATERIAL` parameters
- [ ] HOP checks module name doesn't conflict with existing modules
- [ ] HOP checks branch existence before creating (idempotent re-runs)
- [ ] Validation checkpoint between each step

### Phase 0.5: Validator Refactor

- [ ] `common-checklist.md` extracted from `checklist.md` (generic checks only)
- [ ] `manifests/orchestration.md` contains orchestration-specific checks (frontmatter convention)
- [ ] Old `checklist.md` deleted (not kept as legacy)
- [ ] Validator SKILL.md reads manifest for `$MODULE` at runtime
- [ ] Common checklist has generic "artifact count monotonically non-decreasing" check
- [ ] Existing orchestration validation still passes (regression check)

### Phase 1: Skills Module (via `/create-module`)

- [ ] 19 pattern docs created at `docs/patterns/skills-*.md`
- [ ] 19 pattern refs created at `.claude/references/patterns/pattern-skills-*.md` with 11-slot frontmatter
- [ ] Dojo SKILL.md has module-grouped keyword/alias tables with skills entries
- [ ] Dojo alias tables support module-scoped prefix (`skills:anatomy`)
- [ ] Advisor SKILL.md has ~8 new characteristic signals + scoring for skills patterns
- [ ] `/learn` lists Skills module with 9 stages
- [ ] `/lobby` updated to detect module from branch prefix
- [ ] `specs/master-plan.md` has Skills module section
- [ ] `.claude/CLAUDE.md` updated with Skills module in project structure
- [ ] `manifests/skills.md` generated with portfolio-model skill inventory
- [ ] 9 branches created (`skills/1-anatomy` through `skills/9-distribution`)
- [ ] Each branch has proof skill(s), `examples/` directory, test prompts, example outputs
- [ ] Source anchors populated with accurate line numbers (written at branch creation)
- [ ] Cumulative `git diff` chain verified
- [ ] All proof skills have proper frontmatter with descriptions and success criteria

### Phase 2: Verification

- [ ] `/dojo "explain skill anatomy"` works (sensei mode)
- [ ] `/dojo "lookup frontmatter fields"` works (reference mode)
- [ ] `/dojo "skills:iterative-refinement"` routes to skills pattern (module prefix)
- [ ] `/advisor "I want to build a Claude Code skill"` recommends skills patterns
- [ ] `git checkout skills/1-anatomy && /greet "Nathan"` -- proof skill works
- [ ] `git checkout skills/4-sequential && /pr-review examples/` -- sequential workflow works
- [ ] `git checkout skills/9-distribution && /skill-suite examples/` -- composition works
- [ ] All pattern refs have valid source anchors (spot-check 5)
- [ ] `git diff skills/1-anatomy..skills/2-references` shows cumulative delta
- [ ] Module-branch-validator passes for all 9 skills branches

## Dependencies & Risks

### Dependencies

- Skills guide source material vendored at `docs/sources/skills-guide/` (Phase -1)
- Module branches require clean main as base for `skills/1-anatomy`
- Dojo/advisor must be on main (via atomic feature branch merge) before branches reference them

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dojo SKILL.md exceeds 500 lines with 38 patterns | Medium | Routing degradation | Module-grouped tables. Extract to reference file at v2 if 3+ modules. |
| Branch creation fails mid-chain | Medium | Broken chain | Branch existence checks. Resume from last successful stage. |
| Keyword collision between modules | Medium | Wrong pattern routed | Module-scoped alias prefix (`skills:slug`). Multi-match disambiguation. |
| Pattern docs from source material are too thin | Low | Low quality content | Source material is comprehensive (7 files, ~62K chars). Manual review pass. |
| Validator manifest format doesn't cover portfolio model | Medium | Validation gaps | Skill inventory table replaces C1 line-count monotonicity for portfolio modules. |
| Wave 2 partial failure corrupts main | Low | Inconsistent lobby | Atomic feature branch merge -- main is never touched until all 5 files verified. |

## Implementation Phases

### Phase -1: Vendor Source Material

```bash
mkdir -p docs/sources/skills-guide/references
cp ~/.claude/plugins/cache/side-quest/claude-code/1.0.0/skills/skills-guide/SKILL.md docs/sources/skills-guide/
cp ~/.claude/plugins/cache/side-quest/claude-code/1.0.0/skills/skills-guide/references/*.md docs/sources/skills-guide/references/
```

Commit: `chore: vendor skills guide source material for module generation`

### Phase 0: Build the Machine (`.claude/skills/create-module/`)

1. Create `SKILL.md` -- step-based protocol with essential principles inline (~200 lines)
2. Create `workflows/step-1-patterns.md` -- pattern doc + ref generation
3. Create `workflows/step-2-lobby.md` -- atomic lobby integration protocol
4. Create `workflows/step-3-branches.md` -- per-stage branch creation + anchor update
5. Create `workflows/step-4-verification.md` -- smoke tests
6. Create `references/module-template.md` -- canonical module shape
7. Create `references/pattern-template.md` -- 11-slot ref template (copy from existing)
8. Create `.claude/commands/create-module.md` -- command shim

### Phase 0.5: Refactor Validator

1. Extract generic checks into `common-checklist.md`
2. Create `manifests/orchestration.md` with orchestration-specific checks (frontmatter convention)
3. Delete old `checklist.md`
4. Update validator SKILL.md to read manifest for `$MODULE`
5. Verify orchestration validation still passes (regression)

### Phase 1: Run `/create-module` for Skills Module

```
/create-module skills --stages 9 --source docs/sources/skills-guide/
```

The HOP executes its protocol:
- Step 1: Create pattern docs + pattern refs from vendored source material
- Step 2: Lobby integration on feature branch (dojo, advisor + new signals, learn.md, lobby.md, master-plan.md, CLAUDE.md) -- merge atomically
- Step 3: Create 9 module branches sequentially, updating source anchors after each
- Step 4: Verification smoke tests

### Phase 2: Verify

- Run dojo/advisor/learn commands (including module-scoped prefix)
- Checkout each branch and run proof skill against `examples/`
- Run module-branch-validator in full-chain mode
- Verify cumulative diff chain
- Set up branch protection for `skills/*`

## Files to Create/Modify

### Phase -1: Vendor Source Material

| Action | Path |
|--------|------|
| Create | `docs/sources/skills-guide/SKILL.md` |
| Create (x7) | `docs/sources/skills-guide/references/*.md` |

### Phase 0: `/create-module` HOP

| Action | Path |
|--------|------|
| Create | `.claude/skills/create-module/SKILL.md` |
| Create | `.claude/skills/create-module/workflows/step-1-patterns.md` |
| Create | `.claude/skills/create-module/workflows/step-2-lobby.md` |
| Create | `.claude/skills/create-module/workflows/step-3-branches.md` |
| Create | `.claude/skills/create-module/workflows/step-4-verification.md` |
| Create | `.claude/skills/create-module/references/module-template.md` |
| Create | `.claude/skills/create-module/references/pattern-template.md` |
| Create | `.claude/commands/create-module.md` |

### Phase 0.5: Validator Refactor

| Action | Path |
|--------|------|
| Create | `.claude/skills/module-branch-validator/references/common-checklist.md` |
| Create | `.claude/skills/module-branch-validator/manifests/orchestration.md` |
| Delete | `.claude/skills/module-branch-validator/references/checklist.md` |
| Modify | `.claude/skills/module-branch-validator/SKILL.md` (manifest-aware) |

### Phase 1: Skills Module on Main (Lobby)

| Action | Path |
|--------|------|
| Create (x19) | `docs/patterns/skills-*.md` |
| Create (x19) | `.claude/references/patterns/pattern-skills-*.md` |
| Create | `.claude/skills/module-branch-validator/manifests/skills.md` |
| Modify | `.claude/skills/agentic-dojo/SKILL.md` (module-grouped tables + prefix routing) |
| Modify | `.claude/skills/pattern-advisor/SKILL.md` (new signals + 19 scoring entries) |
| Modify | `.claude/commands/learn.md` (add Skills module) |
| Modify | `.claude/commands/lobby.md` (module-aware branch detection) |
| Modify | `specs/master-plan.md` (add Skills module section) |
| Modify | `.claude/CLAUDE.md` (update project structure) |

### Per Module Branch (x9)

| Action | Path |
|--------|------|
| Create | `.claude/skills/<proof-skill>/SKILL.md` (with proper frontmatter) |
| Create | `.claude/skills/<proof-skill>/references/*.md` (where applicable) |
| Create | `examples/*.ts` (minimal verification targets) |
| Create | `prompts/skills-N/*.md` (2-3 test prompts per stage) |
| Create | `specs/examples/skills-N-*.md` (example output) |
| Create | `.claude/CLAUDE.md` (stage-specific identity) |
| Create | `.claude/commands/lobby.md` (signpost back to main) |

## Success Metrics

- `/create-module` can generate a module from vendored source material with zero manual pattern doc writing
- All 9 skills branches pass the module-branch-validator in full-chain mode
- The dojo teaches skills patterns with the same quality as orchestration patterns
- The advisor recommends skills patterns for skill-related queries (new signals score > 0)
- A learner can `git checkout skills/1-anatomy`, run `/greet "Nathan"`, and understand what skill anatomy means
- Dojo keyword collision is handled (module-scoped prefix works)

## Sources & References

### Origin

- **Brainstorm:** [docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md](docs/brainstorms/2026-02-23-lobby-branch-strategy-brainstorm.md) -- established lobby + module chain architecture, decided main = shell with no orchestrator
- **Brainstorm:** [docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md](docs/brainstorms/2026-02-21-agentic-dojo-skill-brainstorm.md) -- established dojo router architecture with mode/voice system

### Source Material

- Skills guide (to be vendored): `docs/sources/skills-guide/` (7 reference files, ~62K chars total)
- Skills guide SKILL.md: router-style knowledge bank with 8 intent categories

### Internal References

- Existing dojo: `.claude/skills/agentic-dojo/SKILL.md:72-164` (routing tables)
- Existing advisor: `.claude/skills/pattern-advisor/SKILL.md` (scoring signals)
- Module-branch-validator: `.claude/skills/module-branch-validator/references/checklist.md` (490 lines)
- Master plan: `specs/master-plan.md` (branch strategy at lines 398-495)
- 11-slot pattern contract: `.claude/CLAUDE.md:69-150`

### Prior Plan

- Original plan draft: `~/.claude/plans/zazzy-hopping-flurry.md` (detailed stage definitions and pattern library)

### Deepening Research

- **create-agent-skills skill**: Frontmatter best practices, `disable-model-invocation`, checkpoint pattern, proof skill design
- **agent-native-architecture skill**: Parity gaps, pattern schema validation, standardized envelopes, build context accumulation
- **architecture-strategist**: Atomic Wave 2, manifest frontmatter convention, source material vendoring, dojo collision
- **pattern-recognition-specialist**: Slug namespacing, portfolio model validation metrics, naming conventions
- **code-simplicity-reviewer**: Pattern count challenge (19 vs 12), /build-skill deferral, manifest premature abstraction
- **spec-flow-analyzer**: `src/` contradiction, recovery flow semantics, advisor signal vocabulary, lobby module awareness
