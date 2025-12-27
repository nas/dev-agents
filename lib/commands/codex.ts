import { CodexAgent, CodexOptions } from '../agents/CodexAgent';
import { PlanningLoop } from '../PlanningLoop';
import { buildBranchName, ensureFeatureBranch, ensureWorktree, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';

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

  const options: CodexOptions = { cwd: targetPath, model, profile };
  const agent = new CodexAgent(options);
  const loop = new PlanningLoop(agent, {
    onPlanApproved: async () => {
      summary.planApproved = true;
      const branch = ensureFeatureBranch(targetPath, ticket);
      summary.branchName = branch;
    },
    afterImplementation: async () => {
      summary.changedFiles = getChangedFiles(targetPath);
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
