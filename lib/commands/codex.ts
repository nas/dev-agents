import { input } from '@inquirer/prompts';
import { CodexAgent, CodexOptions } from '../agents/CodexAgent';
import { PlanningLoop } from '../PlanningLoop';

export async function runCodex(argv: string[]) {
  let model: string | undefined;
  const modelIndex = argv.indexOf('--model');
  if (modelIndex !== -1 && modelIndex + 1 < argv.length) {
    model = argv[modelIndex + 1];
  }

  let profile: string | undefined;
  const profileIndex = argv.indexOf('--profile');
  if (profileIndex !== -1 && profileIndex + 1 < argv.length) {
    profile = argv[profileIndex + 1];
  }

  const task = await input({
    message: 'What do you want Codex to design and implement?',
    validate: (value: string) => (value.trim() ? true : 'Please describe the task.')
  });

  const options: CodexOptions = { cwd: process.cwd(), model, profile };
  const agent = new CodexAgent(options);
  const loop = new PlanningLoop(agent);

  await loop.run(task);
}
