# Product Guidelines

## Tone and Voice
- **System-oriented:** The CLI should maintain a minimalist, UNIX-style approach, focusing on efficiency and standard stream behavior.

## Error Handling
- **Technical Accuracy:** Provide raw technical details and system error codes for precise debugging.
- **Actionable Guidance:** Complement technical details with clear steps for resolution where possible.
- **Fail-Fast:** The system should terminate immediately upon encountering a critical error, using appropriate non-zero exit codes.

## Interaction Model
- **Hybrid Interactivity:** Prioritize command-line flags and arguments for automation and power users, while providing interactive prompts as a fallback for missing required information.

## Visual Interface
- **Enhanced Feedback:** Utilize ANSI colors, progress bars, and spinners to provide clear visual state indicators during long-running operations.

## Documentation
- **Man-page Style Help:** Provide comprehensive and structured help documentation directly through the `--help` flag.
