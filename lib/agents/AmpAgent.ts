import { Agent } from '../PlanningLoop';
import { execute } from '@sourcegraph/amp-sdk';

export interface AmpOptions {
  cwd: string;
  dangerouslyAllowAll?: boolean;
}

export class AmpAgent implements Agent {
  name = 'Amp';

  constructor(private options: AmpOptions) {}

  async generatePlan(task: string, previousPlan?: string, feedback?: string): Promise<string> {
    let prompt = '';
    if (previousPlan && feedback) {
      prompt = `Task: ${task}

Previous plan:
${previousPlan}

Requested changes:
${feedback}

Update the plan accordingly.
Do not edit files or run commands.
Output only the revised plan as numbered steps.`;
    } else {
      prompt = `Task: ${task}

Analyze the existing project structure and coding patterns. Create a detailed implementation plan explaining:
1. What NEW files you will create
2. What EXISTING files you will modify
3. What changes you will make
4. How you will follow the existing code style
5. Any dependencies or considerations

Note: It's fine if files mentioned in the plan don't exist yet - they will be created during implementation.
Do not edit files or run commands yet.
Provide ONLY the plan.`;
    }

    let result = '';
    try {
      for await (const message of execute({
        prompt,
        options: {
          cwd: this.options.cwd,
          dangerouslyAllowAll: this.options.dangerouslyAllowAll ?? true
        }
      })) {
        if (message.type === 'result') {
          if (message.is_error) {
            throw new Error(message.error);
          }
          result = message.result;
          break;
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to generate plan: ${error.message}`);
    }

    return result;
  }

  async implement(task: string, plan: string): Promise<void> {
    const prompt = `Task: ${task}

Approved Implementation Plan:
${plan}

Now implement this feature according to the approved plan above.

IMPORTANT INSTRUCTIONS:
1. Create any NEW files mentioned in the plan that don't exist yet (create the full directory structure if needed)
2. Modify any EXISTING files mentioned in the plan
3. Follow the exact code style and patterns found in the existing codebase
4. Ensure all steps outlined in the plan are completed
5. If tests are available, run them and fix any failures`;

    try {
      for await (const message of execute({
        prompt,
        options: {
          cwd: this.options.cwd,
          dangerouslyAllowAll: this.options.dangerouslyAllowAll ?? true
        }
      })) {
        if (message.type === 'assistant') {
          // Stream assistant messages for visibility
          if (message.message?.content?.[0]?.type === 'text') {
            process.stdout.write('.');
          }
        } else if (message.type === 'result') {
          if (message.is_error) {
            throw new Error(message.error);
          }
          // Implementation complete
          break;
        }
      }
    } catch (error: any) {
      throw new Error(`Implementation failed: ${error.message}`);
    }
  }
}
