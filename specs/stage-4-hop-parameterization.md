# Plan: Stage 4 - HOP Parameterization Proof

## Task Description

Stage 4 proves the orchestrator is agent-agnostic by introducing team profiles and `--team` flag switching. The same SKILL.md dispatch protocol runs unchanged with different agent teams. A second "research" team is created alongside the existing "engineering" (default) team. The `--team research` flag swaps `BUILDER_AGENT` and `VALIDATOR_AGENT` to research-specific agents with web search capabilities. This is the definitive HOP proof: identical orchestration logic, different agents, same results.

**Reference:** [Master Plan - Stage 4](./master-plan.md#stage-4-hop-parameterization-proof)

---

## Objective

When complete:

1. `/orchestrate "add a utility function"` -- uses engineering team (default), identical to Stage 3
2. `/orchestrate "research top 5 TS testing frameworks" --team research` -- uses research team
3. Both run the identical 12-step dispatch protocol. Only agent identities differ.
4. Team profiles are defined in a discoverable format that future stages can extend
5. The HOP pattern doc is updated with concrete proof evidence

---

## Problem Statement

In Stage 3, `BUILDER_AGENT: builder` and `VALIDATOR_AGENT: validator` are hardcoded in the HOP Configuration block of SKILL.md. The variables exist as placeholders but are never actually switched. Stage 4 proves these variables work as designed -- the orchestrator is a true Higher-Order Prompt where agent identities are parameters, not constants.

---

## Solution Approach

### 1. Team Profile System

Create a `teams/` directory under `.claude/skills/orchestrator/` containing one YAML-frontmatter markdown file per team. Each profile defines the agent mappings and any team-specific configuration. The orchestrator reads the profile at Step 1 to resolve agent variables.

Team profile format:
```yaml
---
name: research
description: Web research and synthesis team
builder: research-builder
validator: research-validator
---
```

### 2. Research Agent Definitions

Create `research-builder.md` and `research-validator.md` in `.claude/agents/`. These mirror the existing builder/validator but add web search tools and research-specific instructions.

### 3. SKILL.md Updates

- Add `--team` flag parsing to Step 1 (Parse the User Prompt)
- Add team profile resolution: read the team file, set HOP variables
- Update HOP Configuration block to show the resolution logic
- Update `orchestration.started` event to include the team name
- All `$BUILDER_AGENT` and `$VALIDATOR_AGENT` references already work -- no dispatch logic changes needed

### 4. Command Update

Update `orchestrate.md` command to document the `--team` flag syntax.

### 5. Pattern Documentation

- Update `docs/patterns/higher-order-prompt.md` with the Stage 4 proof evidence
- Create `docs/patterns/team-profiles.md` documenting the team profile pattern

### 6. Observability

- Add `team` field to `orchestration.started` event payload
- Add `team.resolved` event when a team profile is loaded

---

## Relevant Files

### Existing Files to Modify

- `.claude/skills/orchestrator/SKILL.md` -- add --team parsing, team profile resolution, update HOP Configuration docs
- `.claude/skills/orchestrator/references/dag-execution.md` -- add team resolution section, update event catalog with team events
- `.claude/commands/orchestrate.md` -- document --team flag in command description
- `.claude/CLAUDE.md` -- update project description for Stage 4
- `docs/patterns/higher-order-prompt.md` -- update with proof evidence from Stage 4
- `docs/agents.md` -- add research builder and research validator entries (move from "preview" to full entries)
- `specs/master-plan.md` -- mark Stage 4 complete, update file tables

### New Files

- `.claude/agents/research-builder.md` -- research builder agent definition
- `.claude/agents/research-validator.md` -- research validator agent definition
- `.claude/skills/orchestrator/teams/engineering.md` -- default engineering team profile
- `.claude/skills/orchestrator/teams/research.md` -- research team profile
- `docs/patterns/team-profiles.md` -- team profiles pattern documentation
- `specs/stage-4-hop-parameterization.md` -- this file (stage spec)
- `prompts/stage-4/default-engineering.md` -- test prompt using default (engineering) team
- `prompts/stage-4/research-team.md` -- test prompt using --team research
- `specs/examples/stage-4-research-team.md` -- example spec output for research team orchestration

---

## Implementation Phases

### Phase 1: Foundation (Agent Definitions + Team Profiles)

Create the research agent definitions and team profile format. This is the structural foundation -- everything else references these files.

1. Create research-builder.md with WebSearch/WebFetch tools and research-specific instructions
2. Create research-validator.md with research-specific validation criteria (coverage, citations, recency)
3. Create engineering.md team profile pointing to builder/validator
4. Create research.md team profile pointing to research-builder/research-validator

### Phase 2: Core Implementation (SKILL.md + Command Updates)

Modify the orchestrator skill to parse `--team`, resolve team profiles, and thread the team name through events.

1. Update SKILL.md Step 1 with --team flag parsing and team profile resolution
2. Update HOP Configuration block to show resolution logic
3. Update orchestrate.md command with --team flag documentation
4. Update dag-execution.md with team resolution reference and new events
5. Update CLAUDE.md project description

### Phase 3: Documentation + Polish

Write pattern docs, test prompts, update master plan.

1. Update higher-order-prompt.md with Stage 4 proof evidence
2. Create team-profiles.md pattern documentation
3. Update agents.md -- promote research agents from "preview" to full entries
4. Create test prompts for both teams
5. Create example spec output
6. Update master-plan.md status and file tables

---

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| All validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |

### Team Members

- Builder
  - Name: builder-agents
  - Role: Create research agent definitions and team profile files
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-skill
  - Role: Update SKILL.md, dag-execution.md, orchestrate.md, CLAUDE.md with --team support
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-docs
  - Role: Write/update pattern docs, agents.md, test prompts, example spec, master plan
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage4
  - Role: Validate all Stage 4 files for correctness, consistency, and completeness
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.

### 1. Create Research Builder Agent
- **Task ID**: create-research-builder
- **Depends On**: none
- **Assigned To**: builder-agents
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 2, 3, 4)
- Create `.claude/agents/research-builder.md` with:
  - Model: `claude-sonnet-4-5` (same as builder)
  - Tools: Read, Glob, Grep, Write, Edit, Bash, WebSearch, WebFetch, TaskGet, TaskUpdate
  - Research-specific instructions: synthesize information from web sources, cite sources, organize findings clearly
  - Same structural constraints as builder: named exports, JSDoc, file boundaries, read before writing
  - Summary format adapted for research output (sources, key findings, methodology)

