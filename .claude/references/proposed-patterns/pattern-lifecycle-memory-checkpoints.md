---
slug: lifecycle-memory-checkpoints
display_name: "Lifecycle Memory Checkpoints"
one_liner: "Four write mechanisms fired at specific moments in a conversation's lifecycle -- bootstrap load, pre-compaction flush, session snapshot, user-initiated save -- that turn inert markdown files into persistent agent memory."
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

## Pattern ID

lifecycle-memory-checkpoints

## Quick Summary

AI agents are stateless -- every conversation starts blank. Memory files (markdown, SQLite, etc.) can persist knowledge across sessions, but files alone are inert. What makes memory work is not where you store it but **when you read and write it**. This pattern defines four lifecycle mechanisms that fire at specific moments in a conversation to checkpoint agent state:

1. **Bootstrap loading** -- inject durable memory at session start so the agent has instant recall
2. **Pre-compaction flush** -- before lossy context compression, silently prompt the agent to save anything important to disk (the write-ahead log pattern from databases)
3. **Session snapshot** -- on explicit session reset, capture raw conversation text as a recoverable checkpoint
4. **User-initiated save** -- "remember this" triggers agent-categorized write to the appropriate memory tier

These mechanisms operate on a two-tier markdown storage model that the community has converged on: a curated semantic memory file (MEMORY.md, 200-line cap, always loaded) and append-only episodic daily logs (memory/YYYY-MM-DD.md, today + yesterday loaded). The pattern extends to team-scoped institutional memory in enterprise contexts where agents pick up Jira tickets and accumulate project knowledge that benefits the whole team.

Google's memory taxonomy (November 2025 whitepaper) provides the conceptual framework: **episodic** (what happened), **semantic** (stable facts and preferences), and **procedural** (workflows and learned routines). The four mechanisms are the engineering that makes this taxonomy operational.

## When To Use

- Agents that need cross-session continuity without vector databases or external infrastructure
- Local-first coding agents where markdown files are the natural storage medium
- Long-running sessions where context window compaction would silently destroy important information
- Enterprise engineering workflows where agents accumulate institutional knowledge (blockers, architectural decisions, team conventions, past incident context) across Jira tickets and PRs
- Multi-agent systems where one agent's learnings should be available to future agents working on the same project
- Any system where you observe agents "forgetting" decisions made in previous sessions or earlier in long conversations

## Core Mechanism

### The Memory Taxonomy

Three types of memory, following Google's framework:

| Type | What It Stores | Example | Storage |
|------|---------------|---------|---------|
| **Semantic** | Stable facts, preferences, identity | "This repo uses Biome not ESLint" | MEMORY.md (curated, capped) |
| **Episodic** | What happened in past interactions | "Hit a race condition in payments service -- see PR #4231" | Daily logs + session snapshots |
| **Procedural** | Workflows and learned routines | "Always run migrations before seeding in this project" | MEMORY.md or skill files |

### The Two-Tier Storage Model

**Tier 1: MEMORY.md (semantic memory)**
- Curated long-term memory with a 200-line cap
- Structured sections (identity, preferences, project conventions, known issues)
- Loaded into every prompt automatically -- zero retrieval latency
- Agent and human can both write to it

**Tier 2: Daily logs (episodic memory)**
- `memory/YYYY-MM-DD.md` -- one file per day, append-only
- Today and yesterday's logs loaded at session start (recent context window)
- Older logs available via search on demand (cold storage)
- Never edited, only appended -- preserves full history

**Tier 3 (optional): Session snapshots**
- Raw conversation fragments saved on explicit session reset
- Not summaries -- actual message text (last 15 meaningful messages)
- LLM generates a descriptive filename slug (e.g., `2026-02-08-api-design.md`)
- Searchable but not auto-loaded

### The Four Mechanisms

**Mechanism 1: Bootstrap Loading (session start)**

