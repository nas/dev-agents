import { confirm } from '@inquirer/prompts';
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
    console.log('\n' + '='.repeat(60));
    console.log('AMP AGENT - HYBRID WORKFLOW');
    console.log('='.repeat(60));
    console.log(`\nTicket: ${ticket.identifier} - ${ticket.title}`);
    console.log(`Branch: ${branchName}`);
    console.log(`Target: ${targetPath}`);
    console.log(`\nTask:\n${task}\n`);

    // Create feature branch
    summary.planApproved = true;
    summary.branchName = branchName;
    ensureFeatureBranch(targetPath, ticket);
    console.log(`✅ Feature branch created: ${branchName}`);

    // Direct user to Amp thread
    console.log('\n' + '-'.repeat(60));
    console.log('📝 NEXT STEP: Go to your Amp thread and paste this task:');
    console.log('-'.repeat(60));
    console.log(`\nImplement this task:\n\n${task}`);
    console.log('\n' + '-'.repeat(60));

    // Wait for implementation completion
    const implemented = await confirm({
      message: 'Have you completed the implementation in the Amp thread?',
      default: false
    });

    if (!implemented) {
      console.log('Exiting without changes.');
      return;
    }

    // Run tests if not skipped
    if (skipTests) {
      console.log("\n⏭️  Skipping tests as requested (--skip-tests)");
      summary.testPassed = true;
    } else {
      console.log("\n🧪 Running tests...\n");
      const testResult = runTests(targetPath);
      
      if (!testResult.passed) {
        console.log("\n⚠️  Tests failed. You may need to fix issues in the Amp thread.");
        const fixedTests = await confirm({
          message: 'Have you fixed the test failures in the Amp thread?',
          default: false
        });
        summary.testPassed = fixedTests;
      } else {
        summary.testPassed = true;
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

    console.log('\n✅ Implementation workflow completed.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    summary.endTime = new Date();
    generateSummary(summary);
  }
}