### 2. Create Research Validator Agent
- **Task ID**: create-research-validator
- **Depends On**: none
- **Assigned To**: builder-agents
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1, 3, 4)
- Create `.claude/agents/research-validator.md` with:
  - Model: `claude-haiku-4-5` (same as validator)
  - Tools: Read, Glob, Grep, Bash, WebFetch, TaskGet, TaskUpdate (WebFetch for source verification)
  - DisallowedTools: Write, Edit, NotebookEdit
  - Research-specific validation: completeness of coverage, citation quality, source recency, factual accuracy
  - Same structural constraints as validator: binary verdict, check everything, specific failure feedback

### 3. Create Engineering Team Profile
- **Task ID**: create-engineering-profile
- **Depends On**: none
- **Assigned To**: builder-agents
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1, 2, 4)
- Create `.claude/skills/orchestrator/teams/engineering.md` with:
  - YAML frontmatter: name, description, builder (builder), validator (validator)
  - Brief description of what the engineering team is optimized for
  - This is the default team -- used when no --team flag is specified

### 4. Create Research Team Profile
- **Task ID**: create-research-profile
- **Depends On**: none
- **Assigned To**: builder-agents
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 1, 2, 3)
- Create `.claude/skills/orchestrator/teams/research.md` with:
  - YAML frontmatter: name, description, builder (research-builder), validator (research-validator)
  - Brief description of what the research team is optimized for
  - Document when to use `--team research`

### 5. Validate Agent and Profile Definitions
- **Task ID**: validate-agents-profiles
- **Depends On**: create-research-builder, create-research-validator, create-engineering-profile, create-research-profile
- **Assigned To**: validator-stage4
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify research-builder.md has correct YAML frontmatter (model, tools)
- Verify research-validator.md has disallowedTools blocking Write/Edit/NotebookEdit
- Verify both team profiles have valid YAML frontmatter with name, description, builder, validator fields
- Verify builder/validator references in team profiles match actual agent filenames in .claude/agents/
- Report VERDICT: PASS or VERDICT: FAIL