On every new conversation, the system injects MEMORY.md into the prompt. The agent always has it -- no decision required, no file read needed. On top of that, the agent's instructions tell it to read today and yesterday's daily logs for recent episodic context. This is the simplest and most important mechanism.

```
Session starts ->
  System injects MEMORY.md (automatic)
  Agent reads today's daily log (per its own instructions)
  Agent reads yesterday's daily log (per its own instructions)
  Agent has full semantic + recent episodic context
```

**Mechanism 2: Pre-Compaction Flush (approaching context limit)**

When the session nears the context window limit, a silent agentic turn is injected -- invisible to the user. It instructs the agent to save anything important to the daily log before lossy LLM summarization (compaction) proceeds. This turns a destructive operation into a checkpoint.

```
Context nears limit ->
  System injects silent turn: "Pre-compaction memory flush.
    Store durable memories now (use memory/YYYY-MM-DD.md).
    If nothing to store, reply with NO_REPLY."
  Agent writes important context to daily log
  Agent replies NO_REPLY (invisible to user)
  Compaction proceeds -- context is lossy-compressed
  Important information already safe on disk
```

This is the **write-ahead log pattern from databases** applied to agent memory. Multiple independent sources converge on this name and mechanism.

**Mechanism 3: Session Snapshot (explicit reset)**

When the user starts a new session (`/new`, `/reset`), a hook captures the last chunk of conversation. The snapshot is raw message text, not a generated summary -- preserving the exact exchanges. An LLM generates a descriptive filename slug. The snapshot is searchable in future sessions.

```
User runs /new ->
  Hook extracts last 15 meaningful messages
  Filters out tool calls, system messages, slash commands
  LLM generates descriptive slug
  Saved as memory/YYYY-MM-DD-<slug>.md
  New session starts with clean context + bootstrap loading
```

**Mechanism 4: User-Initiated Save**

The simplest mechanism -- the user says "remember this" and the agent decides where it belongs:
- Stable fact or preference -> MEMORY.md (semantic)
- Event or decision from current work -> daily log (episodic)
- Workflow or routine -> MEMORY.md procedural section or skill file

No special hook needed. The agent has file-writing capabilities and its instructions tell it how to route information.

### Memory Scopes for Enterprise

In team engineering contexts, memory needs multiple scopes:

| Scope | Location | Visibility | Example |
|-------|----------|------------|---------|
| **Personal** | `~/.claude/agent-memory/` | Private to user | "I prefer tabs and dark mode" |
| **Project** | `.claude/agent-memory/` | Git-tracked, team-shared | "This repo has a known Stripe webhook race condition" |
| **Institutional** | Project daily logs | Team-shared | "Sarah from platform said auth middleware deprecated in Q3" |
| **Episodic work log** | `memory/YYYY-MM-DD.md` | Per-agent or shared | "Picked up PROJ-123, hit blocker on Redis connection pooling" |

The pre-compaction flush and session snapshots become more valuable in enterprise contexts -- you're not just saving "what I was working on" but "what the team's agent learned while working on it." An agent picking up PROJ-456 next week benefits from the daily log entry that recorded the blocker on PROJ-123.

### Memory Consolidation

Storage is the easy part. The hard problems are extraction and consolidation:

**Extraction** -- deciding what's worth remembering. Not every detail of a conversation is important. The community heuristic: "If the agent would make a different decision with vs without this piece of info, store it."

**Consolidation** -- deduplicating and updating entries over time. Example: user says "I prefer dark mode" in one session, "I don't like dark mode anymore" in another, "I switched back to dark mode" in a third. Without consolidation, all three entries sit in memory. A good memory system collapses them into: "User prefers dark mode (as of 2026-02-26)."

**Overwrite capability** -- something true today may not be true tomorrow. The memory system must differentiate and update its knowledge bank. Without this, memory becomes noisy and contradictory.

These operations are typically handled by a separate LLM call that takes conversation context and handles extraction/consolidation. Some implementations use nightly distillation (OpenCortex) or weekly cron-based archival.

