---
date: 2026-02-21
topic: agentic-dojo-skill
---

# Agentic Dojo: A Pattern Knowledge Skill for Orchestration

## What We're Building

A Claude Code skill that packages all the orchestration patterns from this repo (stages 1-3 and beyond) into a router-based knowledge system with five interaction modes. It serves both humans learning agentic coding patterns AND agents that need pattern guidance during execution.

The skill uses progressive disclosure -- a lightweight router loads first, identifies the relevant pattern and mode, then loads only the needed reference material. This keeps context lean while giving access to the full knowledge base.

**Audience:** Anyone who clones the repo and checks out the branch. Eventually lives in the SideQuest plugins repo as a standalone plugin (alongside enterprise, git, newsroom plugins).

## Why This Approach

We considered three approaches:

- **Multi-command** (separate `/pattern:dag`, `/pattern:retry` etc.) -- too many entry points, cognitive overhead for users
- **Background knowledge** (always-loaded context) -- too expensive token-wise for 9+ patterns, wastes context on irrelevant content
- **Router-style with modes** (chosen) -- single entry point, progressive disclosure, mode selection based on intent

Router wins because:
1. Matches how both humans and agents naturally interact ("explain X", "quiz me on Y", "help me build Z")
2. Aligns with Anthropic's official progressive disclosure architecture (three-tier: frontmatter -> SKILL.md -> references)
3. No one in the community is doing multi-mode skills yet -- this would be novel
4. Single entry point reduces cognitive load (ADHD-friendly)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Skill name | `agentic-dojo` | Broad enough for all agentic patterns, not just orchestration |
| Architecture | Router-style with progressive disclosure | Matches Anthropic best practices, token-efficient |
| Location (now) | `.claude/skills/agentic-dojo/` in this repo | Prototype here, extract to SideQuest plugin later (same philosophy as orchestrator itself) |
| Location (future) | `side-quest-plugins/plugins/agentic-dojo/` | Fourth plugin alongside enterprise, git, newsroom |
| SKILL.md size | Under 500 lines (Anthropic recommendation) | Router + pattern index + mode detection rules only |
| Reference depth | One level deep from SKILL.md | Official docs warn against nested references -- Claude may partially read nested files |
| Branch | Experimental branch off `stage/3-full` | Play with it without affecting the main stage progression |
| Mode routing | Conditional workflow pattern in SKILL.md | Uses Anthropic's recommended "determine type -> follow workflow" pattern |

## The Five Modes

Each mode has a character voice that sets the tone. The character doesn't roleplay -- they inform the output style, pacing, and personality of how the dojo delivers knowledge.

### 1. Sensei -- Mr. Miyagi (The Karate Kid)

**Trigger phrases:** "explain", "why does", "teach me", "how does X work"

Patient, wise, teaches through metaphor and indirection. Never rushes. Makes you feel like the answer was inside you all along. Drops a profound one-liner when you least expect it.

**Voice:** "Wax on, wax off" -- starts with something that seems unrelated, then reveals the connection. Uses everyday analogies to explain complex orchestration concepts. Ends with a quiet insight that reframes everything.

**Output style:**
1. Open with an analogy or metaphor (the "wax on" moment)
2. Build the concept layer by layer, patient pacing
3. Concrete example from the codebase
4. Close with a "Miyagi moment" -- a one-line insight that clicks everything into place

### 2. Sparring -- Morpheus (The Matrix)

**Trigger phrases:** "quiz me", "test my knowledge", "challenge me on"

Pushes you. Challenges your assumptions. Believes in your potential but won't let you coast. Creates scenarios where you have to think, not just recall.

**Voice:** "Stop trying to hit me and hit me." -- poses a scenario, waits for your answer, then reveals what you missed. Never mean, always purposeful. When you get it right, acknowledges it with quiet respect.

**Output style:**
1. Set the scene -- a real-world orchestration scenario with a twist
2. Ask: "What pattern applies here? What would you do?"
3. Wait for answer (interactive)
4. Reveal the answer with "What if I told you..." reframe
5. Score and explain what was missed or nailed

**Note:** Could use `context: fork` to run in a subagent for isolation, or `disable-model-invocation: true` to be user-invoked only.

### 3. Kata -- Uncle Iroh (Avatar: The Last Airbender)

**Trigger phrases:** "show me the pattern for", "kata", "example of"

Demonstrates the form with warmth and philosophy. Explains not just the technique but the principle behind it. Encourages you to try it yourself, gently corrects your form.

**Voice:** "Lightning is a pure expression of firebending, without aggression." -- shows you the canonical form, explains the philosophy that makes it work, then invites you to practice with a challenge that stretches you just enough.

**Output style:**
1. Name the pattern and its philosophy (the "why it exists")
2. Show the canonical form -- annotated example with callouts
3. Explain the key moves -- what makes this pattern work
4. Practice challenge: "Now, try this..." -- a variation that tests understanding
5. Close with an encouraging Iroh-ism

