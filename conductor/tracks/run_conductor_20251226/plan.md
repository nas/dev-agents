# Plan: Run Conductor Script

This plan outlines the steps to create `run-conductor.ts`, an interactive wrapper for the Gemini Conductor CLI.

## Phase 1: Setup and Scaffolding
- [~] Task: Create feature branch `feature/run-conductor-script`
- [ ] Task: Create initial `run-conductor.ts` with basic boilerplate (imports, `dotenv`, `main` function)
    - [ ] Write Tests: Verify `dotenv` is loaded and `main` is called.
    - [ ] Implement Feature: Basic script structure.
- [ ] Task: Implement `showHelp` function and argument parsing (similar to `start-codex.ts`)
    - [ ] Write Tests: Verify `--help` displays help and exits.
    - [ ] Implement Feature: `showHelp` and `process.argv` parsing.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup and Scaffolding' (Protocol in workflow.md)

## Phase 2: Interactive Menu and Command Routing
- [ ] Task: Implement main interactive menu using `@inquirer/prompts`
    - [ ] Write Tests: Mock `select` and verify menu options (New Track, Implement, Exit).
    - [ ] Implement Feature: Main menu loop.
- [ ] Task: Implement command routing logic for "New Track"
    - [ ] Write Tests: Verify selecting "New Track" calls the appropriate internal function.
    - [ ] Implement Feature: Route to new track logic.
- [ ] Task: Implement command routing logic for "Implement Track"
    - [ ] Write Tests: Verify selecting "Implement Track" calls the appropriate internal function.
    - [ ] Implement Feature: Route to implement track logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Interactive Menu and Command Routing' (Protocol in workflow.md)

## Phase 3: Conductor CLI Wrapping
- [ ] Task: Implement `spawn` wrapper to execute `gemini` commands
    - [ ] Write Tests: Mock `spawn` and verify it is called with correct arguments for a given command.
    - [ ] Implement Feature: Helper to run `gemini` subcommands.
- [ ] Task: Finalize "New Track" wrapper logic
    - [ ] Write Tests: Verify `gemini /conductor:newTrack` is invoked.
    - [ ] Implement Feature: Connect menu to CLI for new track.
- [ ] Task: Finalize "Implement Track" wrapper logic
    - [ ] Write Tests: Verify `gemini /conductor:implement` is invoked.
    - [ ] Implement Feature: Connect menu to CLI for implement.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Conductor CLI Wrapping' (Protocol in workflow.md)

## Phase 4: Finalization
- [ ] Task: Perform end-to-end manual testing of the new script
- [ ] Task: Update project documentation (if any) to mention `run-conductor.ts`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Finalization' (Protocol in workflow.md)
