# Specification: Run Conductor Script

## Overview
Create a new TypeScript script named `run-conductor.ts` that serves as an interactive wrapper for the Gemini Conductor CLI. This script will mimic the user experience of `start-codex.ts`, providing a guided workflow for creating new tracks and implementing features using Conductor.

## Functional Requirements
1.  **Script Name & Execution:**
    -   The script must be named `run-conductor.ts`.
    -   It must be executable via `npx tsx run-conductor.ts`.

2.  **Interactive Wrapper:**
    -   The script must act as a wrapper around the `gemini` CLI commands for Conductor.
    -   It should present an interactive menu to the user to select the desired Conductor operation.

3.  **Supported Commands:**
    -   **New Track:** Support wrapping the `/conductor:newTrack` command.
    -   **Implement:** Support wrapping the `/conductor:implement` command.

4.  **Environment Management:**
    -   The script must load environment variables (using `dotenv`) before executing Conductor commands to ensure the environment is correctly configured.

## Non-Functional Requirements
-   **Consistency:** The code style and structure should match `start-codex.ts` and the existing project conventions (TypeScript, `inquirer` for prompts).
-   **User Experience:** The interactive prompts should be clear and consistent with the existing `start-feature` and `start-codex` scripts.

## Acceptance Criteria
-   [ ] `run-conductor.ts` exists in the project root.
-   [ ] Running `npx tsx run-conductor.ts` presents a menu with options to "Create New Track" and "Implement Track".
-   [ ] Selecting "Create New Track" successfully invokes `/conductor:newTrack`.
-   [ ] Selecting "Implement Track" successfully invokes `/conductor:implement`.
-   [ ] Environment variables are loaded correctly.
