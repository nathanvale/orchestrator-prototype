# Rebase Dev onto Main -- Checklist

Use this checklist every time you rebase dev onto main after a PR merges.

## Why Not Plain `git rebase main`?

PRs to main use **squash-merge**. This means main gets a single squashed commit, but dev still has the original commits that were PR'd. Plain `git rebase main` tries to replay those already-merged commits, causing conflicts on every single one.

**Always use `--onto`** to skip already-merged commits and only replay dev-exclusive work.

## Pre-Rebase

- [ ] Confirm you are on the `dev` branch: `git branch --show-current`
- [ ] Working tree is clean: `git status` (commit or stash any changes first)
- [ ] Fetch latest main: `git fetch origin main`

## Find the Merge Base

- [ ] Get the merge base (last commit dev shares with main):
  ```bash
  git merge-base dev origin/main
  ```
- [ ] Verify the merge base looks right -- it should be the commit where dev last diverged from main (usually the last PR's squash commit)

## Execute the Rebase

- [ ] Run the `--onto` rebase:
  ```bash
  git rebase --onto origin/main <merge-base-hash> dev
  ```
  This says: "Take all commits after `<merge-base>` on dev, and replay them on top of `origin/main`."

## Handle Conflicts

The most common conflict is `.claude/CLAUDE.md` because both branches edit it.

- [ ] If CLAUDE.md conflicts:
  1. Open the file and look for `<<<<<<<` markers
  2. **Keep main's version** of lobby-facing content (SoT references, project structure, etc.)
  3. **Keep dev's version** of dev-exclusive content (dev branch identity section, dev permissions, etc.)
  4. Merge both sides' ALWAYS/NEVER rules (main may update wording, dev may add rules)
  5. Stage: `git add .claude/CLAUDE.md`
  6. Continue: `git rebase --continue`

- [ ] If agent files conflict (modify/delete -- main deletes agents, dev modifies them):
  1. Keep dev's version: `git add .claude/agents/`
  2. Continue: `git rebase --continue`

- [ ] If things go sideways: `git rebase --abort` (safe, returns to pre-rebase state)

## Post-Rebase Verification

- [ ] Check commit history looks clean:
  ```bash
  git log --oneline -10
  ```
  Dev-exclusive commits should sit on top of main's latest.

- [ ] Verify dev-exclusive files still exist:
  - `.claude/agents/builder.md`
  - `.claude/agents/validator.md`
  - `.claude/skills/orchestrator/`
  - `.claude/commands/orchestrate.md`
  - `docs/` (patterns, plans, brainstorms)
  - `specs/` (master plan, examples)

- [ ] **Critical: check for files deleted by the rebase.** If main removed files via PR (e.g. `docs/`, `specs/`), the rebase silently keeps them deleted on dev -- even though dev wants them. Run:
  ```bash
  # Compare dev against the commit before rebase to find missing files
  git diff --name-status <pre-rebase-commit>..HEAD | grep "^D"
  ```
  If dev-exclusive files were deleted, restore them:
  ```bash
  git checkout <commit-that-had-them> -- docs/ specs/
  ```

- [ ] Verify CLAUDE.md has both:
  - Dev branch identity section at the top
  - Main's latest lobby content below

- [ ] Push to origin (force required after rebase):
  ```bash
  git push origin dev --force-with-lease
  ```
  **Always use `--force-with-lease`**, never `--force`. This fails safely if someone else pushed to dev.

## What Must NEVER Leak to Main

These artifacts exist only on dev. If you see them on a feature branch or PR to main, remove them:

| Artifact | Why it's dev-only |
|----------|-------------------|
| `.claude/rules/rebase-checklist.md` | Dev rebase procedure (not relevant to lobby) |
| `.claude/agents/` | Builder/validator agents are build tools, not lobby content |
| `.claude/skills/orchestrator/` | Orchestrator skill runs on module branches, not main |
| `.claude/commands/orchestrate.md` | Orchestrate command shim |
| `docs/plans/` | Work-in-progress plans |
| `docs/brainstorms/` | Brainstorm artifacts |
| `docs/agents.md` | Agent catalog (dev reference) |
| `docs/patterns/` | Redundant with `.claude/references/patterns/` on main |
| `specs/` | Master plan and examples (dev reference) |
| `scripts/emit-event.ts` | Orchestrator runtime script |
| `src/` | Source code (module branches only) |
| `tests/` | Test files (module branches only) |

## What IS Allowed on Main (via PR)

| Artifact | How it gets to main |
|----------|-------------------|
| `.claude/references/patterns/` | New/updated pattern refs (11-slot frontmatter) |
| `.claude/skills/agentic-dojo/` | Dojo skill updates |
| `.claude/skills/pattern-advisor/` | Advisor skill updates |
| `.claude/skills/module-branch-validator/` | Validator skill updates |
| `.claude/commands/learn.md` | Learn command updates |
| `.claude/commands/lobby.md` | Lobby command updates |
| `README.md` | Lobby README |
| `prompts/` | Curated test prompts |

## Quick Reference

```bash
# Full rebase sequence (copy-paste ready)
git fetch origin main
MERGE_BASE=$(git merge-base dev origin/main)
echo "Merge base: $MERGE_BASE"
git rebase --onto origin/main $MERGE_BASE dev
# ... resolve any conflicts ...
git push origin dev --force-with-lease
```
