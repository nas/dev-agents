import { select, input } from '@inquirer/prompts';
import { AiderAgent } from '../agents/AiderAgent';
import { PlanningLoop } from '../PlanningLoop';
import { ConfigManager } from '../ConfigManager';
import { runInRepo, runTests, selectRepo, selectTicket } from '../../helpers';
import { ProgressIndicator, SummaryReport, generateSummary, getChangedFiles } from '../../utils';
import { execSync } from 'child_process';
import { ProcessRunner } from '../ProcessRunner';

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

  const configManager = new ConfigManager();
  const envErrors = configManager.validate();
  if (envErrors.length > 0) {
    console.error("\n❌ Environment validation failed:");
    envErrors.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }

  const targetPath = await selectRepo(configManager);
  const ticket = await selectTicket();
  
  if (!ticket) {
      console.log("❌ No ticket selected. Exiting...");
      process.exit(1);
  }

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

  const branchName = ticket.branchName || `feature/${ticket.identifier}-${ticket.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;

  const agent = new AiderAgent(configManager, targetPath, modelOverride, editorModelOverride);

  const loop = new PlanningLoop(agent, {
      onPlanApproved: async () => {
          summary.planApproved = true;
          summary.branchName = branchName;
          
          if (dryRun) {
            console.log("\n🚧 DRY RUN COMPLETE (skipping implementation)");
            process.exit(0);
          }

          console.log(`\n🌿 Creating/checking out branch: ${branchName}`);
          try {
            const branches = runInRepo(`git branch --list ${branchName}`, targetPath);
            if (branches) {
                runInRepo(`git checkout ${branchName}`, targetPath);
                console.log("🔄 Switched to existing branch");
            } else {
                runInRepo(`git checkout -b ${branchName}`, targetPath);
                console.log("✨ Created new branch");
            }
          } catch (err) {
              console.error("❌ Git Error - make sure the path is a valid git repo.");
              process.exit(1);
          }
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

          if (!skipPR) {
              const confirm = await select({
                  message: 'Ready to push and create PR?',
                  choices: [
                      { name: 'Yes, push and create PR', value: 'y' },
                      { name: 'No, skip', value: 'n' }
                  ]
              });

              if (confirm === 'y') {
                  try {
                      execSync(`git push -u origin ${branchName}`, { cwd: targetPath });
                      execSync(`gh pr create --title "${ticket.identifier}: ${ticket.title}" --body "Fixes ${ticket.url}"`, { cwd: targetPath });
                      summary.prCreated = true;
                  } catch (error: any) {
                      console.error("\n❌ Failed to create PR:", error.message);
                  }
              }
          }
      }
  });

  const task = `${ticket.title}\n${ticket.description}`;
  try {
    await loop.run(task);
  } catch (e) {
      // ignore
  } finally {
      summary.endTime = new Date();
      generateSummary(summary);
  }
}
