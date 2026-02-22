# HOP Slot Contract Specification (Template)

## Purpose
Defines the interface between pattern files, mode files, and voice files, and the constraints SKILL.md must follow.

## How To Use the HOP

1. **Classify** the user request into a mode and a pattern.
2. **Load** the mode file, pattern file, and the voice file referenced by the mode’s `Voice ID`.
3. **Extract** slots from each file using the H2 headings (pattern/voice) and mode sections.
4. **Synthesize** by executing the mode’s `Synthesis Template`, substituting `{{pattern.*}}`, `{{patterns[i].*}}`, and `{{voice.*}}`.
5. **Constrain** output using mode constraints and voice quote policy.
6. **Fallback** when a required slot is missing by using the mode’s `Fallbacks`.

## Pattern File Schema

**File name:** `pattern-<slug>.md`

**Required H2 sections (exact text):**
- `## Pattern ID`
- `## Quick Summary`
- `## When To Use`
- `## Core Mechanism`
- `## Key Rules`
- `## Implementation Notes`
- `## Failure Modes`
- `## Signals & Diagnostics`
- `## Tradeoffs`
- `## Related Patterns`
- `## Source Anchors`

**Optional H2 sections (exact text):**
- `## Variations`
- `## Anti-Patterns`
- `## Example`
- `## Glossary`
- `## Challenge Seed`

**Slot boundary rule:**
- Each slot is the content under its H2 heading until the next H2.

**Content expectations:**
- `Pattern ID`: `<slug> — <title>`
- `Quick Summary`: 2–4 lines, no bullets
- `When To Use`: 3–7 bullet triggers
- `Core Mechanism`: 3–6 sentences
- `Key Rules`: bullet list of enforceable rules
- `Implementation Notes`: practical usage notes
- `Failure Modes`: 3–6 bullet pitfalls
- `Signals & Diagnostics`: observables for success/failure
- `Tradeoffs`: bullet list of pros/cons
- `Related Patterns`: table `Pattern | Relation | Why`
- `Source Anchors`: references/provenance bullets

## Mode File Schema

**File name:** `mode-<name>.md`

**Required H2 sections (exact text):**
- `## Mode ID`
- `## Voice ID`
- `## Output Format`
- `## Synthesis Template`
- `## Constraints`
- `## Fallbacks`

**Slot reference syntax:**
- Single pattern: `{{pattern.<slot_key>}}`
- Multi-pattern: `{{patterns[1].<slot_key>}}` … `{{patterns[3].<slot_key>}}`

**Slot key mapping:**
- Convert H2 heading text to `snake_case`.
- Example: `Signals & Diagnostics` → `signals_diagnostics`.

## SKILL.md Contract

**Must do:**
1. Classify intent (skill-specific logic).
2. Choose mode + pattern file(s) + voice file.
3. Read those files.
4. Execute the mode’s synthesis template by substituting slot references.

**Must NOT do:**
- Output formatting logic beyond invoking the template.
- Voice or structure instructions.
- Ranking logic inside synthesis.

## Voice File Schema

**File name:** `voice-<id>.md`

**Required H2 sections (exact text):**
- `## Voice ID`
- `## Character Reference`
- `## Voice Rules`
- `## Pacing`
- `## Lexicon`
- `## Do / Don't`
- `## Quote Policy`

**Optional H2 sections (exact text):**
- `## Signature Phrases`
- `## Substitutions`

**Slot reference syntax:**
- `{{voice.<slot_key>}}`

**Quote policy guidance:**
- Prefer paraphrase and cadence.
- If quoting, keep it short (<= 10 words) and sparse.

## Voice Mapping (Default)

| Mode | Voice ID | Pop Culture Anchor | Why It Fits | Quote Policy |
|---|---|---|---|---|
| Sensei | miyagi | Mr. Miyagi (Karate Kid) | Patient, metaphor-driven teaching | Brief paraphrase; max 1 short quote |
| Sparring | morpheus | Morpheus (The Matrix) | Provocative challenge, tests assumptions | No direct quotes; cadence only |
| Kata | po | Po (Kung Fu Panda) | Playful practice, incremental improvement | No direct quotes |
| Buddy | scotty | Scotty (Star Trek) | Practical engineer, constraints + fixes | No direct quotes; practical tone |
| Reference | jarvis | JARVIS (Iron Man) | Terse, structured, machine-friendly | No quotes; purely factual |

## Example (Minimal)

**Pattern:**
```md
## Quick Summary
{{pattern.quick_summary}}
```

**Mode:**
```md
## Synthesis Template
Use Summary: {{pattern.quick_summary}}
```
