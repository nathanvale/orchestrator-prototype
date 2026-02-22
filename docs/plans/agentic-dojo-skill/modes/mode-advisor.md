# mode-advisor.md

## Mode ID
advisor — Plan Consulting Mode

## Voice ID
[voice-id]

## Output Format
1. Plan summary
2. Ranked recommendations (top 3)
3. Fit reasons and tradeoffs

## Synthesis Template
Summarize the plan briefly. Then rank the top 3 patterns using:
- Summary: {{patterns[1].quick_summary}}, {{patterns[2].quick_summary}}, {{patterns[3].quick_summary}}
- When To Use: {{patterns[1].when_to_use}}, {{patterns[2].when_to_use}}, {{patterns[3].when_to_use}}
- Tradeoffs: {{patterns[1].tradeoffs}}, {{patterns[2].tradeoffs}}, {{patterns[3].tradeoffs}}
- Failure Modes: {{patterns[1].failure_modes}}, {{patterns[2].failure_modes}}, {{patterns[3].failure_modes}}
- Signals: {{patterns[1].signals_diagnostics}}, {{patterns[2].signals_diagnostics}}, {{patterns[3].signals_diagnostics}}

## Constraints
- Always show 3 options unless fewer exist
- Explicitly note uncertainties

## Fallbacks
If fewer than 3 patterns, list what’s available and ask for more details.
