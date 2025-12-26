import { Agent } from '../PlanningLoop';
import { ProcessRunner } from '../ProcessRunner';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CodexOptions {
  cwd: string;
  model?: string;
  profile?: string;
}

export class CodexAgent implements Agent {
  name = 'Codex';

  constructor(private options: CodexOptions) {}

  private getTempFile(prefix: string, filename: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    return path.join(dir, filename);
  }

  private buildArgs(baseArgs: string[]): string[] {
    const args = [...baseArgs];
    if (this.options.model) {
      args.push('--model', this.options.model);
    }
    if (this.options.profile) {
      args.push('--profile', this.options.profile);
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

    const outputFile = this.getTempFile('codex-plan-', 'plan.txt');
    const args = this.buildArgs(['exec', '-C', this.options.cwd, '-s', 'read-only', '--output-last-message', outputFile, '-']);

    await ProcessRunner.run('codex', args, { 
        input: prompt,
        stdio: ['pipe', 'pipe', 'pipe'] // Plan is written to file, but we capture stderr/stdout too
    });

    try {
        const plan = fs.readFileSync(outputFile, 'utf-8').trim();
        return plan;
    } catch (error: any) {
        throw new Error(`Failed to read plan output: ${error.message}`);
    }
  }

  async implement(task: string, plan: string): Promise<void> {
    const prompt = `Task:
${task}

Approved plan:
${plan}

Implement the plan in this repository.
Follow existing code style and patterns.
If tests are available, run them and fix failures.`;

    const args = this.buildArgs(['exec', '-C', this.options.cwd, '--full-auto', '-']);

    await ProcessRunner.run('codex', args, { 
        input: prompt, 
        stdio: 'inherit' 
    });
  }
}
