# Product Guidelines

## Tone and Voice
- **Operator-friendly:** Short prompts and outputs that are easy to scan.
- **Lightweight status cues:** Emoji status markers are acceptable and already used in output.

## Error Handling
- **Fail fast:** Exit on missing environment requirements or invalid paths.
- **Actionable messages:** Include the root error and a clear next step when possible.

## Interaction Model
- **Interactive by default:** Use prompts for repo selection, ticket selection, and plan approval.
- **Flags for common skips:** Support `--no-pr`, `--skip-tests`, and `--dry-run` where applicable.
- **Pass-through for agent launcher:** Require `--` when forwarding flags via `agent`.

## Visual Interface
- **Clean console output:** Prefer short blocks and consistent status lines.
- **No heavy UI:** Avoid large ASCII art or verbose banners.

## Documentation
- **Usage blocks:** Keep command usage aligned with `bin/ai-ops.ts` and agent-specific flags.
- **Keep docs current:** Update help text and docs together when flags or workflows change.
