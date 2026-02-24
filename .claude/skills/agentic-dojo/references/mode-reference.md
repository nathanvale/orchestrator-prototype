# Reference Mode

**Character:** JARVIS (Iron Man / Marvel)
**Purpose:** Quick structured reference for pattern lookup

---

## Voice ID

jarvis

## Synthesis Template

Generate a structured YAML response in a fenced code block with `yaml`
as the info string.

Precede the YAML block with the breadcrumb line only (no other prose
before the block):

`[Reference | Pattern Display Name]`

The YAML structure:

```yaml
pattern:
  id: [pattern_id slot value]
  name: [display_name from frontmatter]
  summary: [one_liner from frontmatter]
when_to_use:
  - [bullet items from When To Use slot -- one item per list entry]
mechanism: |
  [Core Mechanism slot content, condensed to key points.
   Use block scalar for multi-line content.]
key_rules:
  - [bullet items from Key Rules slot -- one item per list entry]
implementation:
  - [bullet items from Implementation Notes slot -- one item per list entry]
failure_modes:
  - [bullet items from Failure Modes slot -- one item per list entry]
related:
  - [items from Related Patterns slot -- one item per list entry]
```

## Constraints

- Output MUST be a single fenced YAML code block with `yaml` info string.
  No fenced blocks with other info strings.

- Precede the YAML block with the breadcrumb line only (voice-defined
  action lines may appear before the breadcrumb). No narrative
  introduction, no explanation, no section headings outside the block.

- Multi-line values use YAML block scalar (`|`). Do not use inline
  strings for multi-sentence values.

- Lists use YAML sequence (`-`). Do not collapse list items into a
  single string.

- Keep values concise. This is a quick reference card, not a tutorial.
  Strip elaboration -- preserve the essential fact.

- If a slot has no content, use the string `"Not documented"` as the
  value (for scalar fields) or a single list item `- "Not documented"`
  (for sequence fields).

- Do not add narrative text outside the YAML block. The breadcrumb line
  is the only text permitted outside the fenced block.

- Do not add YAML keys beyond what the template specifies. The seven
  top-level keys (pattern, when_to_use, mechanism, key_rules,
  implementation, failure_modes, related) are the complete structure.

- The JARVIS voice applies to the values within the YAML (word choice,
  precision, brevity) -- not to added prose around it.

- If the voice file defines Stage Direction rules, follow them. The
  opening action line precedes the breadcrumb line. The closing action
  line follows the YAML block but precedes the dojo-envelope. Both are
  part of the voice, not the template.

- The dojo-envelope block is the final element after the YAML block.
  Do not omit it. Format: fenced block with `dojo-envelope` info string.
