# Plan: Stage 5 - Plugin Extraction to side-quest-plugins

## Task Description

Stage 5 extracts the working HOP Orchestrator prototype from `orchestrator-prototype` into the `side-quest-plugins` marketplace as a proper plugin. The prototype repo (Stages 1-4) was the proving ground -- now the orchestrator moves to its final home alongside git, enterprise, and newsroom plugins. The prototype repo remains as-is for educational purposes (readers can still checkout any stage branch), but the living, evolving orchestrator now lives in side-quest-plugins.

**Reference:** [Master Plan - Stage 5](./master-plan.md#stage-5-extract-to-side-quest-plugins)

---

## Objective

When complete:

1. A new `agentic-orchestration` plugin exists at `side-quest-plugins/plugins/agentic-orchestration/`
2. The plugin passes `claude plugin validate .` and `bun run validate:marketplace`
3. `/orchestrate` command works identically when invoked from the plugin
4. All agent definitions, skills, references, and team profiles are extracted
5. The emit-event.ts script is extracted and adapted for the plugin context
6. marketplace.json is updated with the new plugin entry (minor version bump)
7. Plugin README documents coordination pattern, agent roles, compute multiplier, and safety mechanisms per multi-agent plugin requirements
8. Pattern doc `docs/patterns/plugin-architecture.md` is created in the prototype repo documenting the extraction pattern
9. Master plan is updated with Stage 5 status and file tables

---

## Problem Statement

The orchestrator prototype is proven -- Stages 1-4 demonstrate dispatch loops, DAG execution, retry, clarifying questions, fast path, plan refinement, token estimation, and HOP parameterization with team switching. But it lives in a standalone repo that requires manual `.claude/` directory setup per project. Extracting to the plugin system means any Claude Code user can install it with `/plugin install agentic-orchestration@side-quest` and get the full orchestrator capability in any project.

The extraction is non-trivial because:
- Plugin paths differ from project `.claude/` paths (plugins use relative paths from plugin root, not from `.claude/`)
- The emit-event.ts script needs to work from the plugin's installed location, not the prototype's `scripts/` directory
- Team profiles and references must be bundled correctly in the plugin manifest
- SKILL.md internal references (to dag-execution.md, team profiles) need path updates
- The plugin must pass the side-quest-plugins acceptance checklist

---

## Solution Approach

### 1. Plugin Structure

Create the plugin at `side-quest-plugins/plugins/agentic-orchestration/` following the established pattern from enterprise, git, and newsroom plugins:

```
plugins/agentic-orchestration/
  .claude-plugin/
    plugin.json                    # Plugin manifest
  agents/
    builder.md                     # Generic builder (from prototype)
    validator.md                   # Generic validator (from prototype)
    research-builder.md            # Research builder (Stage 4)
    research-validator.md          # Research validator (Stage 4)
  commands/
    orchestrate.md                 # User-facing /orchestrate command
  skills/
    orchestrator/
      SKILL.md                     # The HOP -- full orchestration logic
      references/
        dag-execution.md           # Wave algorithm, retry, fast path
      teams/
        engineering.md             # Default engineering team profile
        research.md                # Research team profile
  scripts/
    emit-event.ts                  # Event emitter (adapted for plugin location)
  hooks/
    hooks.json                     # PostToolUse hooks (optional -- for envelope validation)
  README.md                        # Plugin README (per multi-agent requirements)
```

### 2. Path Adaptation

All internal references in SKILL.md and dag-execution.md currently use project-relative paths (e.g., `specs/`, `.claude/agents/`, `bun run scripts/emit-event.ts`). In the plugin context:
- Agent references work automatically -- Claude Code resolves agent names from the plugin's `agents` field in plugin.json
- SKILL.md references to `references/dag-execution.md` remain relative to the skill directory (unchanged)
- Team profiles at `teams/engineering.md` and `teams/research.md` remain relative to the skill directory (unchanged)
- The emit-event.ts script path changes -- it ships with the plugin and needs a portable invocation path
- Spec files continue to write to `specs/` relative to the user's project root (not the plugin directory)

### 3. Emit-Event Script Adaptation

The current `scripts/emit-event.ts` uses `process.cwd()` as `appRoot`, which is correct for both contexts. The invocation path changes from `bun run scripts/emit-event.ts` to a path relative to the plugin's installed location. Two options:

**Option A (recommended):** Bundle the emit-event script into the plugin's `scripts/` directory and update SKILL.md to use a relative path from the plugin root. Since Claude Code plugins have a known install location, the SKILL.md can reference the script relative to its own directory.

**Option B:** Use the `@side-quest/observability` package directly (if it exports a CLI). This removes the need for a bundled script but adds an external dependency.

Going with Option A -- keeps the plugin self-contained.

### 4. Plugin Manifest

The plugin.json references commands, skills, and agents using relative paths from the plugin root:

```json
{
  "name": "agentic-orchestration",
  "description": "HOP Orchestrator - decomposes prompts into task DAGs and dispatches Builder/Validator agent teams",
  "version": "1.0.0",
  "author": { "name": "Nathan Vale" },
  "keywords": ["orchestration", "builder-validator", "hop", "dag", "multi-agent", "agent-teams"],
  "license": "MIT",
  "commands": ["./commands/orchestrate.md"],
  "skills": ["./skills/orchestrator"],
  "agents": [
    "./agents/builder.md",
    "./agents/validator.md",
    "./agents/research-builder.md",
    "./agents/research-validator.md"
  ]
}
```

### 5. Marketplace Entry

Add to `.claude-plugin/marketplace.json`:

```json
{
  "name": "agentic-orchestration",
  "source": "./plugins/agentic-orchestration",
  "description": "HOP Orchestrator - decomposes prompts into task DAGs and dispatches Builder/Validator agent teams",
  "category": "development",
  "tags": ["orchestration", "builder-validator", "hop", "dag", "multi-agent", "agent-teams", "compound-engineering"]
}
```

Bump marketplace version from 1.0.0 to 1.1.0 (adding a plugin = minor bump per versioning policy).

### 6. README (Multi-Agent Requirements)

Per plugin-standards.md, multi-agent plugins must document:
- Coordination pattern: Hierarchical (orchestrator dispatches builders, validators verify)
- Agent roles: 4 agents with tools and responsibilities
- Compute multiplier: ~4,500 tokens per task, 2-4x for retries
- Safety: Validator is structurally read-only (disallowedTools), builder writes only to specified files

### 7. Prototype Repo Updates

Back in orchestrator-prototype:
- Create `docs/patterns/plugin-architecture.md` documenting the extraction pattern
- Update `specs/master-plan.md` with Stage 5 status and file tables
- Update `CLAUDE.md` to note Stage 5 extraction

---

## Relevant Files

### Source Files (orchestrator-prototype -- read only, copy from)

- `.claude/skills/orchestrator/SKILL.md` -- the core HOP skill (copy and adapt paths)
- `.claude/skills/orchestrator/references/dag-execution.md` -- wave/retry reference (copy as-is)
- `.claude/skills/orchestrator/teams/engineering.md` -- engineering team profile (copy, Stage 4 creates this)
- `.claude/skills/orchestrator/teams/research.md` -- research team profile (copy, Stage 4 creates this)
- `.claude/agents/builder.md` -- builder agent (copy as-is)
- `.claude/agents/validator.md` -- validator agent (copy as-is)
- `.claude/agents/research-builder.md` -- research builder (copy, Stage 4 creates this)
- `.claude/agents/research-validator.md` -- research validator (copy, Stage 4 creates this)
- `.claude/commands/orchestrate.md` -- command wrapper (copy and adapt)
- `scripts/emit-event.ts` -- event emitter (copy and adapt `app` field)

### Target Files (side-quest-plugins -- create new)

- `plugins/agentic-orchestration/.claude-plugin/plugin.json` -- plugin manifest
- `plugins/agentic-orchestration/agents/builder.md`
- `plugins/agentic-orchestration/agents/validator.md`
- `plugins/agentic-orchestration/agents/research-builder.md`
- `plugins/agentic-orchestration/agents/research-validator.md`
- `plugins/agentic-orchestration/commands/orchestrate.md`
- `plugins/agentic-orchestration/skills/orchestrator/SKILL.md`
- `plugins/agentic-orchestration/skills/orchestrator/references/dag-execution.md`
- `plugins/agentic-orchestration/skills/orchestrator/teams/engineering.md`
- `plugins/agentic-orchestration/skills/orchestrator/teams/research.md`
- `plugins/agentic-orchestration/scripts/emit-event.ts`
- `plugins/agentic-orchestration/README.md`
- `.claude-plugin/marketplace.json` (update -- add plugin entry, bump version)

### Files to Modify (orchestrator-prototype)

- `specs/master-plan.md` -- update Stage 5 status and file tables
- `.claude/CLAUDE.md` -- update project description for Stage 5
- `docs/patterns/plugin-architecture.md` -- new pattern doc

### New Files

- `docs/patterns/plugin-architecture.md` -- pattern documentation for the extraction process
- `specs/stage-5-plugin-extraction.md` -- this file (stage spec)
- `prompts/stage-5/install-and-orchestrate.md` -- test prompt for plugin-installed orchestration
- `specs/examples/stage-5-plugin-install.md` -- example of installing and using the plugin

---

## Implementation Phases

### Phase 1: Plugin Scaffolding (side-quest-plugins)

Create the plugin directory structure, manifest, and copy agent definitions. No modifications yet -- just structural setup.

1. Create `plugins/agentic-orchestration/` directory tree
2. Create plugin.json manifest
3. Copy agent definitions (builder, validator, research-builder, research-validator)
4. Copy orchestrate.md command (adapt if needed)

### Phase 2: Core Extraction (SKILL.md + References + Scripts)

Copy and adapt the SKILL.md, dag-execution.md, team profiles, and emit-event.ts for the plugin context.

1. Copy SKILL.md, update any paths that reference project-root locations
2. Copy dag-execution.md reference
3. Copy team profiles (engineering.md, research.md)
4. Copy and adapt emit-event.ts (change `app` field to `'agentic-orchestration'`)
5. Update SKILL.md emit-event invocation paths

### Phase 3: Marketplace Integration

Update marketplace.json, create README, validate.

1. Add plugin entry to marketplace.json
2. Bump marketplace version to 1.1.0
3. Write README.md (per multi-agent plugin standards)
4. Run `claude plugin validate .` from plugin directory
5. Run `bun run validate:marketplace` from repo root

### Phase 4: Prototype Repo Documentation

Update the prototype repo with Stage 5 documentation.

1. Create `docs/patterns/plugin-architecture.md`
2. Create test prompts and example spec
3. Update master-plan.md with Stage 5 status and file tables
4. Update CLAUDE.md project description

---

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. Use Task and Task* tools only.
- Take note of the session id (agentId) of each team member for resume operations.
- **IMPORTANT:** Stage 4 must be complete before Stage 5 can execute. The builders must verify that Stage 4 files (research agents, team profiles) exist before copying them. If Stage 4 is not yet implemented, the builders should create placeholder files and document what's missing.

### Model Selection Guide

| Role | Model | Rationale |
|------|-------|-----------|
| All builders | sonnet | Executes well-specified tasks reliably |
| All validators | haiku | Mechanical checks: read files, run commands, report PASS/FAIL |

### Team Members

- Builder
  - Name: builder-plugin-scaffold
  - Role: Create plugin directory structure, manifest, and copy agent/command files
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-plugin-core
  - Role: Copy and adapt SKILL.md, dag-execution.md, team profiles, emit-event.ts
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-marketplace
  - Role: Update marketplace.json, write plugin README
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Builder
  - Name: builder-prototype-docs
  - Role: Create plugin-architecture.md pattern doc, test prompts, update master plan and CLAUDE.md
  - Agent Type: general-purpose
  - Model: sonnet
  - Resume: true

- Validator
  - Name: validator-stage5
  - Role: Validate plugin structure, manifest, marketplace, paths, and cross-references
  - Agent Type: general-purpose
  - Model: haiku
  - Resume: true

---

## Step by Step Tasks

- Execute every step in order, top to bottom.
- Before starting, run TaskCreate for each task so all team members can see the full plan.
- **Cross-repo note:** Tasks 1-8 operate on `side-quest-plugins` repo. Tasks 9-12 operate on `orchestrator-prototype` repo. Builders must use absolute paths.

### 1. Create Plugin Directory and Manifest
- **Task ID**: create-plugin-manifest
- **Depends On**: none
- **Assigned To**: builder-plugin-scaffold
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Create the directory tree at `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/`:
  - `.claude-plugin/plugin.json`
  - `agents/` (empty for now)
  - `commands/` (empty for now)
  - `skills/orchestrator/references/` (empty for now)
  - `skills/orchestrator/teams/` (empty for now)
  - `scripts/` (empty for now)
- Write `plugin.json` with:
  ```json
  {
    "name": "agentic-orchestration",
    "description": "HOP Orchestrator - decomposes prompts into task DAGs and dispatches Builder/Validator agent teams",
    "version": "1.0.0",
    "author": { "name": "Nathan Vale" },
    "keywords": ["orchestration", "builder-validator", "hop", "dag", "multi-agent", "agent-teams"],
    "license": "MIT",
    "commands": ["./commands/orchestrate.md"],
    "skills": ["./skills/orchestrator"],
    "agents": [
      "./agents/builder.md",
      "./agents/validator.md",
      "./agents/research-builder.md",
      "./agents/research-validator.md"
    ]
  }
  ```

### 2. Copy Agent Definitions
- **Task ID**: copy-agent-definitions
- **Depends On**: create-plugin-manifest
- **Assigned To**: builder-plugin-scaffold
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read each agent file from `/Users/nathanvale/code/orchestrator-prototype/.claude/agents/`:
  - `builder.md` -- copy as-is
  - `validator.md` -- copy as-is
- If Stage 4 has been implemented (check for existence):
  - `research-builder.md` -- copy as-is
  - `research-validator.md` -- copy as-is
- If Stage 4 files don't exist yet, create placeholder agent files with a comment noting they'll be populated when Stage 4 completes
- Write to `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/agents/`

### 3. Copy Orchestrate Command
- **Task ID**: copy-orchestrate-command
- **Depends On**: create-plugin-manifest
- **Assigned To**: builder-plugin-scaffold
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 2)
- Read `/Users/nathanvale/code/orchestrator-prototype/.claude/commands/orchestrate.md`
- Copy to `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/commands/orchestrate.md`
- The command references `skill: orchestrator` which resolves from the plugin's skills directory -- no path change needed

