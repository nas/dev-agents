// start-feature.ts
// npx tsx start-feature.ts
import 'dotenv/config';
import { select, input } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { runInRepo, runTests, selectRepo, selectTicket } from './helpers';
import { runAiderForPlan, runAider } from './aider';
import { 
  showHelp, 
  ProgressIndicator, 
  SummaryReport, 
  generateSummary, 
  getChangedFiles,
  validateEnvironment 
} from './utils';

// ==========================================
// 🛠️ SETUP
// ==========================================

async function main() {
  // Handle --help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const skipTests = process.argv.includes('--skip-tests');
  const skipPR = process.argv.includes('--no-pr');
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log("🚧 DRY RUN MODE - No changes will be made\n");
  }

  console.clear();
  console.log("🤖 \x1b[36mAI FEATURE BUILDER\x1b[0m");
  if (skipTests) console.log("   ⚠️  Tests will be skipped");
  if (skipPR) console.log("   ⚠️  PR creation will be skipped");
  if (dryRun) console.log("   ⚠️  Dry run - no actual changes");

  // Validate environment
  const envErrors = validateEnvironment();
  if (envErrors.length > 0) {
    console.error("\n❌ Environment validation failed:");
    envErrors.forEach(error => console.error(`   - ${error}`));
    console.error("\nPlease fix the issues above and try again.");
    process.exit(1);
  }

  // Setup summary report
  const summary: SummaryReport = {
    ticketId: '',
    ticketTitle: '',
    branchName: '',
    planApproved: false,
    testPassed: false,
    testAttempts: 0,
    prCreated: false,
    startTime: new Date(),
    endTime: new Date(),
    changedFiles: []
  };

  const targetPath = await selectRepo();
  
  try {
    const progress = new ProgressIndicator();
    progress.start('Fetching Linear tickets...');
    
    const ticket = await selectTicket();
    progress.stop(`Selected: ${ticket?.identifier || 'None'}`);
    
    if (!ticket) {
      console.log("❌ No ticket selected. Exiting...");
      process.exit(1);
    }
    
    // Update summary
    summary.ticketId = ticket.identifier;
    summary.ticketTitle = ticket.title;
    
    console.log(`\n✅ Selected: ${ticket.identifier}`);

    const branchName = ticket.branchName || `feature/${ticket.identifier}-${ticket.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;

    console.log("\n📋 Planning Phase...");
    const planningProgress = new ProgressIndicator();
    planningProgress.start("Asking Aider to analyze and create an implementation plan...");
    
    let planningPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nPlease analyze the existing project structure and coding patterns. Create a detailed implementation plan explaining:\n1. What NEW files you will create (these don't exist yet, that's okay)\n2. What EXISTING files you will modify\n3. What changes you will make\n4. How you will follow the existing code style\n5. Any dependencies or considerations\n\nNote: It's fine if files mentioned in the plan don't exist yet - they will be created during implementation. Provide ONLY the plan, do not implement yet.`;
    
    let planApproved = false;
    let implementationPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nInstructions:\n1. Analyze the existing project structure and coding patterns.\n2. Implement this feature following the exact style of the repo.`;
    
    while (!planApproved) {
      try {
        const planOutput = await runAiderForPlan(planningPrompt, targetPath);
        planningProgress.stop("Plan generated successfully!");
        
        console.log("\n" + "=".repeat(60));
        console.log("📋 IMPLEMENTATION PLAN");
        console.log("=".repeat(60));
        console.log(planOutput);
        console.log("=".repeat(60));
        
        const planDecision = await select({
          message: 'What would you like to do with this plan?',
          choices: [
            { name: '✅ Approve and proceed with implementation', value: 'approve' },
            { name: '✏️  Request modifications to the plan', value: 'modify' },
            { name: '❌ Skip planning, implement directly', value: 'skip' }
          ]
        });
        
        if (planDecision === 'approve') {
          planApproved = true;
          implementationPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nApproved Implementation Plan:\n${planOutput}\n\nNow implement this feature according to the approved plan above.\n\nIMPORTANT INSTRUCTIONS:\n1. Create any NEW files mentioned in the plan that don't exist yet (create the full directory structure if needed)\n2. Modify any EXISTING files mentioned in the plan\n3. Follow the exact code style and patterns found in the existing codebase\n4. Ensure all steps outlined in the plan are completed`;
        } else if (planDecision === 'modify') {
          const modifications = await select({
            message: 'What modifications would you like?',
            choices: [
              { name: 'Add more detail to the plan', value: 'detail' },
              { name: 'Change the approach', value: 'approach' },
              { name: 'Specify different files to modify', value: 'files' },
              { name: "Other - I'll describe what I want", value: 'other' }
            ]
          });
          
          let modificationDetails: string;
          
          if (modifications === 'other') {
            // Actually capture the user's specific request
            modificationDetails = await input({
              message: 'Please describe the specific modifications you want to the plan:',
              default: ''
            });
          } else {
            // For predefined options, still allow additional details
            const baseMessage = modifications === 'detail' 
              ? 'Add more detailed explanations to the plan'
              : modifications === 'approach' 
              ? 'Change the implementation approach'
              : 'Specify different files to modify';
            
            const additionalDetails = await input({
              message: `${baseMessage}. Add any specific details (or press Enter to use default):`,
              default: ''
            });
            
            modificationDetails = additionalDetails 
              ? `${baseMessage}. Specifically: ${additionalDetails}`
              : baseMessage;
          }
          
          planningPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nPrevious plan output:\n${planOutput}\n\nPlease update the plan based on these modifications: ${modificationDetails}\n\nProvide an updated plan.`;
        } else {
          // skip
          planApproved = true;
        }
      } catch (error: any) {
        console.error("\n❌ Error getting plan:", error.message);
        const continueAnyway = await select({
          message: 'Failed to get plan. Continue with direct implementation?',
          choices: [
            { name: 'Yes, implement directly', value: 'y' },
            { name: 'No, exit', value: 'n' }
          ]
        });
        
        if (continueAnyway === 'y') {
          planApproved = true;
        } else {
          process.exit(1);
        }
      }
    }
    console.log("Plan approved: ", implementationPrompt);
    summary.planApproved = true;
    
    // If dry run, exit here
    if (dryRun) {
      console.log("\n🚧 DRY RUN COMPLETE");
      console.log("Would have:");
      console.log(`  - Created branch: ${branchName}`);
      console.log(`  - Used prompt: ${implementationPrompt.substring(0, 100)}...`);
      console.log(`  - ${skipTests ? 'Skipped tests' : 'Run tests'}`);
      console.log(`  - ${skipPR ? 'Skipped PR creation' : 'Created PR'}`);
      process.exit(0);
    }

    // 4. GIT OPERATIONS (Create branch only after plan is approved)
    if (planApproved) {
      console.log(`\n🌿 Creating/checking out branch: ${branchName}`);
      summary.branchName = branchName;
        
      const gitProgress = new ProgressIndicator();
      gitProgress.start('Performing git operations...');
      
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
        gitProgress.stop();
        console.error("❌ Git Error - make sure the path is a valid git repo.");
        process.exit(1);
      }
      gitProgress.stop('Git operations completed');

      // 5. IMPLEMENTATION PHASE
      console.log("\n🚀 Starting Implementation...");
      console.log("Type '/exit' when you're done to finish the session.\n");
      
      const implementationProgress = new ProgressIndicator();
      implementationProgress.start('Aider is implementing the feature...');
      
      await runAider(implementationPrompt, targetPath);
      
      implementationProgress.stop('Implementation completed');
      
      // Get changed files for summary
      summary.changedFiles = getChangedFiles(targetPath);
      
      if (skipTests) {
        console.log("\n⏭️  Skipping tests as requested (--skip-tests)");
        summary.testPassed = true;
        summary.testAttempts = 0;
      } else {
        console.log("\n✅ Implementation completed. Running tests...\n");
      }
    }

    // 6. Test and fix loop (only if not skipping tests)
    if (!skipTests) {
      let maxFixAttempts = 3;
      let attempt = 0;
      
      console.log("\n🧪 Starting test verification phase...\n");
    
      while (attempt < maxFixAttempts) {
        console.log(`\n--- Test Run ${attempt + 1}/${maxFixAttempts} ---`);
        const testResult = runTests(targetPath);
          
        if (testResult.passed) {
          console.log("\n✅ All tests passed! Proceeding to PR creation...\n");
          summary.testPassed = true;
          summary.testAttempts = attempt + 1;
          break; // Tests passed, exit loop
        }
          
        console.log("\n❌ Tests failed. Attempting to fix...\n");
          
        attempt++;
        summary.testAttempts = attempt;
          
        if (attempt >= maxFixAttempts) {
          console.log(`\n⚠️  Reached maximum fix attempts (${maxFixAttempts}). Tests still failing.`);
          const continueFix = await select({
            message: 'Tests are still failing. Continue fixing?',
            choices: [
              { name: 'Yes, try again', value: 'y' },
              { name: 'No, proceed anyway', value: 'n' }
            ]
          });
          
          if (continueFix === 'n') {
            break;
          }
          attempt = 0; // Reset counter if user wants to continue
        }
        
        // Ask aider to fix the failing tests, including the test output for context
        const fixPrompt = `The tests are failing. Here's the test output:\n\n${testResult.output}\n\nPlease analyze the test failures and fix the issues to make all tests pass.`;
          
        console.log(`\n🔧 Asking Aider to fix test failures (attempt ${attempt + 1}/${maxFixAttempts})...`);
        await runAider(fixPrompt, targetPath);
      }
    }

    // 7. Create PR (using GitHub CLI) - only if not skipping
    if (!skipPR) {
      const confirm = await select({
        message: 'Ready to push and create PR?',
        choices: [
          { name: 'Yes, push and create PR', value: 'y' },
          { name: 'No, skip', value: 'n' }
        ]
      });
      
      if (confirm === 'y') {
        const prProgress = new ProgressIndicator();
        prProgress.start('Pushing branch and creating PR...');
        
        try {
          execSync(`git push -u origin ${branchName}`, { cwd: targetPath });
          execSync(`gh pr create --title "${ticket.identifier}: ${ticket.title}" --body "Fixes ${ticket.url}"`, { cwd: targetPath });
          prProgress.stop('PR created successfully!');
          summary.prCreated = true;
        } catch (error) {
          prProgress.stop();
          console.error("\n❌ Failed to create PR:", error.message);
          console.log("You can create the PR manually.");
        }
      } else {
        console.log("\n⏭️  Skipped PR creation. You can push manually later.");
      }
    } else {
      console.log("\n⏭️  Skipping PR creation as requested (--no-pr)");
    }
    
    // Update end time and generate summary
    summary.endTime = new Date();
    generateSummary(summary);
    
  } catch (error: any) {
    console.error("\n❌ ERROR:");
    console.error(error.message);
    
    // Still generate partial summary
    summary.endTime = new Date();
    summary.testPassed = false;
    generateSummary(summary);
    
    console.log("\n💡 Possible fixes:");
    console.log("1. Check your LINEAR_API_KEY in .env");
    console.log("2. Ensure you have 'Todo' tickets assigned to you.");
    console.log("3. Run with --help for usage information");
  }
}

// Handle keyboard interrupts gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user. Exiting gracefully...');
  process.exit(0);
});

main();
