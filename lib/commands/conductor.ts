import { input } from '@inquirer/prompts';
import { GeminiAgent, GeminiOptions } from '../agents/GeminiAgent';
import { PlanningLoop } from '../PlanningLoop';

function parseArgs(argv: string[]): { task?: string; options: GeminiOptions } {
  // ... Simplified arg parsing ...
  let task: string | undefined;
  const options: GeminiOptions = { extensions: ['conductor'] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--task') task = argv[++i];
    else if (arg === '--model') options.model = argv[++i];
    else if (arg === '--extensions') options.extensions = argv[++i].split(',');
    else if (arg === '--approval-mode') options.approvalMode = argv[++i];
    else if (arg === '--allowed-tools') options.allowedTools = argv[++i].split(',');
    else if (arg === '--debug') options.debug = true;
    else if (!arg.startsWith('-')) task = arg;
  }
  
  return { task, options };
}

export async function runConductor(argv: string[]) {
  const { task: initialTask, options } = parseArgs(argv);
  
  let task = initialTask;
  if (!task) {
    task = await input({
      message: 'What task should Gemini Conductor solve?',
      validate: (value: string) => (value.trim() ? true : 'Please describe the task.')
    });
  }

  const agent = new GeminiAgent(options);
  const loop = new PlanningLoop(agent);
  await loop.run(task);
}
