# Product Guide

## Purpose
Provide a CLI that orchestrates ticket-to-PR workflows by combining planning, implementation, and optional PR creation across multiple AI agents.

## Target Users
- Developers and maintainers who want a guided, repeatable workflow for Linear tickets.

## Core Value Proposition
Select a repo and ticket, review a generated plan, implement with a chosen agent, and optionally commit and open a PR from a single CLI.

## Key Features
- **Linear ticket selection:** Pulls assigned tickets or creates an ad-hoc task.
- **Agent choice:** Aider builder, Gemini Conductor, Codex, or Amp Agent.
- **Plan review loop:** Interactive approve/revise/cancel flow.
- **Automated Implementation:** Hybrid manual/automated implementation via Amp SDK.
- **Branch automation:** Uses Linear branch names or `feature/<id>-<slug>`.
- **Optional testing:** Aider can run `npm run test` and retry fixes.
- **Optional PR creation:** Pushes and opens a PR via `gh`.

## Developer Experience
- **CLI-first:** Interactive prompts with minimal configuration.
- **Transparent steps:** Clear prompts for plan approval, commits, and PRs.
