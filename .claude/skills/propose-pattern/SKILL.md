---
name: propose-pattern
description: Research and add a new pattern to the proposed-patterns library
argument-hint: "[pattern name or topic]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(*), Task, Skill
---

# Propose Pattern

A guided workflow for researching, drafting, and adding a new pattern to the
proposed-patterns library at `.claude/references/proposed-patterns/`.

This skill performs writes -- it creates a new pattern file. It must not be
auto-invoked by Claude.

---

## Step 0: Zero-state

If $ARGUMENTS is empty, emit usage and stop:

```
Propose Pattern -- research and add a new agentic pattern to the library

Usage:
  /propose-pattern "<pattern name or brief description>"

Examples:
  /propose-pattern "command vs skill routing"
  /propose-pattern "arena mode for competitive agent evaluation"
  /propose-pattern "cooperative refinement between agents"

This will:
  1. Brainstorm and confirm the pattern with you
  2. Research source anchors (docs, posts, talks)
  3. Draft the pattern following the 11-section template
  4. Review with you before writing the file
```

## Step 1: Load the template

Read any one existing pattern to use as the structural template:

```
.claude/references/proposed-patterns/pattern-context-engineering.md
```

This gives you the exact frontmatter format (slug, display_name, one_liner,
intel_date, slots) and the 11 required sections. Every new pattern must match
this structure exactly.

## Step 2: Brainstorm and confirm

Present a brief brainstorm to the user covering:

1. **Proposed slug** -- kebab-case identifier (e.g., `command-vs-skill-routing`)
2. **Proposed display name** -- human-readable (e.g., "Command vs Skill Routing")
3. **Draft one-liner** -- single sentence capturing the core insight
4. **When to use** -- 3-5 bullet points for when this pattern applies
5. **Related patterns** -- which existing patterns in the library connect to this one

Check existing patterns for overlap:

```bash
ls .claude/references/proposed-patterns/
```

If a pattern with a similar slug or topic already exists, flag it. The user
may want to update the existing pattern instead of creating a new one.

**Do NOT proceed without explicit user confirmation.** The user may want to
refine the slug, one-liner, or scope before research begins.

## Step 3: Research source anchors

Every pattern needs concrete evidence -- not theoretical speculation.

### 3a: Dispatch newsroom research

Invoke `/newsroom:investigate` to gather engagement-ranked community
intelligence and web research in a single pass:

```
/newsroom:investigate "<pattern name>" AND "<related keywords>"
```

For example, for a pattern about "command vs skill routing":
```
/newsroom:investigate "claude code skills" AND "slash commands" AND "SKILL.md"
```

The newsroom handles the full research pipeline internally:
- **Reddit, X, YouTube** -- real engagement metrics (upvotes, likes, reposts)
- **Web search** -- official docs, blog posts, talks (via `--include-web`)
- **Deduplication and ranking** -- engagement-scored, time-constrained

Extract the highest-signal results as source anchors. Include engagement
metrics in the anchor description (e.g., "1,441 likes, 138 reposts").

**Source types to prioritize from results:**

1. **Official documentation** -- Anthropic docs, framework docs, API references
2. **Talks and presentations** -- YouTube links with speaker quotes
3. **Blog posts** -- from practitioners, framework authors, or companies
4. **Community discussions** -- Reddit threads, X posts with engagement metrics
5. **Academic papers** -- arXiv, conference proceedings
6. **Practical evidence** -- real repos, commits, or PRs that demonstrate the pattern

### 3b: Source quality check

**Minimum:** 3 source anchors. **Target:** 5-7 source anchors.
**At least 1 must be from community research** (Reddit, X, or YouTube with
engagement data).

If the newsroom results are thin for this topic, tell the user. A pattern
with weak evidence should be flagged as speculative in the one-liner or
Quick Summary.

## Step 4: Draft the pattern

Write the full pattern following the 11-section template exactly:

```yaml
---
slug: <kebab-case>
display_name: "<Human Readable Name>"
one_liner: "<Single sentence -- the core insight>"
intel_date: YYYY-MM-DD
slots:
  pattern_id: "## Pattern ID"
  quick_summary: "## Quick Summary"
  when_to_use: "## When To Use"
  core_mechanism: "## Core Mechanism"
  key_rules: "## Key Rules"
  implementation_notes: "## Implementation Notes"
  failure_modes: "## Failure Modes"
  signals_diagnostics: "## Signals & Diagnostics"
  tradeoffs: "## Tradeoffs"
  related_patterns: "## Related Patterns"
  source_anchors: "## Source Anchors"
---
```

**Section guidelines:**

| Section | What to write | Common mistakes |
|---------|--------------|-----------------|
| Quick Summary | 1-2 paragraphs explaining the pattern. Lead with the core insight. | Too abstract -- ground it in concrete mechanism |
| When To Use | Bullet list of specific situations | Too vague -- "when you need better code" is not useful |
| Core Mechanism | The how -- concrete steps, diagrams, code examples | Missing the mechanism -- describing outcomes not process |
| Key Rules | Numbered list of non-negotiable constraints | Rules that are actually preferences, not constraints |
| Implementation Notes | Practical details, interactions with other patterns | Over-engineering -- keep it grounded in what exists |
| Failure Modes | Bullet list of what goes wrong and why | Only listing obvious failures -- dig into subtle ones |
| Signals & Diagnostics | Three sub-bullets: needed, working, failing | Signals that are impossible to observe |
| Tradeoffs | Gain paragraph, Cost paragraph | Listing only gains -- every pattern has real costs |
| Related Patterns | Bullet list with slug and relationship description | Listing unrelated patterns for completeness |
| Source Anchors | Bullet list with URLs and evidence descriptions | Broken links, missing descriptions, no direct quotes |

**Writing style:**
- Technical and precise -- explain the "why" not just the "what"
- No em dashes (use -- double hyphens instead)
- Concrete examples over abstract descriptions
- Direct quotes from sources where available

## Step 5: Review with user

Present the complete draft to the user. Highlight:

- The one-liner (most important -- sets the frame for the whole pattern)
- Source anchors (are they strong enough?)
- Related patterns (did we miss connections?)

**Do NOT write the file without explicit user approval.**

The user may want to:
- Refine the one-liner
- Add or remove source anchors
- Adjust the scope (too broad? too narrow?)
- Merge with an existing pattern instead

## Step 6: Write the file

Once approved, write the pattern file:

```
.claude/references/proposed-patterns/pattern-<slug>.md
```

**Filename convention:** `pattern-` prefix + slug + `.md`

Verify the file was created:

```bash
ls -la .claude/references/proposed-patterns/pattern-<slug>.md
```

Report the final file path and pattern count:

```bash
ls .claude/references/proposed-patterns/ | wc -l
```

---

## Quality Checklist

Before writing the file, verify:

- [ ] Frontmatter has all required fields (slug, display_name, one_liner, intel_date, slots)
- [ ] All 11 sections are present with correct headings
- [ ] Slug matches the filename (`pattern-<slug>.md`)
- [ ] One-liner is a single sentence (not a paragraph)
- [ ] Source anchors have working URLs and evidence descriptions
- [ ] Related patterns reference slugs that exist in the library
- [ ] No em dashes (-- only)
- [ ] User explicitly approved the draft