### 4. Validate Plugin Scaffold
- **Task ID**: validate-plugin-scaffold
- **Depends On**: copy-agent-definitions, copy-orchestrate-command
- **Assigned To**: validator-stage5
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify plugin.json exists at correct path and has valid JSON
- Verify all agent files referenced in plugin.json exist
- Verify orchestrate.md command exists
- Verify directory structure matches expected layout
- Report VERDICT: PASS or VERDICT: FAIL

### 5. Copy and Adapt SKILL.md
- **Task ID**: copy-adapt-skill-md
- **Depends On**: validate-plugin-scaffold
- **Assigned To**: builder-plugin-core
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read SKILL.md from `/Users/nathanvale/code/orchestrator-prototype/.claude/skills/orchestrator/SKILL.md`
- Copy to `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/skills/orchestrator/SKILL.md`
- Adapt the following:
  - Update emit-event invocations: change `bun run scripts/emit-event.ts` to use a path relative to the plugin's installed location. Since the plugin installs into `.claude/plugins/agentic-orchestration/`, the script lives at `scripts/emit-event.ts` within that directory. The Bash invocation should use the plugin-relative path. **However**, since SKILL.md runs in the user's project context, not the plugin directory, we need to discover the script path. Use `__dirname`-style discovery or hard-code the expected plugin install path: `bun run ~/.claude/plugins/agentic-orchestration/scripts/emit-event.ts` is NOT portable. **Best approach:** Change the emit-event.ts to be a standalone CLI that can be invoked via `bunx @side-quest/emit-event` or keep the script bundled and use a relative path from the SKILL.md's own directory. Since SKILL.md is a prompt (not code), it can reference `./scripts/emit-event.ts` relative to the plugin root and let the skill executor resolve it. **Simplest approach:** Keep the invocation as `bun run scripts/emit-event.ts` and document that the script must exist in the user's project (or provide a setup command). OR: since the event emitter is fire-and-forget and optional, make it a no-op if the script doesn't exist. The SKILL.md already wraps emits in try/catch semantics (the script itself handles missing server silently).
  - **Decision: Keep `bun run scripts/emit-event.ts` unchanged in SKILL.md.** The script is fire-and-forget. If the user's project doesn't have it, the Bash command fails silently (non-blocking). For users who want observability, they copy the script to their project's `scripts/` directory. This is documented in the README.
  - No other path changes needed -- team profile paths and reference paths are relative to the SKILL.md directory

