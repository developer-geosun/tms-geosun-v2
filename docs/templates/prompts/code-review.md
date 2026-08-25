# Code Review Prompt

Perform a risk-focused review of the provided diff/PR.

## Input
- Diff/PR: `<link or patch>`
- Specification (optional): `<path/to/spec.md>`
- Project context (optional): `<docs/system.md>`

## Review checklist
- Correctness and logic flaws
- Security risks
- Backward compatibility
- Error handling and edge cases
- Test coverage and missing scenarios
- Maintainability and readability

## Output format
1. Findings sorted by severity: High, Medium, Low.
2. For each finding:
   - Problem
   - Location
   - Why it matters
   - Suggested fix
3. Additional test suggestions.
4. Short overall assessment.

If no issues are found, explicitly state that and list residual risks/testing gaps.
