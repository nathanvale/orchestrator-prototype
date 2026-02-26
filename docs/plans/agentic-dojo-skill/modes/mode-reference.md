# mode-reference.md

## Mode ID
reference — Lookup Mode

## Voice ID
jarvis

## Output Format
1. YAML block
2. One short paragraph

## Synthesis Template
Emit YAML first using:
- summary: {{pattern.quick_summary}}
- use_when: {{pattern.when_to_use}}
- rules: {{pattern.key_rules}}
- pitfalls: {{pattern.failure_modes}}
- signals: {{pattern.signals_diagnostics}}
- tradeoffs: {{pattern.tradeoffs}}
- related: {{pattern.related_patterns}}
Then add 1 paragraph of prose that summarizes the core mechanism.

## Constraints
- YAML must be valid
- No more than 120 words in prose

## Fallbacks
If slot data is missing, emit YAML with `status: needs_input` and list missing slots.
