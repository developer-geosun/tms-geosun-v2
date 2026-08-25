# Feature Implementation Prompt

Implement the feature strictly according to the specification.

## Input
- Specification: `<path/to/spec.md>`
- Project context: `<docs/system.md>`
- Source code: current repository state

## Constraints
- Stay within Scope / Out of Scope.
- Keep current architecture and conventions.
- Do not add dependencies without explicit justification.
- Avoid unrelated refactors.
- Add short comments only for non-obvious logic.

## Required response
1. Short plan (max 8 steps).
2. Changed files list with rationale.
3. Implementation details.
4. Verification commands (`lint`, `test`, `build`) and expected results.
5. Risks, trade-offs, and known gaps.

## Quality bar
- No regression in existing behavior.
- Consistent naming and code style.
- Clear error handling for edge cases in scope.
