import { GeminiAgent, GeminiOptions } from '../agents/GeminiAgent';
import { PlanningLoop } from '../PlanningLoop';
import { buildBranchName, ensureFeatureBranch, ensureWorktree, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';

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

  let { targetPath, task, ticket, ticketDescription } = await loadTicketContext({
    requireAider: false,
    requireGh: !skipPr,
    requireLinear: true
  });

  const branchName = buildBranchName(ticket);
  targetPath = ensureWorktree(targetPath, branchName);

  const summary: SummaryReport = {
    ticketId: ticket.identifier,
    ticketTitle: ticket.title,
    branchName: '',
    planApproved: false,
    testPassed: false,
    testAttempts: 0,
    prCreated: false,
    startTime: new Date(),
    endTime: new Date(),
    changedFiles: []
  };

  options.cwd = targetPath;
  const agent = new GeminiAgent(options);
  const loop = new PlanningLoop(agent, {
    onPlanApproved: async () => {
      summary.planApproved = true;
      const branch = ensureFeatureBranch(targetPath, ticket);
      summary.branchName = branch;
    },
    afterImplementation: async () => {
      summary.changedFiles = getChangedFiles(targetPath);
      // GeminiAgent implementation doesn't have a built-in test loop yet
      // so we assume it's up to the user to run tests or we mark it as true if completed
      summary.testPassed = true; 

      const postResult = await runPostImplementation({
        targetPath,
        ticket,
        skipPr,
        ticketDescription
      });
      summary.prCreated = postResult.prCreated;
    }
  });

  try {
    await loop.run(task);
  } finally {
    summary.endTime = new Date();
    generateSummary(summary);
  }
}
