# TypeScript Style Guide

This guide reflects the conventions used in this repository.

## Formatting
- Two-space indentation.
- Single quotes for strings.
- Always include semicolons.
- Use ES module imports/exports.

## Naming
- `camelCase` for variables, functions, and methods.
- `PascalCase` for classes, interfaces, types, and enums.
- `SCREAMING_SNAKE_CASE` for constants.
- Filenames are lowercase; use hyphens for multiword entrypoints.

## Language Usage
- Prefer `const` and only use `let` when reassignment is required.
- Avoid `any`; use `unknown` or specific types.
- Use optional parameters/fields (`?`) instead of `| undefined` where possible.

## Exports and Modules
- Prefer named exports.
- Avoid `namespace`.

## Comments
- Comment *why*, not *what*.
- Keep comments short and high-signal.
