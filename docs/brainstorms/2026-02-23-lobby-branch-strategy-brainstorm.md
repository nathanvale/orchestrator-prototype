---
date: 2026-02-23
topic: lobby-branch-strategy
---

# Lobby Branch Strategy - Restructuring Main as an Educational Shell

## What We're Building

A restructured branch strategy where main becomes a "lobby" -- a shell that houses the learning tools (dojo, advisor, pattern library) but NOT the orchestrator. Each stage branch owns its own clean, runnable orchestrator SKILL.md sized for that stage only. The learner uses the dojo on main to learn patterns, then checks out a stage branch to see the pattern working in isolation.

The educational flow:

```
Main (lobby):
  /dojo explain wave-computation
    -> Miyagi teaches the concept
    -> Source anchors: "stage/2-dag:.claude/skills/orchestrator/SKILL.md:L265-L293"
    -> "See it working: git checkout stage/2-dag && /orchestrate"

Stage branch:
  git checkout stage/2-dag
  /orchestrate "add a REST API with GET /users, POST /users, and GET /users/:id"
    -> Proves wave computation works in isolation
```

## Why This Approach

### The Problem

The original design had each stage on its own branch with a clean, isolated orchestrator SKILL.md. This worked beautifully for stages 1-3:

| Branch | SKILL.md lines | Status |
|--------|---------------|--------|
| `stage/1-dispatch` | 152 | Clean, isolated |
| `stage/2-dag` | 407 | Clean, isolated |
| `stage/3-full` | 710 | Clean, isolated |

But stages 4-7 never got their own branches. They accumulated on a single branch (`chore/tune-product-direction`), producing a 1059-line SKILL.md that keeps growing. The cumulative merge strategy means main was heading toward the same bloat.

Three pain points:
1. **Claude gets unreliable** -- 1059 lines is past the 500-line official ceiling, causing step-skipping and forgotten instructions
2. **The educational story is muddled** -- no clean "checkout a stage, see one concept" experience for stages 4-7
3. **Maintenance friction** -- every new stage touches the same massive file

### Approaches Considered

**(a) Main = shell (lobby)** -- main has dojo, advisor, pattern docs, master plan. NO orchestrator. Stage branches own their orchestrators. CHOSEN.

**(b) Main = latest stage (original design)** -- main always has the most complete SKILL.md. This is what broke. Rejected.

**(c) Main = meta-orchestrator** -- thin SKILL.md that reads a `--stage` flag and redirects. Clever but unnecessary indirection. Rejected.

### Why Lobby Wins

- Each stage branch stays clean and runnable -- the learner can `git checkout stage/2-dag` and see exactly 407 lines of orchestrator logic
- Main never bloats -- it only has learning/reference tools
- The dojo on main is the single entry point for learning -- it teaches, then points you to the proof
- `/orchestrate` is the proof that a stage works -- it only exists on stage branches where it belongs
- New stages don't touch main's skill files at all (only pattern content gets added)

## Key Decisions

### 1. Main has NO orchestrator SKILL.md

The orchestrator command and skill only exist on stage branches. Main is the lobby -- it tells you where to go, teaches you the concepts, but doesn't run the orchestrator itself.

```
main (lobby):
  .claude/skills/agentic-dojo/          <- learning tool
  .claude/skills/pattern-advisor/       <- recommendation tool
  .claude/references/patterns/          <- pattern content
  specs/master-plan.md                  <- roadmap
  docs/                                 <- documentation
  NO .claude/skills/orchestrator/       <- not here
  NO .claude/commands/orchestrate.md    <- not here

stage/2-dag:
  .claude/skills/orchestrator/SKILL.md  <- 407 lines, runnable
  .claude/commands/orchestrate.md       <- /orchestrate works here
```

### 2. Pattern content lives on main, proof lives on stage branches

The dojo's pattern files (`.claude/references/patterns/`) live on main. They contain the complete, accumulated knowledge for each pattern. The proof code (the actual orchestrator implementation demonstrating the pattern) lives on the stage branch that introduced it.

Source anchors bridge the gap -- they point from pattern content on main to proof code on stage branches.

### 3. Source anchors are staged

Patterns evolve across stages. `higher-order-prompt.md` was introduced in stage 1 as a concept, then updated in stage 4 with the HOP proof. The source anchors tell this story:

```markdown
## Source Anchors

Stage 1 (concept introduction):
- `stage/1-dispatch:.claude/skills/orchestrator/SKILL.md:L12-L25` -- HOP variables declared

Stage 4 (proof):
- `stage/4-hop:.claude/skills/orchestrator/SKILL.md:L33-L60` -- Team resolution algorithm
- `stage/4-hop:.claude/skills/orchestrator/teams/engineering.md` -- Engineering team profile
- `stage/4-hop:.claude/skills/orchestrator/teams/research.md` -- Research team profile
```

The pattern file on main is the accumulated wisdom. The source anchors are the breadcrumb trail back through the stages showing how the pattern grew.

### 4. Rebuild stages 4-7 from scratch (don't untangle)

Stages 4-7 never got clean branches. Rather than surgically splitting the 1059-line SKILL.md, rebuild each stage fresh from the previous stage's branch:

- `stage/4-hop` branches from `stage/3-full` (710 lines) -- adds team switching
- `stage/5-plugin` branches from `stage/4-hop` -- plugin extraction (no SKILL.md changes in prototype)
- `stage/6-codex` branches from `stage/5-plugin` -- adds difficulty routing + spec hardening
- `stage/7-hitl` branches from `stage/6-codex` -- adds HITL + persistence

The master plan already defines exactly what each stage introduces. Rebuilding is simpler than untangling.

### 5. Stages can be renamed as "modules"

The stage naming (`stage/1-dispatch`, `stage/2-dag`) works but is tied to this repo. The concept generalizes -- instead of "stages" these could be called learning modules:

- `orchestrate/1-dispatch`
- `orchestrate/2-dag`
- `orchestrate/3-full`

This opens the door for other module domains on the same lobby:

- `research/1-basic`
- `browser/1-validation`

Not a change for now, but the architecture supports it. The lobby pattern is domain-agnostic.

## Open Questions

- **Stage branch agents/teams** -- do the agent definitions (builder.md, validator.md) live on stage branches or main? They're needed on stage branches for `/orchestrate` to work, but they're also reference material. Likely: duplicated on both (stage branches need them runnable, main can reference them in docs).
- **Pattern file updates across stages** -- when a pattern evolves (e.g., spec-as-source-of-truth gains a hydration section in stage 7), how does the main lobby pattern file get updated? Options: (a) manual update on main after each stage is built, (b) `/dojo:add-pattern` handles updates too (contradicts immutability), (c) pattern files on main are only written once all stages are complete, then point to all relevant anchors.
- **CLAUDE.md on main vs stage branches** -- main's CLAUDE.md describes the lobby. Each stage branch needs its own CLAUDE.md describing that stage's orchestrator. These will diverge.
- **Dojo pattern coverage** -- currently the dojo covers stages 1-3 patterns (9 patterns). Stages 4-7 introduce more patterns (team-profiles, difficulty-routing, hitl-protocol, hydration-pattern, spec-hardening, plugin-architecture). When are these added to the dojo on main?

## Next Steps

-> `/workflows:plan` for the restructuring implementation -- strip main, rebuild stage 4-7 branches, update dojo source anchors