### 4. Buddy -- Scotty (Star Trek)

**Trigger phrases:** "I'm building", "help me implement", "troubleshooting", "my workflow isn't"

Hands-on engineer in the trenches with you. Pragmatic, a little exasperated by impossible deadlines but always delivers. Rolls up sleeves and gets to work.

**Voice:** "I'm giving her all she's got, Captain!" -- diagnoses the problem fast, suggests the practical fix, warns you about the gotchas. No theory lectures mid-crisis. Celebrates when it works.

**Output style:**
1. Diagnose: "Alright, let me take a look at what we've got here..."
2. Ask targeted diagnostic questions (no more than 2-3)
3. Concrete fix grounded in the relevant pattern
4. Gotcha warnings: "She cannae take much more of this" -- edge cases to watch for
5. Verification step: how to confirm it's working

### 5. Reference -- JARVIS (Iron Man)

**Trigger phrases:** "what's the pattern for", "best practice for", "how should I handle"

Crisp, efficient, anticipates what you need. No personality overhead -- just the answer, precisely delivered. Occasionally dry wit.

**Voice:** "The Mark VII is not ready for deployment, sir." -- delivers exactly what was asked, structured for fast scanning. Adds a brief recommendation if relevant. Designed for agents and humans who need the answer NOW.

**Output style:**
1. Pattern name and one-sentence summary
2. Key rules (3-5 bullets, scannable)
3. Quick example (minimal, just enough to apply)
4. "See also:" pointer to related patterns
5. Optional dry JARVIS aside if something is worth flagging

## Knowledge Base (Stage 1-3 Content)

The skill draws from these pattern documents:

| Pattern | Stage | Source File |
|---------|-------|-------------|
| Builder/Validator | 1 | `docs/patterns/builder-validator.md` |
| Dispatch Loop | 1 | `docs/patterns/dispatch-loop.md` |
| Higher-Order Prompt (HOP) | 1 | `docs/patterns/higher-order-prompt.md` |
| Task DAG | 2 | `docs/patterns/task-dag.md` |
| Wave Computation | 2 | `docs/patterns/wave-computation.md` |
| Spec as Source of Truth | 2 | `docs/patterns/spec-as-source-of-truth.md` |
| Retry with Resume | 3 | `docs/patterns/retry-with-resume.md` |
| Fast Path Gate | 3 | `docs/patterns/fast-path-gate.md` |
| Iterative Refinement | 3 | `docs/patterns/iterative-refinement.md` |

Plus core implementation files:
- `.claude/skills/orchestrator/SKILL.md` -- The HOP orchestration engine itself
- `.claude/skills/orchestrator/references/dag-execution.md` -- DAG execution reference
- `.claude/agents/builder.md` and `validator.md` -- Agent definitions
- `specs/master-plan.md` -- Architecture and design decisions

Future stages (4-9) will add: Team Profiles, Difficulty Routing, HITL Protocol, Hydration Pattern, Parallel Dispatch, Worktree Isolation, Browser Validation.

## Skill Architecture

```
.claude/skills/agentic-dojo/
  SKILL.md                    # Router (under 500 lines)
  references/                 # All one level deep from SKILL.md
    modes/
      sensei.md               # Teaching output format and guidelines
      sparring.md             # Quiz/challenge format and question bank
      kata.md                 # Pattern template + practice challenge format
      buddy.md                # Coding companion guidelines
      reference.md            # Quick lookup format
    patterns/
      builder-validator.md    # Adapted from docs/patterns/ for skill consumption
      dispatch-loop.md
      higher-order-prompt.md
      task-dag.md
      wave-computation.md
      spec-as-source-of-truth.md
      retry-with-resume.md
      fast-path-gate.md
      iterative-refinement.md
    concepts/
      architecture.md         # Overall system architecture, how patterns connect
      glossary.md             # Key terms: HOP, wave, DAG, spec file, etc.
```

## Progressive Disclosure Flow

Follows Anthropic's three-tier architecture:

1. **Tier 1 (frontmatter):** Name + description loaded at startup (~100 tokens). Claude sees "agentic-dojo: Pattern knowledge for orchestration. Use when asked about agentic patterns, orchestration, dispatch, DAG, retry, HOP..."
2. **Tier 2 (SKILL.md body):** Loaded when skill is triggered. Contains pattern index, mode detection rules, conditional workflow router. Under 500 lines.
3. **Tier 3 (references/):** Loaded on-demand. Zero context cost until accessed. Claude reads only the specific mode + pattern files needed.

**Router flow:**
1. User invokes skill (via `/dojo` command or Claude auto-detects relevance)
2. SKILL.md loads -- has pattern index and mode detection conditional workflow
3. Router identifies: which pattern? which mode?
4. Loads `references/patterns/<pattern>.md` for content
5. Loads `references/modes/<mode>.md` for output style guidelines
6. Generates response in the mode's output style, grounded in the pattern content

