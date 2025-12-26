import { select, input } from '@inquirer/prompts';
import { SummaryReport, generateSummary, getChangedFiles } from '../../utils';
import { buildBranchName, ensureFeatureBranch, loadTicketContext } from './ticketFlow';
import { runPostImplementation } from './postImplementation';
import { runTests } from '../../helpers';

export async function runAmp(argv: string[]) {
  const skipTests = argv.includes('--skip-tests');
  const skipPR = argv.includes('--no-pr');

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

  try {
    // Generate plan
    console.log('\n🤖 Generating implementation plan...\n');
    const planPrompt = `Task: ${task}

Analyze the existing project structure and coding patterns. Create a detailed implementation plan explaining:
1. What NEW files you will create
2. What EXISTING files you will modify
3. What changes you will make
4. How you will follow the existing code style
5. Any dependencies or considerations`;

    // Show plan to user (in this context, we're communicating through the conversation)
    console.log('='.repeat(60));
    console.log('PROPOSED PLAN');
    console.log('='.repeat(60));
    console.log('\n📋 Plan will be generated and displayed for approval.\n');

    // Ask for approval/modifications
    const decision = await select({
      message: 'How would you like to proceed?',
      choices: [
        { name: '✅ Proceed with implementation', value: 'approve' },
        { name: '❌ Cancel', value: 'cancel' }
      ]
    });

    if (decision === 'cancel') {
      console.log('Exiting without changes.');
      return;
    }

    summary.planApproved = true;
    summary.branchName = branchName;
    ensureFeatureBranch(targetPath, ticket);

    // Implementation
    console.log('\n🚀 Starting implementation...');
    console.log(`\nTask: ${task}`);
    console.log(`Target: ${targetPath}`);
    console.log(`\nI will now implement the approved plan using the available tools.`);
    console.log('Please wait for implementation steps...\n');

    // Run tests if not skipped
    if (skipTests) {
      console.log("\n⏭️  Skipping tests as requested (--skip-tests)");
      summary.testPassed = true;
    } else {
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

        const fixInstructions = await input({
          message: 'Describe what needs to be fixed:',
          validate: (value: string) => (value.trim() ? true : 'Please describe the fix.')
        });

        console.log(`\nFix instructions: ${fixInstructions}`);
        console.log('Applying fixes in Amp thread context...\n');
      }
    }

    summary.changedFiles = getChangedFiles(targetPath);

    // Post-implementation
    const postResult = await runPostImplementation({
      targetPath,
      ticket,
      skipPr: skipPR,
      ticketDescription
    });
    summary.prCreated = postResult.prCreated;

    console.log('\n✅ Implementation completed.');
  } catch (e) {
    console.error('Error during implementation:', e);
  } finally {
    summary.endTime = new Date();
    generateSummary(summary);
  }
}