### 6. Copy References and Team Profiles
- **Task ID**: copy-references-profiles
- **Depends On**: validate-plugin-scaffold
- **Assigned To**: builder-plugin-core
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 5)
- Read and copy from `/Users/nathanvale/code/orchestrator-prototype/.claude/skills/orchestrator/`:
  - `references/dag-execution.md` -- copy as-is
  - If Stage 4 exists: `teams/engineering.md` and `teams/research.md` -- copy as-is
  - If Stage 4 not yet done: create minimal team profile placeholders
- Write to `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/skills/orchestrator/`
- Update relative path references in dag-execution.md "Related Documents" section -- these point to `docs/patterns/` which won't exist in the plugin. Change to reference the prototype repo or remove the links.

### 7. Copy and Adapt Emit-Event Script
- **Task ID**: copy-adapt-emit-event
- **Depends On**: validate-plugin-scaffold
- **Assigned To**: builder-plugin-core
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with tasks 5, 6)
- Read `/Users/nathanvale/code/orchestrator-prototype/scripts/emit-event.ts`
- Copy to `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/scripts/emit-event.ts`
- Change the `app` field from `'orchestrator-prototype'` to `'agentic-orchestration'`
- No other changes needed -- the script uses `process.cwd()` for appRoot which is correct in both contexts

