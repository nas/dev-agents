import { GeminiAgent, GeminiOptions } from '../agents/GeminiAgent';
import { PlanningLoop } from '../PlanningLoop';
import { ensureFeatureBranch, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';

function parseArgs(argv: string[]): { options: GeminiOptions; ignoredTask?: string; skipPr: boolean } {
  let ignoredTask: string | undefined;
  const options: GeminiOptions = { extensions: ['conductor'] };
  let skipPr = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--task') ignoredTask = argv[++i];
    else if (arg === '--model') options.model = argv[++i];
    else if (arg === '--extensions') options.extensions = argv[++i].split(',');
    else if (arg === '--approval-mode') options.approvalMode = argv[++i];
    else if (arg === '--allowed-tools') options.allowedTools = argv[++i].split(',');
    else if (arg === '--debug') options.debug = true;
    else if (arg === '--no-pr') skipPr = true;
  }
  
  return { options, ignoredTask, skipPr };
}

export async function runConductor(argv: string[]) {
  const { options, ignoredTask, skipPr } = parseArgs(argv);
  if (ignoredTask) {
    console.log('⚠️  --task is ignored when using Linear ticket selection.');
  }

  const { targetPath, task, ticket } = await loadTicketContext({
    requireAider: false,
    requireGh: !skipPr,
    requireLinear: true
  });

  options.cwd = targetPath;
  const agent = new GeminiAgent(options);
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
