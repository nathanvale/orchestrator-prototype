---
slug: community-pattern-mining
display_name: "Community Pattern Mining"
one_liner: "Crawl, classify, and index AGENTS.md and CLAUDE.md files from thousands of GitHub repos into a vector database, then use RAG retrieval to bootstrap better agent configurations from community-proven patterns."
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

community-pattern-mining

## Quick Summary

Community Pattern Mining extracts agent configuration files (AGENTS.md, CLAUDE.md, Skills.md, README) from 40,000+ GitHub repos, classifies them by project type and lifecycle stage using LLMs, stores them in a vector database with metadata filters, then retrieves and reranks relevant examples on demand to bootstrap new agent configurations. The speaker's key finding: "The prompts these agents come up with are better than the prompts we come up with. And if they have the chance to look at other good solutions, it improves the quality even more." This pattern is meta-prompting at scale -- learning from community behavior to improve agent generation.

## When To Use

- When generating a new AGENTS.md or CLAUDE.md for a project with no existing configuration
- When optimizing an existing agent configuration for a specific domain (e.g., frontend vs backend, testing vs deployment)
- When the agent needs to adapt to a new project type or lifecycle stage (prototype vs production)
- When you want to surface best practices from the community without manual curation
- When building a marketplace or recommendation system for agent configurations
- When tracking adoption trends and evolution of agent configuration patterns over time

## Core Mechanism

The pattern operates in two phases: **indexing** (offline batch process) and **retrieval** (on-demand query).

**Phase 1: Indexing**
1. **Crawl:** Extract configuration files from GitHub repos via API -- AGENTS.md, CLAUDE.md, Skills.md, README
2. **Classify:** Use LLMs to tag each file with metadata:
   - Project type (frontend, backend, CLI, library, fullstack)
   - Lifecycle stage (prototype, MVP, production, maintenance)
   - Agentic level (basic automation, task decomposition, multi-agent coordination)
   - Rules classification (code style, git workflow, testing, deployment)
   - GenAI focus (agentic, CLI tools, SDK, infrastructure)
3. **Index:** Store in vector database (e.g., Pinecone, Weaviate) with:
   - Embedding of the file content
   - Metadata filters for query-time filtering
   - Timestamp for recency ranking

**Phase 2: Retrieval**
1. **Query:** Agent receives a task to create or improve an agent configuration
2. **Embed:** Embed the current task context (project type, goals, constraints)
3. **Retrieve:** Query the vector database with semantic similarity + metadata filters
4. **Rerank:** Filter by recency, project similarity, and rules type
5. **Bootstrap:** Agent uses retrieved examples to inform its own configuration generation

Key findings from 40,000+ repos:
- CLAUDE.md adoption spiked first
- AGENTS.md followed 4-6 weeks later
- Skills.md is "exploding right now" -- average 5-6 skills per project
- 1.6% of all repos have AGENTS.md, but 33% among AI config-enabled projects

## Key Rules

1. Crawling must respect GitHub API rate limits and robots.txt -- do not scrape aggressively.
2. Classification must be automated via LLMs -- manual tagging does not scale to 40K+ files.
3. Vector database must support metadata filtering -- pure semantic search without filters produces irrelevant results.
4. Retrieval must be filtered by recency -- old patterns may reference deprecated tools or APIs.
5. Retrieved examples are suggestions, not templates -- agent must adapt patterns to the current project's constraints.
6. Index must be updated regularly (weekly or monthly) to capture new community trends.
7. Privacy: only index public repos; do not store sensitive or proprietary configuration files.

## Implementation Notes

**Crawling strategy:** Use GitHub API search with queries like `filename:AGENTS.md` or `filename:CLAUDE.md`. Filter by stars or recent commits to prioritize active projects. Store raw file content + metadata (repo name, stars, last commit date, primary language).

**Classification prompts:** Use a lightweight model (Haiku) to tag files. Example prompt: "Classify this AGENTS.md file by project type (frontend/backend/CLI/library/fullstack), lifecycle stage (prototype/MVP/production/maintenance), and agentic level (basic/task-decomposition/multi-agent)." Parse structured output as JSON.

**Vector database schema:**
- `embedding`: 1536-dim vector (OpenAI text-embedding-3-small or equivalent)
- `content`: raw file text
- `metadata`: JSON object with `project_type`, `lifecycle_stage`, `agentic_level`, `rules_classification`, `repo_stars`, `last_commit_date`, `primary_language`

