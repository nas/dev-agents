# Technology Stack

## Core Technologies
- **Programming Language:** TypeScript
- **Runtime Environment:** Node.js
- **CLI Runner:** `tsx` for TypeScript execution

## Key Libraries
- **CLI Prompts:** `inquirer` and `@inquirer/select`
- **Linear Integration:** `@linear/sdk`
- **Environment Management:** `dotenv`
- **Testing:** `vitest` with `@vitest/coverage-v8`

## External CLI Dependencies
- **Git:** Branching and commits
- **GitHub CLI (`gh`):** PR creation
- **Aider (`aider`):** External AI pair programming tool used by the AiderAgent

## Internal Agents
- **AiderAgent:** Wraps the `aider` CLI for feature implementation and planning.
- **GeminiAgent:** Conductor agent for high-level planning and orchestration.
- **CodexAgent:** Specialized agent for codebase analysis and understanding.
