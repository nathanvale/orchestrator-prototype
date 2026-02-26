# Example: Plugin Installation and First Orchestration

**Stage:** 5 (Plugin Extraction)

This example shows what happens when a user installs the agentic-orchestration plugin and runs their first orchestration.

## Installation

```
> /plugin install agentic-orchestration@side-quest

Installing agentic-orchestration from side-quest marketplace...
Plugin installed successfully.

Available commands:
  /orchestrate - Orchestrate a complex task using Builder/Validator dispatch

Available agents:
  builder         - Focused implementation agent (sonnet)
  validator       - Read-only verification agent (haiku)
  research-builder  - Research and synthesis agent (sonnet)
  research-validator - Research verification agent (haiku)
```

## First Orchestration (Fast Path)

```
> /orchestrate "add JSDoc to the greet function in src/hello.ts"

Resolving team: engineering (default)
Builder: builder | Validator: validator

Fast path triggered: single file, < 20 lines

Dispatching builder (sonnet)...
Builder completed.

Dispatching validator (haiku)...
Validator completed.

VERDICT: PASS

Summary:
  Files modified: src/hello.ts
  Fast path: yes
  Retries: 0
  Clarifying questions: 0
```

## First Orchestration (Full DAG)

```
> /orchestrate "add a REST API with GET /users and POST /users"

Resolving team: engineering (default)
Builder: builder | Validator: validator

Decomposing into tasks...

Task Graph:
| Task ID              | Subject                     | Wave |
|---------------------|-----------------------------|------|
| define-user-types    | Define User types           | 1    |
| implement-get-users  | Implement GET /users        | 2    |
| implement-post-users | Implement POST /users       | 2    |
| write-route-tests    | Write route tests           | 3    |

Token estimate:
  Wave 1: 1 task  -- ~4,500 tokens
  Wave 2: 2 tasks -- ~9,000 tokens
  Wave 3: 1 task  -- ~4,500 tokens
  Total:          -- ~18,000 tokens

Approve and proceed? [Yes]

Executing Wave 1...
  define-user-types: PASS

Executing Wave 2...
  implement-get-users: PASS
  implement-post-users: PASS

Executing Wave 3...
  write-route-tests: PASS

All 4 tasks completed across 3 waves.
  Retries: 0
  Fast path: no
  Clarifying questions: 0
```