### 6. Update SKILL.md with --team Support
- **Task ID**: update-skill-md
- **Depends On**: validate-agents-profiles
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current SKILL.md thoroughly before modifying
- Update the title/header to "Stage 4 - HOP Parameterization"
- Update HOP Configuration block to show team resolution:
  ```
  USER_PROMPT:      (provided by the user)
  TEAM:             engineering (default) | resolved from --team flag
  BUILDER_AGENT:    (resolved from team profile)
  VALIDATOR_AGENT:  (resolved from team profile)
  SPEC_DIR:         specs/
  ```
- Add team resolution logic to Step 1 (Parse the User Prompt):
  - Parse `--team <name>` from the end of USER_PROMPT
  - If present: read team profile from `.claude/skills/orchestrator/teams/<name>.md`
  - If absent: read default team profile from `teams/engineering.md`
  - Set BUILDER_AGENT and VALIDATOR_AGENT from the profile
  - Strip the --team flag from USER_PROMPT before further processing
- Update `orchestration.started` event to include `"team": "<name>"` in the payload
- Add a new `team.resolved` event emission after team profile is loaded
- Update "What This Stage Does NOT Do" section -- remove the "--team switching" line (it's now implemented)
- All existing $BUILDER_AGENT and $VALIDATOR_AGENT references in dispatch steps remain unchanged

### 7. Update dag-execution.md Reference
- **Task ID**: update-dag-reference
- **Depends On**: validate-agents-profiles
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 6)
- Read current dag-execution.md thoroughly before modifying
- Add a "Team Resolution" section documenting:
  - Team profile file format and location
  - Resolution algorithm (--team flag -> profile file -> HOP variables)
  - Default team behavior (engineering when no flag)
- Add `team.resolved` event to the Observability Events section
- Update `orchestration.started` event to include `team` field
- Update the "Introduced in" line to note Stage 4 update
- Update full event sequence examples to include team.resolved event

### 8. Update orchestrate.md Command
- **Task ID**: update-command
- **Depends On**: validate-agents-profiles
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 6, 7)
- Read current orchestrate.md before modifying
- Update the command description to mention --team flag
- Add usage examples showing both default and --team research invocations

### 9. Update CLAUDE.md Project Description
- **Task ID**: update-claude-md
- **Depends On**: update-skill-md
- **Assigned To**: builder-skill
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Update the header/description to reflect Stage 4
- Update "How to Use" section with --team examples
- Update "Architecture" section to mention team profiles
- Update "What This Stage Does NOT Do" -- remove --team switching, keep remaining items
- Update agent conventions to mention research agents

### 10. Validate Skill and Reference Updates
- **Task ID**: validate-skill-updates
- **Depends On**: update-skill-md, update-dag-reference, update-command, update-claude-md
- **Assigned To**: validator-stage4
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md has --team parsing in Step 1
- Verify SKILL.md HOP Configuration shows team resolution
- Verify SKILL.md orchestration.started event includes team field
- Verify SKILL.md references team.resolved event
- Verify dag-execution.md has Team Resolution section
- Verify dag-execution.md event catalog includes team.resolved
- Verify orchestrate.md documents --team flag with examples
- Verify CLAUDE.md reflects Stage 4 description
- Report VERDICT: PASS or VERDICT: FAIL

### 11. Update Higher-Order Prompt Pattern Doc
- **Task ID**: update-hop-pattern
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 12, 13, 14)
- Read current higher-order-prompt.md thoroughly
- Update "Stage 4: Full HOP Proof" section with concrete evidence:
  - Show the exact HOP Configuration before/after team switching
  - Document that the 12-step protocol is identical for both teams
  - List what changes (2 agent names) vs what stays the same (everything else)
  - Add a "Proof by Diff" subsection: the diff between engineering and research orchestration is exactly the agent names in events
- Update "Introduced in" to reflect Stage 4 completion

### 12. Create Team Profiles Pattern Doc
- **Task ID**: create-team-profiles-pattern
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 11, 13, 14)
- Create `docs/patterns/team-profiles.md` with:
  - What It Is: team profile as a bundle of agent identities resolved at orchestration start
  - How We Use It Here: team profile format, directory structure, resolution algorithm
  - Why Team Profiles: separation of agent identity from orchestration logic, extensibility
  - Community Sources: IndyDevDan's team switching, agent team patterns from research
  - Related Documents: links to HOP pattern doc, SKILL.md, agent catalog

