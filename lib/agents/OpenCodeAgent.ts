import { Agent } from '../PlanningLoop';
import { createOpenCodeSession, extractSdkText } from '../opencodeSdk';

export interface OpenCodeOptions {
  cwd: string;
  model?: string;
  agent?: string;
}

export class OpenCodeAgent implements Agent {
  name = 'OpenCode';

  constructor(private options: OpenCodeOptions) {}

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

    const { client, session } = await createOpenCodeSession({
      cwd: this.options.cwd,
      model: this.options.model,
      agent: this.options.agent
    });

    try {
      const result = await session.prompt(prompt);
      const text = extractSdkText(result).trim();
      if (!text) {
        throw new Error('OpenCode SDK returned an empty plan response.');
      }
      return text;
    } finally {
      await client.dispose?.();
    }
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

    const { client, session } = await createOpenCodeSession({
      cwd: this.options.cwd,
      model: this.options.model,
      agent: this.options.agent
    });

    try {
      await session.prompt(prompt);
    } finally {
      await client.dispose?.();
    }
  }
}