## Key Rules

1. **MEMORY.md is always loaded, never searched** -- it is the hot tier. If it needs a retrieval step, it's too big or too poorly organized.
2. **Daily logs are append-only** -- never edit or delete entries. Consolidation happens by promoting durable facts to MEMORY.md, not by modifying the log.
3. **Pre-compaction flush fires exactly once per compaction cycle** -- tracked in session state. Multiple flushes waste tokens.
4. **Session snapshots are raw text, not summaries** -- summaries are lossy. Raw conversation preserves the exact context for future search.
5. **The 200-line cap on MEMORY.md is a hard constraint** -- exceeding it bloats every prompt. Use topic-specific overflow files for depth.
6. **Memory consolidation requires a separate LLM call** -- do not ask the in-conversation agent to also manage memory consolidation. Separation of concerns.
7. **Enterprise memory scopes are explicit** -- personal memory stays personal, project memory is git-tracked. Mixing scopes leaks preferences into team context or team decisions into private memory.
8. **Silent turns must be truly invisible** -- the pre-compaction flush must not appear in the user's conversation. If the user sees "Pre-compaction memory flush," the implementation is broken.

## Implementation Notes

**OpenClaw's pre-compaction flush config (production reference):**

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

Flush triggers when `contextWindow - reserveTokensFloor - softThresholdTokens` is crossed.

**Claude Code PreCompact hook (community pattern):**

The PreCompact hook spawns a separate Claude instance via `claude -p` to summarize the full conversation, saves it as `HANDOVER-YYYY-MM-DD.md`, then compaction proceeds. An advanced variant from the Anthropic cookbook uses background threads: at a soft token threshold, a background worker starts building a session memory summary. When the hard limit hits, the swap is instant -- zero user wait.

The `SESSION_MEMORY_PROMPT` schema that drives the summary explicitly preserves:
- User corrections (verbatim)
- Errors and failed approaches (to prevent retries)
- Exact file paths and IDs
- Active task state

**Claude Code native agent memory (v2.1.33, February 2026):**

Three scopes: `user` (~/.claude/agent-memory/, private), `project` (.claude/agent-memory/, team-shareable via git), `local` (.claude/agent-memory-local/, personal project). Each agent gets its own MEMORY.md. First 200 lines injected at startup, topic-specific overflow files created autonomously. Key distinction: CLAUDE.md is human-written and read by all agents; agent memory is agent-written and read only by that specific agent.

**ianlpaterson's 4-layer architecture (community reference):**

1. Always-loaded MEMORY.md with routing table (capped at 200 lines)
2. Per-project CLAUDE.md with embedded `## State` sections
3. Daily logs at `~/llm-data/daily-log/` for episodic capture
4. On-demand topic files for depth

`/flush` command at session end appends to daily logs and promotes repeated lessons from episodic to semantic. Weekly cron archives stale MEMORY.md entries. Six validation scripts enforce 8 design rules.

**Hybrid retrieval (for teams outgrowing pure markdown):**

OpenClaw's search layer indexes markdown files into SQLite with the sqlite-vec extension:
- Chunks at ~400 tokens with 80-token overlap
- BM25 + vector hybrid (70/30 split), score threshold 0.35
- MMR re-ranking (lambda 0.7) to prevent near-duplicate daily notes from dominating
- Temporal decay: `decayedScore = score * e^(-lambda * ageInDays)` with 30-day half-life
- Evergreen files (MEMORY.md, non-dated files) never decayed
- No external vector DB -- SQLite is the entire backend

**The desk and filing cabinet analogy:**

The session is a messy desk -- notes and documents scattered for the current project. Memory is the filing cabinet -- categorized, stored, retrievable. The four mechanisms are the habits that move things from desk to cabinet at the right moments. Without the habits, the filing cabinet stays empty no matter how well-organized it is.

