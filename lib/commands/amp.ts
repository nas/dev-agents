import { AmpAgent } from '../agents/AmpAgent';
import { PlanningLoop } from '../PlanningLoop';
import { runTests } from '../../helpers';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';
import { buildBranchName, ensureFeatureBranch, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';
import { select } from '@inquirer/prompts';

export async function runAmp(argv: string[]) {
  const skipTests = argv.includes('--skip-tests');
  const skipPR = argv.includes('--no-pr');
  let dangerouslyAllowAll = argv.includes('--dangerous');

  const { targetPath, ticket, task, ticketDescription } = await loadTicketContext({
    requireAider: false,
    requireGh: !skipPR,
    requireLinear: true
  });

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

  const branchName = buildBranchName(ticket);

  const agent = new AmpAgent({
    cwd: targetPath,
    dangerouslyAllowAll
  });

  const loop = new PlanningLoop(agent, {
    onPlanApproved: async () => {
      summary.planApproved = true;
      summary.branchName = branchName;
      ensureFeatureBranch(targetPath, ticket);
    },
    afterImplementation: async () => {
      summary.changedFiles = getChangedFiles(targetPath);

      if (skipTests) {
        console.log("\n⏭️  Skipping tests as requested (--skip-tests)");
        summary.testPassed = true;
      } else {
        // Test loop
        let maxFixAttempts = 3;
        let attempt = 0;
        console.log("\n🧪 Starting test verification phase...\n");

        while (attempt < maxFixAttempts) {
          const testResult = runTests(targetPath);
          if (testResult.passed) {
            summary.testPassed = true;
            summary.testAttempts = attempt + 1;
            break;
          }

          console.log("\n❌ Tests failed. Attempting to fix...\n");
          attempt++;
          summary.testAttempts = attempt;

          if (attempt >= maxFixAttempts) {
            const continueFix = await select({
              message: 'Tests are still failing. Continue fixing?',
              choices: [
                { name: 'Yes, try again', value: 'y' },
                { name: 'No, proceed anyway', value: 'n' }
              ]
            });
            if (continueFix === 'n') break;
            attempt = 0;
          }

          // Ask agent to fix
          const fixPrompt = `The tests are failing. Here's the test output:\n\n${testResult.output}\n\nPlease analyze the test failures and fix the issues to make all tests pass.`;

          try {
            const { execute } = await import('@sourcegraph/amp-sdk');
            for await (const message of execute({
              prompt: fixPrompt,
              options: {
                cwd: targetPath,
                dangerouslyAllowAll: dangerouslyAllowAll ?? true
              }
            })) {
              if (message.type === 'result') {
                if (message.is_error) {
                  console.error(`Fix attempt failed: ${message.error}`);
                }
                break;
              }
            }
          } catch (error: any) {
            console.error(`Error running fix: ${error.message}`);
          }
        }
      }

      const postResult = await runPostImplementation({
        targetPath,
        ticket,
        skipPr: skipPR,
        ticketDescription
      });
      summary.prCreated = postResult.prCreated;
    }
  });

  try {
    await loop.run(task);
  } catch (e) {
    // ignore
  } finally {
    summary.endTime = new Date();
    generateSummary(summary);
  }
}
