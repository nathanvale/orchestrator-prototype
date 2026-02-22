# Test Prompt: Install and Orchestrate

**Stage:** 5 (Plugin Extraction)

## Purpose

Verify that the extracted plugin works identically to the prototype when installed from the marketplace.

## Setup

```bash
# Install the plugin
/plugin install agentic-orchestration@side-quest
```

## Test 1: Default Engineering Team

```
/orchestrate "add a utility function that formats dates in src/utils/format-date.ts"
```

**Expected:**
- Orchestrator resolves engineering team (default)
- Fast path triggered (single file, < 20 lines)
- Builder creates the file
- Validator verifies
- VERDICT: PASS

## Test 2: Research Team

```
/orchestrate "research the top 3 TypeScript build tools in 2026" --team research
```

**Expected:**
- Orchestrator parses --team research
- Research team profile resolved
- Research builder uses WebSearch/WebFetch
- Research validator checks coverage and citations
- VERDICT: PASS

## Test 3: Multi-Task DAG

```
/orchestrate "add a REST API with GET /health, GET /version, and POST /echo endpoints in src/api/"
```

**Expected:**
- Decomposes into 3+ tasks
- Writes spec file to specs/
- Shows plan for approval
- Executes wave by wave
- All tasks PASS

## Success Criteria

All three tests produce identical behavior to the prototype orchestrator. The only visible difference is the plugin install step -- after that, /orchestrate works exactly the same.
