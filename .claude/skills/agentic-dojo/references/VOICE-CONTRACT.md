# Voice Contract

How to write a voice file for the Agentic Dojo.

---

## File Location

`.claude/skills/agentic-dojo/references/voice-<id>.md`

Where `<id>` is a lowercase single-word identifier (e.g., `miyagi`, `jarvis`).

## Required Sections

Every voice file must contain these 8 sections in order:

### 1. Header

Top of the file, before the first `---` rule.

- `# <Name> Voice` -- the H1 title
- `**Character:**` -- the pop culture anchor and franchise
- `**Purpose:**` -- one line describing the voice's role

### 2. Voice Rules

How the voice sounds. Persona stance, tone, authority source,
how it addresses the reader. This section sets the overall personality.

### 3. Pacing

Sentence length rules, rhythm, cadence constraints. Controls
the mechanical feel of the prose -- fast and clipped, or slow
and deliberate.

### 4. Lexicon

Preferred vocabulary organized by domain. Lists the word pools
the voice draws from. Each domain is a short label followed by
example terms.

### 5. Substitutions

A lookup table of word replacements. Two columns: "Instead of"
and "Use". These are soft constraints -- the voice prefers the
replacement but does not break if the original appears.

### 6. Do / Don't

Actionable voice constraints as two lists:
- **Always:** things the voice must do in every response
- **Never:** things the voice must never do

### 7. Quote Policy

How to handle source material from the character's franchise.
Typically: paraphrase only, no direct quotes. Channel the spirit,
not the specific words.

### 8. Stage Direction

Opening Beat, Closing Beat, and When NOT to Use rules. Stage
directions are italicized action lines that frame a response --
they set a physical or system scene before teaching begins and
return to stillness before closing.

Required subsections:
- General rules (format, verbs, props, length, pattern-awareness)
- Examples (3-5 mapped to specific patterns)
- `### Opening Beat` -- when and where it appears
- `### Closing Beat` -- when and where it appears
- `### When NOT to Use` -- explicit exclusions

## Separation of Concerns

- **Voice files** own the style of action lines: imagery, props,
  verbs, and pattern-awareness rules.
- **Mode files** own the placement and count: how many action lines
  are allowed and where they sit relative to structural elements.

A voice author defines WHAT action lines look like. The mode author
defines WHERE and HOW MANY appear. Neither should override the other.

## Connecting to a Mode

For a voice to be used, a mode file must reference it:

1. Set `## Voice ID` in the mode file to match the voice's `<id>`
2. Add a constraint: "Write in the <name> voice as declared in
   `voice-<id>.md`. The voice file rules take precedence over any
   stylistic instincts."

## Authoring Checklist

Before submitting a new voice file:

- [ ] All 8 sections present in order
- [ ] Header has Character and Purpose fields
- [ ] Substitutions table has at least 8 entries
- [ ] Do / Don't has at least 4 items in each list
- [ ] Stage Direction has 3-5 pattern-mapped examples
- [ ] Opening Beat and Closing Beat subsections are present
- [ ] When NOT to Use subsection is present
- [ ] File named `voice-<id>.md` in the references directory
- [ ] At least one mode file references this voice ID
- [ ] Test: invoke the skill in both Sensei and Reference modes and
  verify the voice is applied correctly
