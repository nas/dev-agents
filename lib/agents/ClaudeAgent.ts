import { Agent } from '../PlanningLoop';
import { ProcessRunner } from '../ProcessRunner';

export interface ClaudeOptions {
  cwd: string;
  model?: string;
}

export class ClaudeAgent implements Agent {
  name = 'Claude';

  constructor(private options: ClaudeOptions) {}

  private buildArgs(baseArgs: string[]): string[] {
    const args = [...baseArgs];
    if (this.options.model) {
      args.push('--model', this.options.model);
    }
    return args;
  }

  async generatePlan(task: string, previousPlan?: string, feedback?: string): Promise<string> {
    let prompt = '';
    if (previousPlan && feedback) {
      prompt = `Task:
${task}

Previous plan:
${previousPlan}

Requested changes:
${feedback}

Update the plan accordingly.
Do not make code changes or run commands.
Output only the revised plan as numbered steps.`;
    } else {
      prompt = `Task:
${task}

Create a concise, numbered implementation plan for this repository.
Do not make code changes or run commands.
Output only the plan.`;
    }

    // Use --print for non-interactive output, --dangerously-skip-permissions to avoid prompts
    const args = this.buildArgs(['--print', '--dangerously-skip-permissions', '-p', prompt]);

    const plan = await ProcessRunner.runAndCapture('claude', args, {
      cwd: this.options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'] // Close stdin to prevent hanging
    });

    return plan.trim();
  }

  async implement(task: string, plan: string): Promise<void> {
    const prompt = `Task:
${task}

Approved Implementation Plan:
${plan}

Now implement this feature according to the approved plan above.
Do not ask for confirmation or propose additional steps; proceed to apply changes immediately.
If you would normally ask to confirm, treat this as already confirmed and continue.

IMPORTANT INSTRUCTIONS:
1. Create any NEW files mentioned in the plan that don't exist yet (create the full directory structure if needed)
2. Modify any EXISTING files mentioned in the plan
3. Follow the exact code style and patterns found in the existing codebase
4. Ensure all steps outlined in the plan are completed`;

    // Use --dangerously-skip-permissions for implementation to avoid interactive prompts
    const args = this.buildArgs(['--dangerously-skip-permissions', '-p', prompt]);

    await ProcessRunner.run('claude', args, {
      cwd: this.options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'], // Close stdin to prevent hanging
      onOutput: (data) => process.stdout.write(data),
      onErrorOutput: (data) => process.stderr.write(data)
    });
  }
}
