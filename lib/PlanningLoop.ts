import { input, select } from '@inquirer/prompts';
import { ProgressIndicator } from '../utils';

export interface Agent {
  name: string;
  generatePlan(task: string, previousPlan?: string, feedback?: string): Promise<string>;
  implement(task: string, plan: string): Promise<void>;
}

export interface PlanningLoopHooks {
  onPlanApproved?: (plan: string) => Promise<void | boolean>;
  afterImplementation?: () => Promise<void>;
}

export class PlanningLoop {
  constructor(private agent: Agent, private hooks?: PlanningLoopHooks) {}

  async run(initialTask: string): Promise<void> {
    let task = initialTask;
    let planText = '';
    let isFirstRun = true;
    let feedback = '';
    const progress = new ProgressIndicator();

    console.log(`
🤖 Starting planning session with ${this.agent.name}...
`);

    while (true) {
      const message = isFirstRun ? 'Generating initial plan...' : 'Updating plan...';
      progress.start(message);
      
      try {
        if (isFirstRun) {
            planText = await this.agent.generatePlan(task);
        } else {
            planText = await this.agent.generatePlan(task, planText, feedback);
        }
        progress.stop();
      } catch (error: any) {
        progress.stop();
        console.error(error);
        console.error(`
❌ Error generating plan: ${error.message}`);
        const action = await select({
            message: 'How would you like to proceed?',
            choices: [
                { name: 'Retry', value: 'retry' },
                { name: 'Cancel', value: 'cancel' }
            ]
        });
        if (action === 'cancel') return;
        continue;
      }

      isFirstRun = false;

      console.log('\n' + '='.repeat(60));
      console.log('PROPOSED PLAN');
      console.log('='.repeat(60));
      console.log(planText);
      console.log('='.repeat(60));

      const decision = await select({
        message: 'How would you like to proceed?',
        choices: [
          { name: '✅ Approve and implement', value: 'approve' },
          { name: '✏️  Request changes', value: 'modify' },
          { name: '❌ Cancel', value: 'cancel' }
        ]
      });

      if (decision === 'approve') {
        if (this.hooks?.onPlanApproved) {
            const shouldContinue = await this.hooks.onPlanApproved(planText);
            if (shouldContinue === false) return;
        }
        break;
      }

      if (decision === 'cancel') {
        console.log('Exiting without changes.');
        return;
      }

      feedback = await input({
        message: 'Describe the changes you want in the plan:',
        validate: (value: string) => (value.trim() ? true : 'Please enter your requested changes.')
      });
    }

    console.log('\n🚀 Starting implementation...');
    try {
      await this.agent.implement(task, planText);
      
      if (this.hooks?.afterImplementation) {
          await this.hooks.afterImplementation();
      }

      console.log('\n✅ Implementation completed.');
    } catch (error: any) {
      console.error(`
❌ Implementation failed: ${error.message}`);
      process.exit(1);
    }
  }
}
