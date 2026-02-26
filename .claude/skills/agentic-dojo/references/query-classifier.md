# Query Classifier

**Purpose:** Deterministic query-type classifier. Runs in Step 1 after reserved-keyword
check, before mode/pattern detection. Single query type falls straight through to the
existing cascade -- nothing else changes.

---

## Two-Pass Resolution

```
Step 1a: Resolve all pattern slugs/aliases from $ARGUMENTS
         (alias table only -- NOT keyword table)
         Result: resolved_patterns[] with count

Step 1b: Classify query type using resolved count + signals (see table below)

Step 1c: single query type -> continue to existing mode/keyword cascade (unchanged)
```

---

## Classification Rules

| Signal | Query type | Condition |
|--------|-----------|-----------|
| `compare` prefix or trigger | compare | `$ARGUMENTS` starts with `compare:` OR contains "compare", "vs", "versus", "difference between", "differ from", "in common", "overlap", "similarities" |
| 2 explicit + compare signal | compare | Two patterns resolved AND compare trigger present |
| 2 explicit, no compare signal | compare | Exactly 2 patterns resolved (default: naming 2 = want comparison) |
| `--context-pattern=<slug>` flag | structured follow-up | Extract slug(s) from flag directly; skip pronoun resolution (flag is repeatable) |
| Pronoun/reference, no pattern name | follow-up | `$ARGUMENTS` contains "that one", "those", "it", or ordinal refs ("first"/"second"/"third") AND no explicit slug/alias resolved |
| 3+ explicit slugs/aliases | disambiguation | Emit: "You named 3+ patterns. Compare supports 2 at a time. Which pair would you like to compare?" |
| Everything else | single | Fallthrough to existing cascade |

---

## Classifier-to-Mode Mapping

| Query type | Mode | Patterns read | Delivery |
|------------|------|--------------|----------|
| single | Existing cascade (Sensei/Reference) | 1 | Existing templates |
| compare | Compare (new) | 2 | mode-compare.md template |
| follow-up | Re-classify after context resolution | 1-2 | Depends on resolved query type |
| structured follow-up | Same as single/compare (from flag) | 1-2 | Depends on flag value |
| disambiguation | N/A | 0 | Error message -- ask user to narrow |

---

## Recursion Guard

Re-classification after context resolution (follow-up path) MUST NOT produce
another `follow-up`. If it does, stop immediately and emit:

> "Could not resolve context reference. Please name the pattern explicitly."
