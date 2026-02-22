# Community Research Report: Prompt Engineering for the Agentic Dojo

**Date:** 2026-02-22
**Scope:** What the community and research say about the patterns used in the agentic-dojo skill plan
**Beats:** 3 (skill architecture, persona/voice engineering, prompt routing/classification)
**Related plan:** [`2026-02-21-feat-agentic-dojo-skill-plan.md`](../2026-02-21-feat-agentic-dojo-skill-plan.md)
**Related hardening:** [hardening-plan.md](hardening-plan.md)

---

## Beat 1: Claude Code Skill Architecture

**Headline:** The dojo's HOP pattern is ahead of the curve. Nobody in the community has publicly codified slot-based template systems, voice/mode file architectures, or skills-that-orchestrate-skills.

### What Validates the Plan

| Plan Element | Community/Research Validation | Plan Reference |
|---|---|---|
| Three-tier progressive disclosure (frontmatter -> SKILL.md -> references) | Anthropic's official best practices document this exact pattern. Benchmarks: reduced clarifying questions from 15 to 2, token consumption from 12,000 to 6,000 | [SKILL.md template](../templates/skill.template.md), Plan Phase 1 |
| Flat `references/` directory | Anthropic's one-level-deep rule: "Never nest references. Claude uses `head -100` previews on nested files and misses content" | Plan finding #7 (shared pattern library architecture) |
| Table-based classification routing | Pattern 4 in the 33-page guide uses decision tables. Community consensus: "table-based classification outperforms prose conditionals" | [Main plan](../2026-02-21-feat-agentic-dojo-skill-plan.md) lines 133-134, SKILL.md Steps 1-2 |
| Domain-segmented reference files | Official docs recommend per-domain reference files with SKILL.md as routing table. Closest documented analog to the dojo's pattern/mode/voice file separation | Plan finding #7 (architecture) |
| `allowed-tools: Read, Glob, Grep` in frontmatter | Official docs: permission boundary as architecture. Skills can pre-approve specific tool permissions | [Main plan](../2026-02-21-feat-agentic-dojo-skill-plan.md) conventions table |
| Shift from "prompt engineering" to "context engineering" | Community framing across X (3,900+ likes on @Hartdrawss thread). Skills treated as runtime modules with version control and testability | Aligns with the dojo treating pattern files as versioned content parameters |

### What Has No Precedent (Novel)

| Plan Element | Status | Implication |
|---|---|---|
| Slot-based template system (`{{pattern.*}}` substitution) | Not documented in official material or community. No public precedent | Cannot validate against existing implementations -- must test empirically |
| Voice/mode files as distinct architectural layer | Not found in any community skill. Closest: Anthropic's `skill-creator` meta-skill | The hardening plan's worked example (N4) is critical for teaching Claude the pattern |
| HOP: skills orchestrating other prompts (not tools) | Not present in official docs. The orchestrator-prototype is architecturally novel | Higher risk of unexpected behavior -- the synthesis step has no community reference implementation |

### Community Debate: What Are Skills For?

The SciCraft thread (r/ClaudeAI, 4 comments) surfaced a tension: one camp says skills augment LLM domain knowledge, another says skills encode repeatable workflow procedures. The dojo is both -- a knowledge system (pattern content) delivered through a workflow procedure (HOP routing). This dual nature is not addressed in any community guidance.

