# Stage 5 Verification: SKILL.md Is Identical to Stage 4

## Purpose

Stage 5 adds zero new orchestrator capabilities. The only changes are documentation:
- `docs/patterns/plugin-architecture.md` (new)
- `docs/patterns/team-profiles.md` (new)
- `prompts/stage-5/` (new)
- `.claude/CLAUDE.md` (updated stage identity)
- `.claude/commands/lobby.md` (updated branch name)
- `README.md` (updated navigation footer)

The SKILL.md must be byte-for-byte identical to Stage 4.

## Verification Commands

```bash
# Confirm SKILL.md has not changed
git diff orchestration/4-hop..orchestration/5-plugin -- .claude/skills/orchestrator/SKILL.md
# Expected: no output (no diff)

# Confirm line count is 769 (same as stage 4)
wc -l .claude/skills/orchestrator/SKILL.md
# Expected: 769

# See full stat of what changed
git diff orchestration/4-hop..orchestration/5-plugin --stat
# Expected: only docs/patterns, prompts, CLAUDE.md, lobby.md, README.md
```

## If the Diff Shows SKILL.md Changes

Something went wrong. Stage 5 must NOT modify SKILL.md. Check out the branch and inspect:

```bash
git show orchestration/5-plugin:.claude/skills/orchestrator/SKILL.md | head -50
git show orchestration/4-hop:.claude/skills/orchestrator/SKILL.md | head -50
```

The outputs must be identical.
