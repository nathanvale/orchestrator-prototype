---
description: >-
  [Describe skill scope and pattern coverage]
use-when: >-
  [Trigger phrases and intent detection]
allowed-tools: Read, Glob, Grep
---

# [Skill Name]

A Higher-Order Prompt (HOP). This skill never generates content directly.
It classifies intent, loads mode + pattern + voice parameters, and synthesizes
responses by applying a mode’s template to pattern and voice slots.

## Step 1: Classify Mode

| Query Signals | Mode | Read |
|---|---|---|
| [signals] | [mode] | [mode file] |
| (no clear signal) | [default mode] | [default mode file] |
| (empty arguments) | -- | [zero state response] |

## Step 2: Classify Pattern

| Keywords | Pattern | Read |
|---|---|---|
| [keywords] | [pattern] | [pattern file] |
| (no pattern match) | -- | [ask for clarification] |
| (multiple patterns) | -- | [disambiguate] |

## Step 3: Load Parameters and Synthesize

1. Read the mode file.
2. Read the pattern file(s).
3. Read the voice file referenced by the mode’s `Voice ID`.
4. Follow the mode’s `Synthesis Template` and substitute slots from the
   pattern file(s) and voice file, using `{{pattern.<slot_key>}}`,
   `{{patterns[i].<slot_key>}}`, and `{{voice.<slot_key>}}`.
5. Do not invent pattern or voice content. Only transform and reformat the slot data.

## Errors and Fallbacks

- Pattern not found: [behavior]
- Ambiguous mode: [behavior]
- Multiple patterns: [behavior]

## What This Skill Does NOT Do

- [non-goals]
