# Repository Guidelines

## Project Structure & Module Organization
- Root-level TypeScript CLI; there is no `src/` directory.
- `start-feature.ts` is the entrypoint that orchestrates the workflow.
- `run-conductor.ts` is the interactive wrapper for the Gemini Conductor CLI.
- `helpers.ts` contains git/test helpers and Linear ticket selection.
- `aider.ts` wraps the `aider` CLI for planning and implementation.
- `utils.ts` provides CLI help text, progress UI, and summary reporting.
- `config.ts` centralizes repository and model configuration.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npx tsx start-feature.ts` runs the interactive feature builder.
- `npx tsx run-conductor.ts` runs the Gemini Conductor CLI wrapper.
- `npx tsx start-feature.ts --help` shows CLI usage and flags.
- `npm run start:feature` runs `node start-feature.ts` (use `tsx` if your Node runtime cannot execute TypeScript directly).
- `npm test` runs local unit tests.

## Coding Style & Naming Conventions
- TypeScript with ES module imports, two-space indentation, single quotes, and semicolons.
- Filenames are lowercase; use hyphens for multiword entrypoints (e.g., `start-feature.ts`).
- Use `camelCase` for functions/variables, `PascalCase` for classes, and `SCREAMING_SNAKE_CASE` for constants.

## Testing Guidelines
- This repo does not ship unit tests. The CLI runs `npm run test` in the selected target repo.
- If you add tests here, update `npm test` and document the framework in this file.

## Commit & Pull Request Guidelines
- Prefer Conventional Commit-style messages (`feat: ...`, `fix: ...`); recent history mostly follows this.
- Branches default to `feature/{TICKET}-{slug}` unless a Linear ticket provides `branchName`.
- PRs should include a short summary, testing results (or why skipped), and a linked Linear issue.

## Required Branch & PR Workflow
- Before making any change, create a new branch (never commit on `main`).
- After work is complete, push the branch and open a PR.
- Preferred flow: `git checkout -b feature/ABC-123-short-title` → commit → `git push -u origin feature/ABC-123-short-title` → `gh pr create --title "ABC-123: Short title" --body "Fixes https://linear.app/..."`

## Security & Configuration Tips
- Use a local `.env` file for `LINEAR_API_KEY` and AI provider keys (`GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, or `AIDER_API_KEY`).
- Do not commit secrets. The CLI expects `aider` and `gh` to be installed and available on `PATH`.