### 13. Update Agent Catalog
- **Task ID**: update-agents-catalog
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 11, 12, 14)
- Read current agents.md thoroughly
- Move research agents from "Stage 4 Preview" section to a full "Stage 4: Research Team" section
- Add the actual tool lists and constraints from the created agent files
- Update the "Why These Models?" section to cover research agents
- Add a "Team Switching" section documenting how --team resolves agents

### 14. Create Test Prompts and Example Spec
- **Task ID**: create-test-prompts
- **Depends On**: validate-skill-updates
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 11, 12, 13)
- Create `prompts/stage-4/default-engineering.md`:
  - A prompt that exercises the default engineering team
  - Expected behavior: no --team flag, resolves to engineering profile, builder/validator dispatched
- Create `prompts/stage-4/research-team.md`:
  - A prompt that exercises --team research
  - Example: "research top 5 TS testing frameworks" --team research
  - Expected behavior: --team research parsed, resolves to research profile, research-builder/research-validator dispatched
- Create `specs/examples/stage-4-research-team.md`:
  - Example spec output showing what a research team orchestration produces
  - Shows team field in events, research-builder/research-validator in dispatches

### 15. Update Master Plan
- **Task ID**: update-master-plan
- **Depends On**: update-hop-pattern, create-team-profiles-pattern, update-agents-catalog, create-test-prompts
- **Assigned To**: builder-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read current master-plan.md thoroughly
- Update Stage 4 status from "Planned" to "Complete" in the status table
- Add a complete file table for Stage 4 (matching the format of Stages 1-3)
- Add verification section for Stage 4
- Update "Next step" to point to Stage 5

### 16. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-master-plan
- **Assigned To**: validator-stage4
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify all new files exist:
  - `.claude/agents/research-builder.md`
  - `.claude/agents/research-validator.md`
  - `.claude/skills/orchestrator/teams/engineering.md`
  - `.claude/skills/orchestrator/teams/research.md`
  - `docs/patterns/team-profiles.md`
  - `prompts/stage-4/default-engineering.md`
  - `prompts/stage-4/research-team.md`
  - `specs/examples/stage-4-research-team.md`
- Verify all modified files reference Stage 4:
  - SKILL.md title includes "Stage 4"
  - CLAUDE.md mentions --team switching
  - orchestrate.md has --team usage examples
  - master-plan.md shows Stage 4 as complete
  - higher-order-prompt.md has proof evidence
  - agents.md has full research team entries
- Verify cross-references are consistent:
  - Team profile builder/validator names match agent filenames
  - Pattern doc links are valid relative paths
  - Event payloads in SKILL.md match dag-execution.md catalog
- Run `bun run validate` to verify no lint/typecheck/test regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. `/orchestrate "add a utility function"` resolves to engineering team (default) without --team flag
2. `/orchestrate "research top 5 TS testing frameworks" --team research` resolves to research team
3. SKILL.md dispatch protocol is identical for both teams -- only agent names differ
4. Team profiles exist as markdown files with YAML frontmatter in `.claude/skills/orchestrator/teams/`
5. Research builder has WebSearch and WebFetch tools that standard builder lacks
6. Research validator has WebFetch for source verification that standard validator lacks
7. `orchestration.started` event includes `team` field
8. `team.resolved` event fires after team profile is loaded
9. Pattern docs explain the HOP proof with concrete before/after evidence
10. All cross-references between files are consistent and valid
11. `bun run validate` passes with no regressions

---

## Validation Commands

- `bun test` -- run all tests
- `bunx tsc --noEmit` -- verify no type errors
- `bunx biome ci .` -- lint and format check

---

## Notes

- The research agents described in `docs/agents.md` Stage 4 Preview section were designed in advance during Stage 1. The tool lists and constraints are already specified -- this stage materializes them as actual agent files.
- Team profiles are intentionally simple markdown files (not TypeScript, not JSON). The orchestrator is a markdown prompt -- it reads markdown. Keeping the team profiles in the same format avoids any runtime parsing complexity.
- The `--team` flag is parsed from the end of the USER_PROMPT string. This is a convention, not a CLI parser. The orchestrator strips it before further processing. If the user does not include --team, the default (engineering) profile is used.
- No TypeScript code changes are required for Stage 4. This is a pure prompt/docs/agents stage -- the emit-event.ts script already handles arbitrary event payloads.
- The `team.resolved` event is a new Stage 4 event. It fires after the team profile is read and before any other processing. This gives observability into which team was selected for a given orchestration run.