## Failure Modes

- **No pre-compaction flush:** Context is silently compressed. Important decisions, file paths, and error context are lost. The agent "forgets" mid-session and the user has to re-explain the codebase. This is the single most common complaint in the community (256-pt r/ClaudeCode thread; @yashns1 viral X post).
- **No consolidation:** Three contradictory entries about the same preference sit in memory. The agent picks one arbitrarily or tries to reconcile all three, producing inconsistent behavior. Memory becomes noisy over time.
- **MEMORY.md exceeds cap:** Every prompt pays the full token cost of bloated memory. Attention dilutes across irrelevant entries. Agent performance degrades on all tasks, not just memory-related ones.
- **Summaries instead of snapshots:** Session snapshots are LLM-generated summaries instead of raw conversation text. The summary omits the exact detail needed for future retrieval. Garbage in, garbage out.
- **No memory scoping in enterprise:** Personal preferences leak into team memory. An agent's MEMORY.md contains "Nathan prefers tabs" alongside "the payments service has a webhook race condition." Other team members' agents inherit irrelevant personal preferences.
- **Creation memory gap:** Agent creates a file, function, or configuration, then forgets it exists in a later session. Memory captures what was discussed but not what was produced. The agent duplicates work or creates conflicting implementations.
- **Bootstrap overload:** Too much memory loaded at session start. Agent spends its context budget on historical memory instead of the current task. The "more context does not mean better agents" finding from the ACC paper applies here.
- **Stale memory without decay:** A fact that was true six months ago remains in MEMORY.md unchallenged. The agent follows obsolete guidance. Without temporal decay or explicit review cycles, memory accumulates entropy.

## Signals & Diagnostics

- **Pattern is needed:** Agents lose context mid-session after compaction. Users re-explain the same project setup every new session. Agents repeat mistakes that were solved in previous sessions. Enterprise agents pick up Jira tickets with no context about past blockers or decisions.
- **Pattern is working:** Agents have instant recall of project conventions at session start. Pre-compaction flushes capture important decisions before context is compressed. Session snapshots enable recovery of exact conversation context. Enterprise agents reference past incident context when encountering similar problems.
- **Pattern is failing:** MEMORY.md grows past 200 lines and attention dilutes. Pre-compaction flush fires but the agent writes nothing useful (extraction quality problem). Daily logs accumulate noise without consolidation. Team memory contains personal preferences. Agents still "forget" after compaction despite the flush mechanism.

## Tradeoffs

**Gain:** Agents maintain continuity across sessions without external infrastructure. The pre-compaction flush transforms a destructive operation (lossy compression) into a checkpoint (write-ahead log). Enterprise teams accumulate institutional knowledge that compounds across agents and sessions. Markdown storage is readable, debuggable, portable, and git-trackable.

**Cost:** Four mechanisms means four potential failure points. Memory consolidation requires additional LLM calls (token cost). The 200-line MEMORY.md cap forces hard decisions about what's worth remembering. Daily logs grow unbounded without archival. Enterprise memory scoping adds organizational complexity. The community is split on when plain markdown stops being sufficient and hybrid retrieval (vector search) becomes necessary -- there is no clear threshold, and premature optimization toward vector DBs adds infrastructure cost for marginal benefit on small corpora.

**The live debate:** In-context memory (MEMORY.md loaded into every prompt) is simple and reliable but vulnerable to compaction. External memory (Mem0-style, outside the context window) survives compaction but adds infrastructure and retrieval latency. The pragmatic middle ground: MEMORY.md for the hot tier (always loaded, small), daily logs for the warm tier (loaded on demand), and vector-indexed cold storage only when the corpus outgrows filesystem search. LlamaIndex benchmarks (January 2026) show filesystem retrieval outperforms vector RAG on small corpora, supporting the "start simple" approach.

## Related Patterns

