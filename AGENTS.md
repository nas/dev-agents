hello
# Repository Guidelines

## Project Structure & Module Organization
- `bin/ai-ops.ts` is the main entrypoint that orchestrates the workflow.
- `lib/` contains the core logic:
  - `lib/agents/`: Multi-agent implementations (Aider, Gemini, Codex, Amp).
  - `lib/commands/`: CLI command handlers.
  - `lib/ConfigManager.ts`: Centralized configuration and model management.
  - `lib/PlanningLoop.ts`: Orchestrates the plan-approve-implement loop.
  - `lib/ProcessRunner.ts`: Helper for running external CLI tools.
- `helpers.ts` and `utils.ts` in the root provide common utilities and Linear integration.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run aider` or `npx tsx bin/ai-ops.ts aider` runs the Aider feature builder.
- `npm run conductor` or `npx tsx bin/ai-ops.ts conductor` runs the Gemini conductor.
- `npm run codex` or `npx tsx bin/ai-ops.ts codex` runs the Codex builder.
- `npm run amp` or `npx tsx bin/ai-ops.ts amp` runs the Amp agent (this agent).
- `npm run agent` or `npx tsx bin/ai-ops.ts agent` allows interactive agent selection.
- `npm test` runs unit tests using `vitest`.

## Coding Style & Naming Conventions
- TypeScript with ES module imports, two-space indentation, single quotes, and semicolons.
- Filenames are lowercase; use hyphens for multiword entrypoints (e.g., `ai-ops.ts`).
- Use `camelCase` for functions/variables, `PascalCase` for classes, and `SCREAMING_SNAKE_CASE` for constants.

## Testing Guidelines
- Unit tests for this repo are located in `tests/` and use `vitest`.
- The CLI also runs `npm run test` in the selected target repo during implementation.

## Commit & Pull Request Guidelines
- Prefer Conventional Commit-style messages (`feat: ...`, `fix: ...`).
- Branches follow the format `feature/{TICKET}-{slug}`.
- PRs should include a short summary and link to the Linear issue.

## Required Branch & PR Workflow
1. Select a ticket or describe a task via the CLI.
2. Approve the generated implementation plan.
3. The CLI creates the branch and implements the changes.
4. Verify changes (tests are run automatically for Aider).
5. The CLI handles committing and PR creation (via `gh`).

## Security & Configuration Tips
- Use a local `.env` file for API keys (`LINEAR_API_KEY`, `GOOGLE_API_KEY`, etc.).
- Do not commit secrets.
- Ensure `aider` and `gh` are installed and available on `PATH`.