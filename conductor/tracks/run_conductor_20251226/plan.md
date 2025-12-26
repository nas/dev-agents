# Plan: Run Conductor Script

This plan outlines the steps to create `run-conductor.ts`, an interactive wrapper for the Gemini Conductor CLI.

## Phase 1: Setup and Scaffolding
- [x] Task: Create feature branch `feature/run-conductor-script` a9a4a1b
- [x] Task: Create initial `run-conductor.ts` with basic boilerplate (imports, `dotenv`, `main` function) c5fdca0
    - [x] Write Tests: Verify `dotenv` is loaded and `main` is called.
    - [x] Implement Feature: Basic script structure.
- [x] Task: Implement `showHelp` function and argument parsing (similar to `start-codex.ts`) 933063c
    - [x] Write Tests: Verify `--help` displays help and exits.
    - [x] Implement Feature: `showHelp` and `process.argv` parsing.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup and Scaffolding' (Protocol in workflow.md)

## Phase 2: Interactive Menu and Command Routing
- [x] Task: Implement main interactive menu using `@inquirer/prompts`
    - [x] Write Tests: Mock `select` and verify menu options (New Track, Implement, Exit).
    - [x] Implement Feature: Main menu loop.
- [x] Task: Implement command routing logic for "New Track"
    - [x] Write Tests: Verify selecting "New Track" calls the appropriate internal function.
    - [x] Implement Feature: Route to new track logic.
- [x] Task: Implement command routing logic for "Implement Track"
    - [x] Write Tests: Verify selecting "Implement Track" calls the appropriate internal function.
    - [x] Implement Feature: Route to implement track logic.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Interactive Menu and Command Routing' (Protocol in workflow.md)

## Phase 3: Conductor CLI Wrapping
- [x] Task: Implement `spawn` wrapper to execute `gemini` commands
    - [x] Write Tests: Mock `spawn` and verify it is called with correct arguments for a given command.
    - [x] Implement Feature: Helper to run `gemini` subcommands.
- [x] Task: Finalize "New Track" wrapper logic
    - [x] Write Tests: Verify `gemini /conductor:newTrack` is invoked.
    - [x] Implement Feature: Connect menu to CLI for new track.
- [x] Task: Finalize "Implement Track" wrapper logic
    - [x] Write Tests: Verify `gemini /conductor:implement` is invoked.
    - [x] Implement Feature: Connect menu to CLI for implement.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Conductor CLI Wrapping' (Protocol in workflow.md)

## Phase 4: Finalization
- [x] Task: Perform end-to-end manual testing of the new script
- [x] Task: Update project documentation (if any) to mention `run-conductor.ts`
- [x] Task: Conductor - User Manual Verification 'Phase 4: Finalization' (Protocol in workflow.md)