### 8. Validate Core Plugin
- **Task ID**: validate-core-plugin
- **Depends On**: copy-adapt-skill-md, copy-references-profiles, copy-adapt-emit-event
- **Assigned To**: validator-stage5
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify SKILL.md exists at correct plugin path
- Verify dag-execution.md reference exists
- Verify team profile files exist (or placeholders noted)
- Verify emit-event.ts exists and has `app: 'agentic-orchestration'`
- Verify plugin.json `skills` field points to the correct directory
- Verify SKILL.md `$BUILDER_AGENT` and `$VALIDATOR_AGENT` references are present
- Report VERDICT: PASS or VERDICT: FAIL

### 9. Update Marketplace and Write README
- **Task ID**: update-marketplace-readme
- **Depends On**: validate-core-plugin
- **Assigned To**: builder-marketplace
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: false
- Read `/Users/nathanvale/code/side-quest-plugins/.claude-plugin/marketplace.json`
- Add the agentic-orchestration plugin entry:
  ```json
  {
    "name": "agentic-orchestration",
    "source": "./plugins/agentic-orchestration",
    "description": "HOP Orchestrator - decomposes prompts into task DAGs and dispatches Builder/Validator agent teams",
    "category": "development",
    "tags": ["orchestration", "builder-validator", "hop", "dag", "multi-agent", "agent-teams", "compound-engineering"]
  }
  ```