- **Hierarchical Persistent Memory** -- complementary pattern. Hierarchical Persistent Memory defines *where* to place memory files (root, component, tool directories). Lifecycle Memory Checkpoints defines *when* to read and write them. A memory system needs both: hierarchy for organization, lifecycle hooks for operation.
- **Context Engineering** -- the parent discipline. Context Engineering manages context window quality through controlled handoffs, context surgery, and spec-file re-reads. Lifecycle Memory Checkpoints is a specific implementation of context engineering focused on the memory lifecycle. The pre-compaction flush is a form of controlled handoff (disk checkpoint before lossy compression). Wave-boundary spec re-reads are the orchestration equivalent of bootstrap loading.
- **Hydration Pattern** -- bootstrap loading is hydration applied to memory. The Hydration Pattern serializes orchestration state into a spec file for cross-session resume. Bootstrap loading serializes agent memory into MEMORY.md for cross-session recall. Same mechanism, different payload.
- **Spec as Source of Truth** -- the spec file is re-read from disk at wave boundaries for the same reason MEMORY.md is loaded at session start: critical information should not depend on context window survival. Both patterns defend against compaction by keeping the source of truth on disk.
- **Prompt Hop Chain Reduction** -- memory instructions ("read today's daily log") are hop chains. If the agent skips the read, it loses recent episodic context. Bootstrap loading of MEMORY.md avoids this by system-injecting it (zero hops). Daily log loading remains agent-directed (one hop) and is therefore subject to skip-read failure.
- **Skill Bootstrapping** -- MEMORY.md can contain procedural memory (workflows, learned routines) that functions as bootstrapped skill knowledge. The distinction: skills are static (written once, loaded always), while memory is dynamic (written by the agent, evolving over time). The two compound when an agent's learned routines graduate from episodic daily log entries into stable MEMORY.md procedures.
- **Self-Reflecting Analytics** -- the extraction and consolidation step in memory is a form of self-reflection. The agent (or a separate LLM call) analyzes its own session to determine what's worth remembering. Self-Reflecting Analytics applies the same introspection to execution metrics; Lifecycle Memory Checkpoints applies it to knowledge persistence.
- **Meta-Prompting** -- nightly distillation and weekly archival of memory are meta-operations on the memory system itself. A maintenance subagent that consolidates daily logs into MEMORY.md entries is meta-prompting applied to memory management.
- **Three-Layer Influence Model** -- MEMORY.md sits in the durable middle layer (survives across sessions, unlike volatile user prompts; more adaptable than system prompts). The three-layer model explains why investing in MEMORY.md quality has outsized returns compared to prompt engineering or system prompt tuning.
- **Community Pattern Mining** -- community-mined AGENTS.md patterns can seed an agent's initial MEMORY.md with project conventions discovered from thousands of repos, providing a cold-start bootstrap before the agent has generated any of its own memories.

## Source Anchors

### Primary Sources

