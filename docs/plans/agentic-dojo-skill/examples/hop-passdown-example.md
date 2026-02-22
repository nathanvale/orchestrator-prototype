# HOP Passdown Example

This example shows a full passdown from SKILL.md to mode + voice + pattern.

## 1) Input

User: "Explain wave computation"

## 2) Classification

- Mode: `sensei`
- Pattern: `wave-computation`

## 3) Files Loaded

- Mode: `mode-sensei.md`
- Voice: `voice-miyagi.md` (from `Voice ID` in mode)
- Pattern: `pattern-wave-computation.md`

## 4) Slots Extracted

Mode:
- `voice_id`: `miyagi`
- `output_format`: Opening analogy → Concept → Steps → Pitfalls → Related
- `synthesis_template`: uses `{{pattern.*}}` and `{{voice.*}}`

Voice:
- `voice_rules`: calm, metaphor-driven
- `pacing`: short, steady
- `lexicon`: balance, path, practice
- `quote_policy`: paraphrase only; short quote max 10 words

Pattern:
- `quick_summary`
- `core_mechanism`
- `implementation_notes`
- `failure_modes`
- `related_patterns`

## 5) Template Execution (Minimal)

Template snippet:
- Summary: `{{pattern.quick_summary}}`
- Concept: `{{pattern.core_mechanism}}`
- Steps: `{{pattern.implementation_notes}}`
- Pitfalls: `{{pattern.failure_modes}}`
- Related: `{{pattern.related_patterns}}`
- Voice: apply `{{voice.voice_rules}}` and `{{voice.pacing}}`

## 6) Output Contract

- Respect mode output format order.
- Apply voice tone and pacing.
- Do not invent pattern details.
- If any slot is missing, follow `Fallbacks` in the mode file.

## 7) Reference Mode YAML Example

If the mode is `reference`, the response begins with a YAML block:

```yaml
pattern: wave-computation
stage: 3
rules:
  - Each wave has a purpose and exit criteria
  - Later waves cannot change earlier inputs without justification
  - Stop when exit criteria are met
see-also:
  - iterative-refinement
  - retry-with-resume
```
