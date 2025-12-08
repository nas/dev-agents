// start-feature.ts
// npx tsx start-feature.ts
import 'dotenv/config';
import { select, input } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { runInRepo, runTests, selectRepo, selectTicket } from './helpers';
import { runAiderForPlan, runAider } from './aider';

// ==========================================
// 🛠️ SETUP
// ==========================================

async function main() {
  console.clear();
  console.log("🤖 \x1b[36mAI FEATURE BUILDER (DEBUG MODE)\x1b[0m");

  const targetPath = await selectRepo();
  
  try {
    const ticket = await selectTicket();
    if (!ticket) {
      console.log("❌ No ticket selected. Exiting...");
      process.exit(1);
    }
    console.log(`\n✅ Selected: ${ticket.identifier}`);

    const branchName = ticket.branchName || `feature/${ticket.identifier}-${ticket.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;

    console.log("\n📋 Planning Phase...");
    console.log("Asking Aider to analyze and create an implementation plan...\n");
    
    let planningPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nPlease analyze the existing project structure and coding patterns. Create a detailed implementation plan explaining:\n1. What files you will create or modify\n2. What changes you will make\n3. How you will follow the existing code style\n4. Any dependencies or considerations\n\nProvide ONLY the plan, do not implement yet.`;
    
    let planApproved = false;
    let implementationPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nInstructions:\n1. Analyze the existing project structure and coding patterns.\n2. Implement this feature following the exact style of the repo.`;
    
    while (!planApproved) {
      try {
        const planOutput = await runAiderForPlan(planningPrompt, targetPath);
        
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
          implementationPrompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nApproved Implementation Plan:\n${planOutput}\n\nNow implement this feature according to the approved plan above. Follow the exact style of the repo and ensure all the steps outlined in the plan are completed.`;
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

    // 4. GIT OPERATIONS (Create branch only after plan is approved)
    if (planApproved) {
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
    }

    // Test and fix loop
    let maxFixAttempts = 3;
    let attempt = 0;
    
    console.log("\n🧪 Starting test verification phase...\n");
    
    while (attempt < maxFixAttempts) {
      console.log(`\n--- Test Run ${attempt + 1}/${maxFixAttempts} ---`);
      const testResult = runTests(targetPath);
        
      if (testResult.passed) {
        console.log("\n✅ All tests passed! Proceeding to PR creation...\n");
        break; // Tests passed, exit loop
      }
        
      console.log("\n❌ Tests failed. Attempting to fix...\n");
        
      attempt++;
        
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

    // 6. Create PR (using GitHub CLI)
    // This runs after Aider has completed
    const confirm = await select({
      message: 'Ready to push and create PR?',
      choices: [
        { name: 'Yes, push and create PR', value: 'y' },
        { name: 'No, skip', value: 'n' }
      ]
    });
    
    if (confirm === 'y') {
      console.log("\n📤 Pushing branch...");
      execSync(`git push -u origin ${branchName}`, { cwd: targetPath });
      
      console.log("🔗 Creating PR...");
      execSync(`gh pr create --title "${ticket.identifier}: ${ticket.title}" --body "Fixes ${ticket.url}"`, { cwd: targetPath });
      
      console.log("\n✅ PR created successfully!");
    } else {
      console.log("\n⏭️  Skipped PR creation. You can push manually later.");
    }
    
  } catch (error: any) {
    console.error("\n❌ ERROR FETCHING LINEAR TICKETS:");
    console.error(error.message);
    console.log("\nPossible fixes:");
    console.log("1. Check your LINEAR_API_KEY in .env");
    console.log("2. Ensure you have 'Todo' tickets assigned to you.");
  }
}

main();