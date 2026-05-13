import { OpenCodeAgent, OpenCodeOptions } from '../agents/OpenCodeAgent';
import { PlanningLoop } from '../PlanningLoop';
import { buildBranchName, ensureFeatureBranch, ensureWorktree, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';
import { select } from '@inquirer/prompts';

const OPENCODE_MODELS = [
  'gpt-5.3-codex',
  'gpt-5.2-codex',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
  'gpt-5.2',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'deepseek-chat',
  'deepseek-coder',
  'claude-opus-4-6',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219'
];

export async function runOpencode(argv: string[]) {
  const skipPr = argv.includes('--no-pr');

  let model: string | undefined;
  const modelIndex = argv.indexOf('--model');
  if (modelIndex !== -1 && modelIndex + 1 < argv.length) {
    model = argv[modelIndex + 1];
  }

  if (!model && process.stdin.isTTY && process.stdout.isTTY) {
    model = await select({
      message: 'Select a model:',
      choices: OPENCODE_MODELS.map((name) => ({
        name,
        value: name
      }))
    });
  }

  let agent: string | undefined;
  const agentIndex = argv.indexOf('--agent');
  if (agentIndex !== -1 && agentIndex + 1 < argv.length) {
    agent = argv[agentIndex + 1];
  }

  let { targetPath, task, ticket, ticketDescription } = await loadTicketContext({
    requireAider: false,
    requireGh: !skipPr,
    requireLinear: true,
    requireOpenCode: true
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

  const options: OpenCodeOptions = { cwd: targetPath, model, agent };
  const runner = new OpenCodeAgent(options);
  const loop = new PlanningLoop(runner, {
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
