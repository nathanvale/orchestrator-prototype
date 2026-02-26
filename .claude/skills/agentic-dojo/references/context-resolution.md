# Context Resolution

**Purpose:** Resolves pattern context from prior conversation when `query_type = follow-up` or `structured follow-up`. 1-message lookback only.

---

## Resolution Algorithm

```
When query_type = follow-up:

1. Check most recent assistant message for:
   a. dojo-envelope block  -> extract patterns_selected[0]
   b. advisor-envelope block -> extract ranked_patterns[0].slug

2. Envelope found and pattern resolved:
   Re-classify with resolved pattern; continue normal routing cascade.
   MUST NOT produce another follow-up (recursion guard -- see Precedence table).

3. No envelope found, parse fails, or required fields missing:
   Hard error: "No pattern context found in recent conversation.
   Please specify a pattern name, or try: /dojo help to see available patterns."
```

---

## Ordinal Resolution

When an `advisor-envelope` ranked list is present and the user says `first/second/third`, resolve to `ranked_patterns[N-1]`. If no ordinal, default to `ranked_patterns[0]`.

---

## `--context-pattern=<slug>` (Structured Follow-up)

Skip envelope resolution entirely. Extract slug directly from flag. Validate slug against pattern catalog. Flag is repeatable (supports compare: `--context-pattern=task-dag --context-pattern=wave-computation`).

---

## Cross-Skill Bridge

Parses `advisor-envelope` from the prior turn to extract `ranked_patterns[0].slug`. Does NOT invoke the advisor skill -- read the envelope only.

---

## Precedence Contract

| Case | Behavior |
|------|----------|
| `--context-pattern=<slug>` provided and slug is invalid | Hard error: "Unknown context pattern `<slug>`" (no fallback) |
| Pronoun follow-up and envelope parse fails/missing | Hard error: "No pattern context found..." (no fallback) |
| Pronoun follow-up resolves to advisor ranked list + ordinal intent | Resolve ordinal if present, else default to first ranked pattern |
| Re-classification after resolution yields follow-up again | Stop and emit "No pattern context found..." (recursion guard) |
| Explicit patterns in current query conflict with resolved context | Explicit current-query patterns win |

---

> **Warning:** Context resolution requires main-thread conversation access. If the dojo skill is ever changed to `context: fork`, follow-up resolution will break entirely.
