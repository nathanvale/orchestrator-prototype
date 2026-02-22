1. **Verdict**: **REQUEST CHANGES**

2. **Strengths**
- Reusable separation of concerns (mode docs vs pattern docs) is clean in principle.
- Phased delivery and small commits are review-friendly.
- The plan at least acknowledges token ceilings and fallback behavior up front.
- Keeping changes isolated to new skill/command files lowers direct regression risk to existing orchestrator flows.

3. **Critical issues (must fix)**
- **No validated user problem for 5 modes**: The plan optimizes for novelty, not proven demand. Before creating `.claude/skills/agentic-dojo/modes/*`, require evidence (real user tasks) that multiple output personas solve a concrete failure in existing `patterns`/`orchestrator` workflows.
- **Knowledge drift is guaranteed**: Creating `.claude/skills/agentic-dojo/references/pattern-*.md` alongside `docs/patterns/*.md` introduces duplicate sources of truth with no sync owner, SLA, or automation. This is a structural maintenance bug.
- **v1 includes obvious speculative scaffolding**: “Challenge Seed” in every pattern file is preloading future behavior into all docs. If usage is low or Sparring/Kata are cut, this becomes permanent dead payload and editing overhead.
- **High fixed context tax without hard ROI gate**: Routing mode + pattern every time creates a large baseline token cost. There is no explicit acceptance criterion like “quality improvement must exceed X against `patterns` skill,” so complexity can ship without proving value.
- **Product surface fragmentation risk**: Adding `/dojo` may split behavior already expected from `.claude/skills/orchestrator/SKILL.md`. Without a clear boundary, users must choose between overlapping entry points, increasing cognitive load and support burden.

4. **Important observations (should fix)**
- Phase 1 creates stubs for all files up front; that front-loads churn before proving the core loop. Start with one file + one mode + two patterns first, then expand.
- Voice-heavy docs are expensive to review and hard to regression-test; tone rules can mask factual quality issues during maintenance.
- There is no sunset strategy if adoption is weak (for example, criteria to merge back into orchestrator or archive the skill).
- The current plan optimizes “add 6th mode/10th pattern later,” but there is no roadmap evidence those extensions will happen.

5. **Nice-to-haves**
- Generate dojo pattern references from `docs/patterns/*.md` via a small script to avoid manual divergence.
- Add a lightweight “usage + satisfaction” checkpoint before enabling all modes by default.
- Start with 2 modes max (`reference`, `sensei`) and treat others as optional add-ons behind explicit demand.

6. **Questions for the author**
- What concrete user failures in current `patterns` usage require five distinct output formats?
- Who owns synchronization between `docs/patterns/*.md` and `.claude/skills/agentic-dojo/references/pattern-*.md`?
- What measurable success criteria justify shipping the extra token/maintenance cost?
- Why is `/dojo` a separate command instead of a scoped sub-mode inside `.claude/skills/orchestrator/SKILL.md`?
- What is the rollback plan if adoption after 2-4 weeks is low?
