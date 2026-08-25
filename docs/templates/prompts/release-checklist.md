# Release Checklist Prompt

Run a pre-release quality gate and provide a Go/No-Go recommendation.

## Input
- Target PR/branch: `<link or name>`
- Specification: `<path/to/spec.md>`
- Build/test context: `<commands and environment>`

## Checklist
- [ ] Scope implemented
- [ ] Out of Scope respected
- [ ] Acceptance criteria satisfied
- [ ] Lint/test/build passing
- [ ] No blocking security issues
- [ ] Documentation updated
- [ ] Rollback plan is clear

## Output format
- Table: `Item | Status (OK/FAIL) | Notes`
- Blockers section
- Final recommendation: `Go` or `No-Go` with justification

## Rules
- Be strict on blockers.
- Highlight uncertain areas explicitly.