## Research Findings

### Community Sentiment (Feb 2026)

**Course-inside-terminal pattern is trending.** Delba Oliveira (Next.js team) built a course using Claude Code skills with `/course [next]` progression -- skills for creating lessons, reviewing, and teaching inside the terminal. 245 likes. This validates the dojo teaching approach.

**Anthropic's 33-page skills guide** caused a stir (2,400+ likes on X). Key takeaway: progressive disclosure is THE core design principle. Three tiers, SKILL.md under 500 lines, references one level deep.

**No one is doing multi-mode router skills yet.** The community builds single-purpose skills. A router that detects both mode AND pattern would be novel.

**Flare AI Skills** (193 likes) introduced Claude Code-compatible skills as "specialized domain knowledge" -- validates the knowledge-base-as-skill pattern.

### Official Best Practices Applied

| Anthropic Guideline | How We Apply It |
|---------------------|-----------------|
| SKILL.md under 500 lines | Router + index only, all content in references/ |
| References one level deep | All pattern and mode docs link directly from SKILL.md |
| Domain-specific organization | `references/patterns/` and `references/modes/` directories |
| Conditional workflow pattern | Mode detection: "Determine type -> follow workflow" |
| `$ARGUMENTS` substitution | `/dojo retry-with-resume` passes pattern name directly |
| Concise descriptions (third person) | "Pattern knowledge for agentic orchestration. Use when..." |
| Imperative language in instructions | "Analyze the query. Identify the pattern. Load the reference." |
| Test with haiku, sonnet, opus | Buddy mode needs sonnet/opus; Reference mode works with haiku |

### Output Styles vs Skills (Critical Architecture Decision)

Claude Code has a separate **output styles** system (`/output-style`) that replaces the system prompt globally. This is NOT what we want for the dojo. Key distinctions:

| Feature | Scope | Mechanism | Our Use |
|---------|-------|-----------|---------|
| **Output Styles** | Global, always active | Replaces system prompt | NOT used -- too broad |
| **Skills** | Per-invocation, on-demand | Additive instructions | YES -- character voices live here |
| **CLAUDE.md** | Always loaded | Additive user message | NOT used for voices |

**Decision:** Character voices (Miyagi, Morpheus, Iroh, Scotty, JARVIS) live inside each mode's reference file (`references/modes/sensei.md` etc.), NOT as output styles. This scopes the voice to when the dojo is active, and different per mode. Output styles would override everything globally -- we want surgical, per-mode personality injection.

**Built-in output styles we can learn from:**
- **Explanatory** style provides "Insights" between tasks -- our Sensei mode does this with Miyagi's voice
- **Learning** style adds `TODO(human)` markers for the user to implement -- our Kata (Iroh) mode should borrow this pattern for practice challenges
- Custom styles are just markdown files with frontmatter in `~/.claude/output-styles/` -- simple format we can reference

**Community validation:** People are building wild custom output styles (Zen Master, Existentialist Poet, Door-to-Door Vim Salesman). Character-voiced modes will resonate. One user (@carlvellotti) built a skill that learns your writing voice permanently. Another (@builtbynikos) reskinned Claude Code with a custom personality injected per-prompt.

### Sources

- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) -- Anthropic official
- [Extend Claude with skills](https://code.claude.com/docs/en/skills) -- Claude Code docs
- [Output styles - Claude Code Docs](https://code.claude.com/docs/en/output-styles) -- Output style system
- [awesome-claude-code-output-styles](https://github.com/hesreallyhim/awesome-claude-code-output-styles-that-i-really-like) -- Community styles
- [Claude Agent Skills: First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Skill Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) -- docs-to-skills converter
- [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) -- community collection
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) -- 380+ skills catalog
- [The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) -- Anthropic PDF (33 pages)

## Open Questions (for Planning Phase)

- **Belt/level system:** Should Sensei mode have progressive levels (white belt = dispatch, black belt = HOP parameterization)? Defer to v2.
- **Cross-pattern connections:** How to handle questions spanning multiple patterns ("how do retry and wave computation interact?")? Likely load both pattern refs.
- **Agent-to-agent protocol:** Should Reference mode output structured JSON for machine consumption? Explore during implementation.
- **Sparring isolation:** Should Sparring mode use `context: fork` for subagent isolation? Test both approaches.

## Next Steps

-> `/workflows:plan` for implementation details

1. Create experimental branch from `stage/3-full`
2. Build the SKILL.md router with mode detection and pattern index
3. Create mode reference files (sensei, sparring, kata, buddy, reference)
4. Adapt existing 9 pattern docs into skill reference format
5. Create concepts/architecture.md and concepts/glossary.md
6. Test with representative queries across all five modes
7. Iterate based on observed Claude navigation patterns
