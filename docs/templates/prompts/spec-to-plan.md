# Spec to Plan Prompt

You are a senior engineer. Analyze the technical specification and prepare an implementation plan only.

## Input
- Specification: `<path/to/spec.md>`
- Project context: `<docs/system.md>`
- Constraints:
  - Do not change unrelated modules.
  - Do not add new dependencies without explicit rationale.
  - Stay inside Scope / Out of Scope.

## Tasks
1. Summarize your understanding of the feature (5-8 bullets).
2. Provide a step-by-step implementation plan.
3. List impacted files/modules and why.
4. List risks and open questions.
5. Define acceptance checks and verification strategy.

## Output format
- Use sections exactly matching Tasks 1-5.
- If ambiguity exists, ask clarifying questions before proposing code.