- Bump marketplace version from current value to next minor (e.g., 1.0.0 -> 1.1.0)
- Write `/Users/nathanvale/code/side-quest-plugins/plugins/agentic-orchestration/README.md` per multi-agent plugin standards:
  - One paragraph description
  - Install instructions
  - Usage examples (default team, --team research)
  - How It Works section:
    - Coordination pattern: Hierarchical (orchestrator dispatches builders, validators verify independently)
    - Agent roles table (4 agents with models, tools, responsibilities)
    - Compute multiplier: ~4,500 tokens per task base, 2-4x with retries
    - Safety: Validator is structurally read-only (disallowedTools enforced by runtime)
  - Requirements: Bun runtime for emit-event.ts (optional -- events are fire-and-forget)
  - Limitations: Sequential wave execution (Stage 8 adds parallel), no persistent state (Stage 7)

### 10. Validate Marketplace Integration
- **Task ID**: validate-marketplace
- **Depends On**: update-marketplace-readme
- **Assigned To**: validator-stage5
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- Verify marketplace.json has the new plugin entry
- Verify marketplace version was bumped (minor)
- Verify README.md exists and contains required multi-agent sections:
  - Coordination pattern
  - Agent roles
  - Compute multiplier
  - Safety section
- Verify plugin.json `name` matches marketplace.json entry `name`
- Verify plugin.json `name` matches the directory basename (`agentic-orchestration`)
- Run `bun run validate:marketplace` if possible (from side-quest-plugins root)
- Report VERDICT: PASS or VERDICT: FAIL

