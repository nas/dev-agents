import { Agent } from '../PlanningLoop';
import { ConfigManager } from '../ConfigManager';
import { ProcessRunner } from '../ProcessRunner';

export class AiderAgent implements Agent {
  name = 'Aider';

  constructor(
    private configManager: ConfigManager, 
    private cwd: string, 
    private modelOverride?: string,
    private editorModelOverride?: string
  ) {}

  async generatePlan(task: string, previousPlan?: string, feedback?: string): Promise<string> {
    const model = this.modelOverride || this.configManager.getConfig().defaultModel;
    const editorModel = this.editorModelOverride || this.configManager.getConfig().defaultEditorModel;

    let prompt = '';
    if (previousPlan && feedback) {
        prompt = `Task: ${task}\n\nPrevious plan output:\n${previousPlan}\n\nPlease update the plan based on these modifications: ${feedback}\n\nProvide an updated plan.`;
    } else {
        prompt = `Task: ${task}\n\nPlease analyze the existing project structure and coding patterns. Create a detailed implementation plan explaining:\n1. What NEW files you will create\n2. What EXISTING files you will modify\n3. What changes you will make\n4. How you will follow the existing code style\n5. Any dependencies or considerations\n\nNote: It's fine if files mentioned in the plan don't exist yet - they will be created during implementation. Provide ONLY the plan, do not implement yet.`;
    }

    const args = [
      '--architect',
      '--model', model,
      '--editor-model', editorModel,
      '--message', prompt,
      '--dry-run',
      '--yes-always',
      '--no-auto-commits',
      '--add-gitignore-files'
    ];

    args.push(...this.configManager.getApiKeyArgs(model));
    args.push(...this.configManager.getApiKeyArgs(editorModel));

    // Input 'A\n' is to auto-answer "add to chat" prompts if they appear, though --yes-always might handle it.
    return await ProcessRunner.runAndCapture('aider', args, { cwd: this.cwd, input: 'A\n' });
  }

  async implement(task: string, plan: string): Promise<void> {
    const model = this.modelOverride || this.configManager.getConfig().defaultModel;
    
    const prompt = `Task: ${task}\n\nApproved Implementation Plan:\n${plan}\n\nNow implement this feature according to the approved plan above.\n\nIMPORTANT INSTRUCTIONS:\n1. Create any NEW files mentioned in the plan that don't exist yet (create the full directory structure if needed)\n2. Modify any EXISTING files mentioned in the plan\n3. Follow the exact code style and patterns found in the existing codebase\n4. Ensure all steps outlined in the plan are completed`;

    const args = [
      '--model', model,
      '--message', prompt,
      '--auto-commits'
    ];

    args.push(...this.configManager.getApiKeyArgs(model));

    await ProcessRunner.run('aider', args, { cwd: this.cwd, stdio: 'inherit' });
  }
}