**Retrieval query:** Embed the current project's description or existing AGENTS.md, then query the DB with cosine similarity + metadata filters. Example: "Find AGENTS.md files from frontend projects in production stage with >100 stars, updated in the last 6 months."

**Reranking:** After vector similarity retrieval, rerank by:
1. Recency (prefer last 3 months)
2. Stars (prefer high-engagement repos)
3. Exact project type match (frontend vs backend)
4. Rules type overlap (if the current project has git-workflow rules, prefer examples with similar rules)

## Failure Modes

- **Stale index:** Database contains outdated patterns referencing deprecated tools. Agents generate configurations that no longer work.
- **Overfitting to popular repos:** High-star repos dominate retrieval, causing homogenization. Less common but effective patterns are buried.
- **Misclassification:** LLM tagger incorrectly labels a backend project as frontend. Retrieval returns irrelevant examples.
- **No diversity:** All retrieved examples come from the same organization or framework. Agent learns a narrow pattern instead of generalizing.
- **Privacy leak:** Accidentally index a private repo or a public repo with sensitive information in AGENTS.md (API keys, internal URLs). Must filter by repo visibility.

## Signals & Diagnostics

- **Pattern is needed:** Agent generates generic or ineffective AGENTS.md files because it has no domain-specific examples.
- **Pattern is working:** Generated configurations reference domain-specific tools and patterns that match the project's actual needs (e.g., frontend projects get Playwright references, backend projects get database migration rules).
- **Pattern is failing:** Retrieved examples are irrelevant (wrong project type), outdated (reference deprecated tools), or too homogeneous (all from the same framework).
- **Index is stale:** Agents reference tools or APIs that were deprecated >6 months ago.

## Tradeoffs

**Gain:** Bootstrap high-quality agent configurations from community-proven patterns. Reduce manual configuration effort. Surface best practices automatically. Track adoption trends to identify emerging patterns (Skills.md explosion).

**Cost:** Infrastructure overhead -- crawling 40K+ repos, running LLM classification, maintaining a vector database. Retrieval adds latency to agent initialization. Index must be refreshed regularly to stay relevant.

**When to pay:** Projects where agent configuration quality directly impacts developer productivity. Marketplace or recommendation systems where surfacing relevant examples is core functionality. Research projects tracking adoption of agent configuration patterns over time.

## Related Patterns

- **Skill-Bootstrapping** -- uses retrieved Skills.md examples to generate new skills for the current project
- **Meta-Prompting** -- community pattern mining is meta-prompting at scale; learning from other agents' configurations
- **Hierarchical-Persistent-Memory** -- stores classification metadata hierarchically for efficient filtering
- **Self-Reflecting-Analytics** -- tracks which retrieved patterns led to successful agent configurations, improving reranking over time

## Source Anchors

Community evidence and research:
- [From Prompts to AGENTS.md: What Survives Across Thousands of Runs](https://www.youtube.com/watch?v=aMwuPa6BnaM) -- AI Native Dev NYC talk by Tessl; 40K+ repo analysis, vector database for AGENTS.md retrieval
- [Tessl blog post: From Prompts to AGENTS.md](https://tessl.io/blog/from-prompts-to-agents-md-what-survives-across-thousands-of-runs/) -- adoption curves: CLAUDE.md first, AGENTS.md followed, Skills.md exploding
- [AGENTS.md Files: AI Agent Configuration -- Emergent Mind](https://www.emergentmind.com/topics/agents-md-files) -- 1.6% of repos overall, 33% among AI config-enabled projects; median ~336 words, ~142 lines
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) -- ETH Zurich; tested 4 coding agents across 138 repos and 5,694 PRs
- [Stop Using /init for AGENTS.md -- Addy Osmani](https://addyosmani.com/blog/agents-md/) -- "auto-generated content isn't useless, it's redundant"
- [Support AGENTS.md -- Issue #6235 -- anthropics/claude-code](https://github.com/anthropics/claude-code/issues/6235) (2,838+ upvotes) -- 20,000+ open-source projects using AGENTS.md
- [Complete Guide to Skills.md in 2026](https://www.flex.com.ph/articles/complete-guide-to-skillsmd-in-2026) -- Skills.md adoption exploding; YAML frontmatter for metadata
- [@dani_avila7: Almost 40K downloads across just 3 Claude Code agents](https://x.com/dani_avila7/status/2017096001232781477) (1,441 likes, 138 reposts) -- evidence of template distribution at scale
