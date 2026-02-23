---
name: framework-validator
description: Read-only validator that checks module branches against the lobby restructure framework. Inspects branches remotely using git show, git ls-tree, and git diff -- never checks out branches or modifies files. Reports VERDICT: PASS or VERDICT: FAIL.
tools: Read, Glob, Grep, Bash
model: haiku
skills:
  - module-branch-validator
---