- [How AI Agents Remember Things](https://www.youtube.com/watch?v=Seu7nksZ_4k) (51,280 views, 2,310 likes) -- Damian Galarza; the four-mechanism framework (bootstrap loading, pre-compaction flush, session snapshot, user-initiated save) with OpenClaw as reference implementation
- [How AI Agents Remember Things (blog post)](https://www.damiangalarza.com/posts/2026-02-17-how-ai-agents-remember-things/) -- Damian Galarza; written companion to the video with deeper technical detail
- [How Clawdbot Remembers Everything](https://manthanguptaa.in/posts/clawdbot_memory/) -- manthanguptaa.in; most technically precise public writeup on pre-compaction flush, includes YAML config, hybrid search architecture (BM25 + vector 70/30), cache-TTL pruning
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- Anthropic Engineering; compaction strategies, structured note-taking, sub-agent architectures, just-in-time context
- [Context Engineering: Sessions and Memory (whitepaper)](https://www.kaggle.com/whitepaper-context-engineering-sessions-and-memory) -- Google (Kimberly Milam, Antonio Gulli); the episodic/semantic/procedural taxonomy, 72-page treatment of memory generation, extraction, consolidation
- [OpenClaw memory.md source doc](https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory.md) -- 736 lines of production implementation detail; pre-compaction flush config, MMR re-ranking formula, temporal decay math, hybrid search architecture
- [Manage Claude's memory -- Claude Code Docs](https://code.claude.com/docs/en/memory) -- official Claude Code native agent memory (v2.1.33); three scopes (user, project, local), 200-line injection, agent-written memory distinct from human-written CLAUDE.md

### Community Implementations

- [Claude Code Memory Architecture -- 4-layer autonomous system](https://ianlpaterson.com/blog/claude-code-memory-architecture/) -- ianlpaterson; MEMORY.md routing table + daily logs + topic files + weekly cron archival + 6 validation scripts
- [Claude Code Auto Memory & PreCompact Hooks Explained](https://yuanchang.org/en/posts/claude-code-auto-memory-and-hooks/) -- yuanchang.org; PreCompact hook spawning `claude -p` for HANDOVER files
- [Anthropic Session Memory Compaction Cookbook](https://platform.claude.com/cookbook/misc-session-memory-compaction) -- instant compaction via background threads, SESSION_MEMORY_PROMPT schema
- [We Built Persistent Memory for OpenClaw (Mem0)](https://mem0.ai/blog/mem0-memory-for-openclaw) -- mem0.ai; external memory argument (MEMORY.md vulnerable to compaction), auto-recall/auto-capture, self-hosted option
- [Claude-Mem](https://github.com/thedotmack/claude-mem) (12.9K GitHub stars) -- 3-layer retrieval (compact index -> timeline context -> full observations), SQLite storage, Claude Agent SDK compression
- [Claude-Mem docs](https://docs.claude-mem.ai/introduction) -- architecture and configuration reference
- [Persistent Memory in Claude Code with claude-mem](https://betterstack.com/community/guides/ai/claude-mem/) -- Better Stack setup guide

### Community Discussion (Reddit)

- [Please stop creating "memory for your agent" frameworks](https://www.reddit.com/r/ClaudeCode/comments/1r4asf6/) (256 pts, 132 comments) -- r/ClaudeCode; community fatigue at proliferation; MEMORY.md + sub-files "works wonderfully"
- [PSA: Turn on memory search with embeddings](https://www.reddit.com/r/openclaw/comments/1r5mgmu/) (94 pts, 38 comments) -- r/openclaw; tiered memory (core under 4K chars always loaded, cold storage via embedding search)
- [AI agents need better memory systems, not just bigger context windows](https://www.reddit.com/r/AI_Agents/comments/1r0q4qf/) (76 pts, 31 comments) -- r/AI_Agents; "a markdown file the agent reads at start and writes at end -- Claude Code already does this with CLAUDE.md"
- [I Spent 5 Days Fixing My AI Agent's Memory](https://www.reddit.com/r/AskClaw/comments/1rci23e/) (65 pts, 17 comments) -- r/AskClaw; "write discipline, pre-compaction flush, boot sequence, handover protocol -- should ship as default infrastructure"
- [We built a memory backend for OpenClaw agents (.h5 file)](https://www.reddit.com/r/openclaw/comments/1rcopg2/) (62 pts, 51 comments) -- r/openclaw; "380us at 100k memories"; top comment: "There is now 1,000 different memory solutions"
- [I gave an AI agent persistent memory using just markdown files](https://www.reddit.com/r/ChatGPT/comments/1qx37t7/) (30 pts, 45 comments) -- r/ChatGPT; two-tier approach (daily logs + periodic distillation into MEMORY.md)
- [We built persistent memory for OpenClaw (Mem0)](https://www.reddit.com/r/openclaw/comments/1regq4c/) (26 pts, 21 comments) -- r/openclaw; debate over whether compaction preserves MEMORY.md
- [OpenCortex: A self-improving memory system](https://www.reddit.com/r/openclaw/comments/1rdzewv/) (24 pts, 12 comments) -- r/openclaw; nightly distillation into structured buckets
- [AI agents have a creation memory problem](https://www.reddit.com/r/AIMemory/comments/1rdffhk/) (9 pts, 12 comments) -- r/AIMemory; agents forget what they created, distinct from conversation memory
- [I built an open-source memory layer for Claude Code (Engram)](https://www.reddit.com/r/claude/comments/1rcrbqa/) (11 pts, 27 comments) -- r/claude

### Community Discussion (X)

- [Claude-Mem viral announcement](https://x.com/hasantoxr/status/2017989926428778985) (10,465 likes, 1,054 reposts) -- @hasantoxr; "95% fewer tokens, 20x more tool calls"
- [Memory is a prediction problem, not a retrieval problem](https://x.com/helloiamleonie/status/2017370424808509451) (1,144 likes) -- @helloiamleonie; conceptual challenge to RAG-based memory
- [Anthropic context engineering playbook open-sourced](https://x.com/ihtesham2005/status/2026210386740216161) (981 likes, 116 reposts) -- @ihtesham2005
- [Agentic file system paper](https://x.com/rohanpaul_ai/status/2008445933424386074) (1,672 likes, 223 reposts) -- @rohanpaul_ai
- [AgeMem -- unified long/short-term memory framework](https://x.com/omarsar0/status/2010712137933730234) (635 likes, 111 reposts) -- @omarsar0
- [Agent Cognitive Compressor (ACC) paper](https://x.com/dair_ai/status/2014000799245107339) (375 likes, 76 reposts) -- @dair_ai; "more context does not mean better agents"
- [CLAUDE.md-as-memory pattern](https://x.com/jason_haugh/status/2026024989254619251) -- @jason_haugh; "agent rewrites its own operating instructions as it learns"
- [Markdown-file memory skepticism](https://x.com/tulipking/status/2024691063177318779) (29 likes) -- @tulipking; "not convinced the solution is a more opinionated structure of md files"

### YouTube

- [How AI Agents Remember Things](https://www.youtube.com/watch?v=Seu7nksZ_4k) (51,280 views) -- Damian Galarza
- [How AI Agents Search Their Memory (Part 2)](https://www.youtube.com/watch?v=SpReZZk_13w) -- Damian Galarza
- [Claude Code With UNLIMITED Memory!](https://www.youtube.com/watch?v=qhuS__jC4n8) (33,735 views) -- WorldofAI
- [Context Engineering Our Way to Long-Horizon Agents](https://www.youtube.com/watch?v=vtugjs2chdA) (109,285 views) -- Harrison Chase / Sequoia Capital
- [Give Claude Persistent Memory in 5 Minutes](https://www.youtube.com/watch?v=ryqpGVWRQxA) (19,441 views) -- Better Stack
- [Self Improving Subagents with Memory](https://www.youtube.com/watch?v=KoS7w--Cu94) (2,500 views) -- Jaymin West

### Academic

- [Agent Cognitive Compressor (ACC)](https://x.com/dair_ai/status/2014000799245107339) -- bio-inspired memory controller for bounded persistent memory; challenges the "more context = better" assumption
- [AriadneMem -- scalable memory for lifelong agents](https://x.com/WenhuiZhu8/status/2020628416119349612) (205 likes, 416 reposts) -- graph traversal approach to long-term agent memory
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich; context file redundancy as a form of context pollution

### Related Issues

- [Support AGENTS.md -- anthropics/claude-code #6235](https://github.com/anthropics/claude-code/issues/6235) (2,838+ upvotes) -- the upstream feature request driving community memory patterns
- [Indexed transcript references in compaction summaries -- #26771](https://github.com/anthropics/claude-code/issues/26771) -- feature request for compaction to preserve indexed references to original transcript turns