### 11. Create Plugin Architecture Pattern Doc
- **Task ID**: create-plugin-architecture-pattern
- **Depends On**: validate-marketplace
- **Assigned To**: builder-prototype-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 12)
- Create `/Users/nathanvale/code/orchestrator-prototype/docs/patterns/plugin-architecture.md` with:
  - What It Is: the pattern of extracting a prototype into a distributable plugin
  - How We Use It Here: the mapping from prototype `.claude/` structure to plugin directory structure
  - Key Decisions: what changes (paths, app identifiers), what stays the same (SKILL.md logic, agent definitions), what becomes optional (emit-event.ts)
  - Plugin Manifest anatomy
  - Marketplace integration steps
  - Community Sources: Claude Code plugin docs, side-quest-plugins standards
  - Related Documents: links to master-plan.md, plugin-standards.md

### 12. Create Test Prompts and Update Master Plan
- **Task ID**: create-test-prompts-update-plan
- **Depends On**: validate-marketplace
- **Assigned To**: builder-prototype-docs
- **Agent Type**: general-purpose
- **Model**: sonnet
- **Parallel**: true (with task 11)
- Create `/Users/nathanvale/code/orchestrator-prototype/prompts/stage-5/install-and-orchestrate.md`:
  - Test prompt for installing the plugin and running an orchestration
  - Expected behavior: install via marketplace, /orchestrate works identically to prototype
- Create `/Users/nathanvale/code/orchestrator-prototype/specs/examples/stage-5-plugin-install.md`:
  - Example showing the installation and first orchestration from the plugin
- Read and update `/Users/nathanvale/code/orchestrator-prototype/specs/master-plan.md`:
  - Update Stage 5 status from "Planned" to "Complete" in the status table
  - Add file table for Stage 5 (matching format of Stages 1-4)
  - Add verification section
  - Update "Next step" to point to Stage 6
- Read and update `/Users/nathanvale/code/orchestrator-prototype/.claude/CLAUDE.md`:
  - Update project description to reflect Stage 5
  - Add note that the plugin is now available at side-quest-plugins
  - Update "What This Stage Does NOT Do" if needed

