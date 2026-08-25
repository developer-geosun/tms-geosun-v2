# Templates Guide

This folder contains reusable templates for specifications and AI prompts.

## Structure
- `specs/` - technical specification templates.
- `prompts/` - prompt templates for common development workflows.

## Specification templates
- `specs/_template.md`  
  Universal bilingual (RU/EN) technical specification template.

## Prompt templates
- `prompts/spec-to-plan.md`  
  Use when you need an implementation plan from a specification, without coding.

- `prompts/feature-implementation.md`  
  Use when you want full feature implementation based on a specification.

- `prompts/bugfix.md`  
  Use when fixing a specific bug with minimal safe changes.

- `prompts/code-review.md`  
  Use for risk-focused review of a diff or pull request.

- `prompts/release-checklist.md`  
  Use before release to run a quality gate and decide Go/No-Go.

## Recommended flow
1. Copy `specs/_template.md` into a feature-specific file and fill it.
2. Run `prompts/spec-to-plan.md` to confirm scope and implementation steps.
3. Run `prompts/feature-implementation.md` (or `prompts/bugfix.md`) to implement.
4. Run `prompts/code-review.md` before merge.
5. Run `prompts/release-checklist.md` before release.

## Naming suggestions
- Specs: `docs/specs/<feature-name>.md`
- Prompts for experiments: `docs/prompts/<date>-<topic>.md`

Keep templates stable, and create task-specific copies instead of editing templates directly.