**Relevance to plan:** The [main plan's "What This Skill Does NOT Do"](../2026-02-21-feat-agentic-dojo-skill-plan.md) section should clarify: "This skill teaches patterns (knowledge). It does not execute orchestration (workflow). For execution, use `/orchestrate`."

---

## Beat 2: Persona/Voice Engineering

**Headline:** Research says persona fails for accuracy but works for voice/style. The dojo uses voice files for STYLE only -- the research supports this.

### Research Findings

| Finding | Source | Relevance to Plan |
|---|---|---|
| "Adding personas in system prompts does not improve model performance" for factual tasks | arxiv (2024, 4 model families, thousands of questions) | The dojo's voice files don't aim to improve accuracy. They shape tone. The HOP separation (pattern file = what, voice file = how) is the correct architecture |
| Specificity is the actual lever. Generic "act as expert" = weak. Detailed constraints = strong | @godofprompt (2,707 likes), ExpertPrompting paper | Voice files with lexicon tables, pacing rules, substitution maps ([voice-miyagi.md](../voices/voice-miyagi.md), [voice-jarvis.md](../voices/voice-jarvis.md)) are the specific kind that works |
| Chain-of-Thought consistently beats role prompting on reasoning benchmarks | learnprompting.org (2,000 MMLU questions, GPT-4-turbo) | Confirms: don't use voice to improve reasoning. Use it only for presentation style |
| "Idiot" persona outperformed "Genius" persona by 2.2% on factual tasks | learnprompting.org | Further evidence that persona identity doesn't help accuracy. Content comes from slots, not voice |
| Prefilling for character reinforcement is deprecated in Claude 4.5/4.6 | Anthropic docs | The dojo's approach (voice constraints in loaded reference files) is the current correct pattern |
| LLM-generated detailed personas outperform hand-written ones | ExpertPrompting paper | Not directly applicable -- the dojo's voices are hand-crafted character anchors, not generated expert descriptions |

### Implications for Plan Files

**Voice files are validated but bounded.** The [slot contract spec](../specs/slot-contract-spec.md) already enforces separation: pattern files declare content, voice files declare style. The research confirms this is the right boundary.

**Keep substitution rules as soft hints.** The [hardening plan](hardening-plan.md) (N3, N5) already notes this. Research confirms: word-level substitutions are unreliable. The lookup table format (N5) is better than prose but still a hint, not a contract.

**Don't test voice fidelity in the routing test harness.** Testing that Miyagi sounds like Miyagi requires semantic evaluation, not structural assertion. The [test harness design](hardening-plan.md) correctly focuses on routing (breadcrumbs, envelope structure), not voice quality.

### Risk Flag

The @pascal_bornet post (1,109 likes) frames LLM persona prompting as causing "voice homogenization" -- everyone sounds polished but nobody sounds real. The dojo's distinct character voices (Miyagi = patient/metaphorical, JARVIS = terse/factual) actually counter this concern by creating variety. But be aware the sentiment exists in the community.

---

## Beat 3: Prompt Routing & Classification

**Headline:** The community is moving routing OUT of prompts into dedicated classifiers. The dojo keeps routing IN the prompt. Research says this works for classification IF you use structured formats and few-shot examples.

### Research Findings

| Finding | Source | Relevance to Plan |
|---|---|---|
| Classification prompts are more stable than reasoning prompts (sensitivity 0.25 vs 0.43) | brics-econ.org | The dojo's routing tables are in the safer prompt category |
| Structured formatting (tables, delimiters) outperforms prose for classification | Multiple sources (brics-econ, unite.ai) | Validates the table-based classification in SKILL.md Steps 1-2 |
| Few-shot examples cut prompt sensitivity by ~30% | brics-econ.org | **The worked example (N4) is the single most effective reliability intervention.** Promote from nice-to-have to should-fix |
| LLMs skip steps in long sequential chains (SIFo benchmark) | unite.ai (GPT-4, Claude-3 tested) | Directly validates review findings C4 (steps 3d-3g will fuse). The [hardening plan](hardening-plan.md) collapse to single 3d is the research-backed fix |
| Reliable mitigation: "explicit completeness demands" + "numbered lists with distinct visual separation" | unite.ai | The hardening plan's Step 3 rewrite uses numbered sub-bullets with clear scope |
| Prompt chaining > single long prompts for sequential dependencies | DataCamp, IBM, PromptLayer | The dojo's Step 3 naturally chains via Read tool calls (3a -> 3b -> 3c), which is the correct pattern |
| LLMs resist saying "no match" -- will force-match rather than emit "not found" | OpenAI Community (fuzzy matching thread) | **Critical for error contract.** See action item below |
| Dual-block pattern (prose + appended structured block) preferred for debugging | HN discussion, Anthropic docs | Validates the breadcrumb + envelope sandwich. The [hardening plan's](hardening-plan.md) `dojo-envelope` info string fix (C6) adds the needed disambiguation |
| Reframing as scoring task suppresses false positive matches | OpenAI Community | Consider for v2: have Claude score each pattern 0-100 before routing, rather than binary match/no-match |

### Implications for Plan Files

**1. Promote the worked example from nice-to-have to should-fix.**

The [hardening plan](hardening-plan.md) accepts N4 (worked example in SKILL.md) but doesn't elevate it. The research says few-shot examples are the single most effective reliability intervention for classification prompts -- 30% sensitivity reduction. For a skill whose core function IS classification (route mode + route pattern), this is not optional.

**Affected file:** SKILL.md (add 15-20 line worked example showing full routing chain).
**Hardening plan reference:** N4 already has the example text. Change disposition from nice-to-have to should-fix.

**2. Add explicit "no match" framing to the error contract.**

Research shows LLMs resist emitting "not found." The current [error contract](hardening-plan.md) (finding #13) says "Pattern not found. Did you mean X?" but doesn't explicitly instruct Claude that emitting "not found" is acceptable and expected.

**Add to SKILL.md error section:** "If no pattern in the classification table or alias table matches the input, say so explicitly. Do not force-match a low-confidence result. It is correct to say 'Pattern not found' when no pattern matches."

**Affected files:** SKILL.md error contract section, [hardening plan](hardening-plan.md) finding #13 (C1 error contract update).

**3. The step-skipping research validates the hardening plan's Step 3 collapse.**

The SIFo benchmark confirms: long chains of pure-inference steps (no tool-call boundaries) will be partially followed. The [hardening plan's](hardening-plan.md) decision to collapse steps 3d-3g into a single 3d generation instruction with sub-bullets is exactly what the research recommends: "numbered lists with distinct visual separation" rather than long chains.

**No additional plan change needed.** The hardening plan already has the right fix (C4).

---

## Cross-Reference Index

### Plan files referenced in this report

| File | Location | What's Relevant |
|---|---|---|
| Main plan | [`2026-02-21-feat-agentic-dojo-skill-plan.md`](../2026-02-21-feat-agentic-dojo-skill-plan.md) | Architecture, routing tables, phases |
| Remediation plan | [`2026-02-21-feat-agentic-dojo-skill-plan.md`](../2026-02-21-feat-agentic-dojo-skill-plan.md) | All 18 findings merged into main plan |
| Hardening plan | [`hardening-plan.md`](hardening-plan.md) | Triage decisions informed by this research |
| Slot contract spec | [`specs/slot-contract-spec.md`](../specs/slot-contract-spec.md) | Pattern/mode/voice separation validated by persona research |
| SKILL.md template | [`templates/skill.template.md`](../templates/skill.template.md) | Classification tables, synthesis chain |
| Mode files | [`modes/mode-sensei.md`](../modes/mode-sensei.md), [`modes/mode-reference.md`](../modes/mode-reference.md) | Synthesis templates affected by C5 fix |
| Voice files | [`voices/voice-miyagi.md`](../voices/voice-miyagi.md), [`voices/voice-jarvis.md`](../voices/voice-jarvis.md) | Persona approach validated by research |
| Pattern file template | [`templates/pattern-file.template.md`](../templates/pattern-file.template.md) | Slot map affected by C1 fix |

### Review findings validated or challenged by research

| Finding | Research Verdict | Detail |
|---|---|---|
| C4: Steps 3d-3g will fuse | **Validated.** SIFo benchmark confirms step-skipping in long chains | Hardening plan's collapse to single 3d is correct |
| C5: Template substitution breaks on multi-line content | **Supported.** No direct research, but structured formatting literature favors pointers over inline expansion | Hardening plan's slot-name-as-pointer approach is aligned |
| C6: Two YAML blocks ambiguous | **Supported.** Dual-block pattern needs explicit delimiters per practitioner consensus | `dojo-envelope` info string is the right fix |
| C7: No help/list escape hatch | **Supported.** LLMs resist "no match" -- reserved keywords prevent the fuzzy matcher from force-matching | Step 0 reserved keywords are essential |
| I4: "Did you mean?" under-specified | **Challenged.** Research suggests LLMs will always suggest something. Prefix matching may not be enough -- Claude may ignore the instruction and suggest semantically | Add explicit "it is correct to say 'not found'" framing |
| I7: Drop confidence field | **Supported.** No community pattern uses confidence in routing envelopes. `route_reason` is more useful | Hardening plan decision to drop confidence is correct |
| N4: Worked example | **Promoted.** Research says few-shot examples reduce sensitivity by 30% | Should be elevated from nice-to-have to should-fix |

---

## Sources

### Skill Architecture
- [Skill Authoring Best Practices -- Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [The Complete Guide to Building Skills for Claude (PDF)](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)
- [Claude Agent Skills: First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Awesome Claude Skills repo](https://github.com/travisvn/awesome-claude-skills)
- [Self-improvement Loop: My favorite Claude Code Skill](https://www.reddit.com/r/ClaudeCode/comments/1r89084/) (245 pts, r/ClaudeCode)
- [Anthropic 33-page guide breakdown](https://x.com/Hartdrawss/status/2021517290320130103) (3,909 likes)
- [CLAUDE.md best practices from Boris Cherny](https://x.com/srishticodes/status/2025254119636959701) (3,869 likes)

### Persona/Voice Engineering
- [When "A Helpful Assistant" Is Not Really Helpful -- arxiv](https://arxiv.org/html/2311.10054v3)
- [Is Role Prompting Effective? -- learnprompting.org](https://learnprompting.org/blog/role_prompting)
- [Act like a... or maybe not? -- prompthub.substack.com](https://prompthub.substack.com/p/act-like-a-or-maybe-not-the-truth)
- [Keep Claude in Character -- Anthropic](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/keep-claude-in-character)
- [47 persona configurations tested](https://x.com/godofprompt/status/2016480088095879567) (2,707 likes)
- [LLMs pull you toward the middle](https://x.com/pascal_bornet/status/2021887031635476923) (1,109 likes)
- [Role Based Prompts Don't Work](https://www.reddit.com/r/PromptEngineering/comments/1qjkyaj/) (37 pts, r/PromptEngineering)

### Prompt Routing & Classification
- [Why LLMs Skip Instructions -- Unite.AI](https://www.unite.ai/why-large-language-models-skip-instructions-and-how-to-address-the-issue/)
- [Prompt Sensitivity Analysis -- brics-econ.org](https://brics-econ.org/prompt-sensitivity-analysis-how-small-changes-in-instructions-break-llm-performance)
- [Fuzzy Matching Reasoning -- OpenAI Community](https://community.openai.com/t/prompt-engineering-help-for-fuzzy-matching-reasoning/448909)
- [Claude Structured Outputs -- Anthropic](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Structured Outputs HN Discussion](https://news.ycombinator.com/item?id=45930598)
- [Prompt Chaining -- DataCamp](https://www.datacamp.com/tutorial/prompt-chaining-llm)
- [Gemini CLI Routing Strategies -- GitHub](https://github.com/google-gemini/gemini-cli/tree/main/packages/core/src/routing/strategies)