### 13. Final Validation
- **Task ID**: validate-all
- **Depends On**: create-plugin-architecture-pattern, create-test-prompts-update-plan
- **Assigned To**: validator-stage5
- **Agent Type**: general-purpose
- **Model**: haiku
- **Parallel**: false
- **Side-quest-plugins repo checks:**
  - Verify all files exist under `plugins/agentic-orchestration/`:
    - `.claude-plugin/plugin.json`
    - `agents/builder.md`
    - `agents/validator.md`
    - `agents/research-builder.md` (or placeholder)
    - `agents/research-validator.md` (or placeholder)
    - `commands/orchestrate.md`
    - `skills/orchestrator/SKILL.md`
    - `skills/orchestrator/references/dag-execution.md`
    - `skills/orchestrator/teams/engineering.md` (or placeholder)
    - `skills/orchestrator/teams/research.md` (or placeholder)
    - `scripts/emit-event.ts`
    - `README.md`
  - Verify marketplace.json includes agentic-orchestration entry
  - Verify marketplace version was bumped
  - Verify all paths in plugin.json resolve to real files
- **Orchestrator-prototype repo checks:**
  - Verify `docs/patterns/plugin-architecture.md` exists
  - Verify `prompts/stage-5/install-and-orchestrate.md` exists
  - Verify `specs/examples/stage-5-plugin-install.md` exists
  - Verify `specs/master-plan.md` shows Stage 5 as complete
  - Verify CLAUDE.md reflects Stage 5
- Run `bun run validate` in orchestrator-prototype to verify no regressions
- Report VERDICT: PASS or VERDICT: FAIL

---

## Acceptance Criteria

1. Plugin directory exists at `side-quest-plugins/plugins/agentic-orchestration/` with complete structure
2. `plugin.json` manifest is valid and all referenced paths resolve to real files
3. `marketplace.json` includes the new plugin with correct metadata and version bump
4. SKILL.md in the plugin is functionally identical to the prototype's SKILL.md (same 12-step protocol)
5. All 4 agent definitions are present (builder, validator, research-builder, research-validator)
6. Team profiles (engineering, research) are present
7. dag-execution.md reference is present
8. emit-event.ts script is present with `app: 'agentic-orchestration'`
9. README.md meets multi-agent plugin standards (coordination pattern, agent roles, compute multiplier, safety)
10. Plugin architecture pattern doc exists in orchestrator-prototype
11. Master plan shows Stage 5 as complete with file tables
12. `bun run validate` passes in orchestrator-prototype with no regressions

---

## Validation Commands

- `bun test` -- run all tests (orchestrator-prototype)
- `bunx tsc --noEmit` -- verify no type errors (orchestrator-prototype)
- `bunx biome ci .` -- lint and format check (orchestrator-prototype)
- `bun run validate:marketplace` -- marketplace structure checks (side-quest-plugins)

---

## Notes

- **Stage 4 dependency:** This plan assumes Stage 4 (HOP Parameterization) is complete before Stage 5 executes. If Stage 4 is not yet implemented, builders should create placeholder files for research agents and team profiles and document what's missing. The placeholders can be replaced when Stage 4 is complete.
- **The prototype repo remains unchanged as an educational resource.** Stage 5 does not remove any files from the prototype. It copies and adapts them for the plugin system. Both repos continue to work independently.
- **The emit-event.ts script is optional.** If a user's project doesn't have the script at `scripts/emit-event.ts`, the Bash commands in SKILL.md will fail silently (non-blocking). The script is fire-and-forget -- it never blocks orchestration. Users who want observability copy the script to their project.
- **The plugin replaces the `agentic-orchestration` plugin that existed in the backup repo.** The backup version (`side-quest-plugins-backup/plugins/agentic-orchestration/`) was a knowledge-base-style plugin with pattern references. The new version is the actual working orchestrator.
- **Starter pack update:** Consider adding agentic-orchestration to the "compound-engineering" starter pack in the README, but this is a separate PR concern.
- **No TypeScript code changes in orchestrator-prototype.** The only TS file that changes is emit-event.ts in the side-quest-plugins copy (app field update).
