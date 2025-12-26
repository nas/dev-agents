import { Agent } from '../PlanningLoop';
import { ProcessRunner } from '../ProcessRunner';

export interface GeminiOptions {
    model?: string;
    approvalMode?: string;
    extensions?: string[];
    debug?: boolean;
    allowedTools?: string[];
}

export class GeminiAgent implements Agent {
  name = 'Gemini Conductor';

  constructor(private options: GeminiOptions) {}

  private buildArgs(options: GeminiOptions, extraArgs: string[] = []): string[] {
    const args: string[] = [];
    if (options.model) {
      args.push('-m', options.model);
    }
    if (options.debug) {
      args.push('--debug');
    }
    if (options.extensions && options.extensions.length > 0) {
      args.push('--extensions', options.extensions.join(','));
    }
    if (options.approvalMode) {
      args.push('--approval-mode', options.approvalMode);
    }
    if (options.allowedTools && options.allowedTools.length > 0) {
      args.push('--allowed-tools', options.allowedTools.join(','));
    }
    args.push(...extraArgs);
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
Do not edit files or run commands.
Output only the revised plan as numbered steps.`;
    } else {
        prompt = `Task:
${task}

You are the Gemini Conductor agent for this repository.
Use the conductor guidelines in the repo for context.
Create a concise, numbered solution plan.
Do not edit files or run commands.
Output only the plan.`;
    }

    const planOptions: GeminiOptions = {
        ...this.options,
        allowedTools: []
    };
    const args = this.buildArgs(planOptions, ['--output-format', 'text', prompt]);

    // Use ignore for stdin to avoid hanging if it expects input, but here we pass prompt as arg
    // But wait, start-gemini-conductor puts prompt as the last argument
    
    return await ProcessRunner.runAndCapture('gemini', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  async implement(task: string, plan: string): Promise<void> {
    const prompt = `Task:
${task}

Approved plan:
${plan}

Implement the plan in this repository.
Follow existing code style and patterns.
If tests are available, run them and fix failures.`;

    const implementationOptions: GeminiOptions = {
        ...this.options,
        allowedTools: this.options.allowedTools && this.options.allowedTools.length > 0
          ? this.options.allowedTools
          : ['run_shell_command', 'write_file', 'replace']
    };
    const args = this.buildArgs(implementationOptions, [prompt]);

    await ProcessRunner.run('gemini', args, { stdio: 'inherit' });
  }
}
