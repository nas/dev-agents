import { CodexAgent, CodexOptions } from '../agents/CodexAgent';
import { PlanningLoop } from '../PlanningLoop';
import { ensureFeatureBranch, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';

export async function runCodex(argv: string[]) {
  const skipPr = argv.includes('--no-pr');
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

  const { targetPath, task, ticket } = await loadTicketContext({
    requireAider: false,
    requireGh: !skipPr,
    requireLinear: true
  });

  const options: CodexOptions = { cwd: targetPath, model, profile };
  const agent = new CodexAgent(options);
  const loop = new PlanningLoop(agent, {
    onPlanApproved: async () => {
      ensureFeatureBranch(targetPath, ticket);
    },
    afterImplementation: async () => {
      await runPostImplementation({
        targetPath,
        ticket,
        skipPr
      });
    }
  });

  await loop.run(task);
}
