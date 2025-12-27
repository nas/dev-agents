import { select } from '@inquirer/prompts';
import { AiderAgent } from '../agents/AiderAgent';
import { PlanningLoop } from '../PlanningLoop';
import { runTests } from '../../helpers';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';
import { ProcessRunner } from '../ProcessRunner';
import { buildBranchName, ensureFeatureBranch, ensureWorktree, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';

export async function runFeature(argv: string[]) {
  const skipTests = argv.includes('--skip-tests');
  const skipPR = argv.includes('--no-pr');
  const dryRun = argv.includes('--dry-run');

  let modelOverride: string | undefined;
  const modelIndex = argv.indexOf('--model');
  if (modelIndex !== -1 && modelIndex + 1 < argv.length) {
    modelOverride = argv[modelIndex + 1];
  }
  
  let editorModelOverride: string | undefined;
  const editorModelIndex = argv.indexOf('--editor-model');
  if (editorModelIndex !== -1 && editorModelIndex + 1 < argv.length) {
    editorModelOverride = argv[editorModelIndex + 1];
  }

  let { configManager, targetPath, ticket, task, ticketDescription } = await loadTicketContext({
    requireAider: true,
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
  targetPath = ensureWorktree(targetPath, branchName);

  const agent = new AiderAgent(configManager, targetPath, modelOverride, editorModelOverride);

  const loop = new PlanningLoop(agent, {
      onPlanApproved: async () => {
          summary.planApproved = true;
          summary.branchName = branchName;
          
          if (dryRun) {
            console.log("\n🚧 DRY RUN COMPLETE (skipping implementation)");
            return false;
          }

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
                 
                 // We reuse implementation method for fixing
                 // But wait, implement() in AiderAgent uses --message.
                 // We can just call ProcessRunner directly or expose a fix method in Agent.
                 // For now, I'll instantiate a new Aider process via ProcessRunner directly or cast agent.
                 // Actually AiderAgent doesn't have a specific 'fix' method but 'implement' calls aider with message.
                 // I can just call agent.implement but the prompt logic inside implement is specific to 'Approved Implementation Plan'.
                 
                 // I should probably expose a generic 'execute' or 'fix' method in AiderAgent or Agent interface.
                 // But for now to save time/refactoring, I will just use ProcessRunner here as I have the config.
                 
                 const args = [
                     '--model', modelOverride || configManager.getConfig().defaultModel,
                     '--message', fixPrompt,
                     '--auto-commits'
                 ];
                 args.push(...configManager.getApiKeyArgs(modelOverride || configManager.getConfig().defaultModel));
                 
                 await ProcessRunner.run('aider', args, { cwd: targetPath, stdio: 'inherit' });
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
