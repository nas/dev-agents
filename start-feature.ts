// start-feature.ts
// npx tsx start-feature.ts
import 'dotenv/config';
import { LinearClient, Issue } from '@linear/sdk';
import { select } from '@inquirer/prompts';
import { execSync, spawn } from 'child_process';
import fs from 'fs';

// ==========================================
// 🔧 CONFIGURATION
// ==========================================
const REPOS = {
  // UPDATE THESE PATHS TO MATCH YOUR ACTUAL FOLDERS
  'Backend': process.env.BACKEND_REPO_PATH,
  'Frontend': process.env.FRONTEND_REPO_PATH,
};

// ==========================================
// 🛠️ SETUP
// ==========================================
const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

// Helper to run commands in the target folder
function runInRepo(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: 'utf-8' }).trim();
  } catch (error: any) {
    // If command fails, we want to know why, but sometimes git status fails if not a repo
    return ""; 
  }
}

async function main() {
  console.clear();
  console.log("🤖 \x1b[36mAI FEATURE BUILDER (DEBUG MODE)\x1b[0m");

  // 1. SELECT REPOSITORY
  const repoKey = await select({
    message: 'Select Project:',
    choices: Object.keys(REPOS).map(key => ({
      name: key,
      value: key
    })),
  });

  const targetPath = REPOS[repoKey];
  
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`);
    process.exit(1);
  }

  // 2. FETCH TICKETS (With explicit logging)
  console.log("\n⏳ Connecting to Linear...");
  
  try {
    const me = await linear.viewer;
    const myIssues = await me.assignedIssues({ 
      first: 10,
      filter: { state: { name: { eq: "Todo" } } } 
    });

    const tickets = myIssues.nodes;

    // --- DEBUG LOGGING ---
    console.log(`✅ Found ${tickets.length} tickets assigned to you.`);
    
    if (tickets.length === 0) {
      console.log("⚠️  Make sure you have tickets in 'Todo' status assigned to your user.");
      process.exit(0);
    }

    // Print them out manually first to prove we have them
    console.log("\n📋 \x1b[33mAvailable Tickets:\x1b[0m");
    tickets.forEach((t, i) => console.log(`  ${i + 1}. [${t.identifier}] ${t.title}`));
    console.log("-----------------------------------");
    // ---------------------

    // 3. SELECT TICKET
    const ticket = await select({
      message: 'Select a ticket to build:',
      pageSize: 10, // Controls how many items are visible at once
      choices: myIssues.nodes.map(issue => ({
        // What you see in the list
        name: `[${issue.identifier}] ${issue.title}`,
        
        // What gets returned into the 'ticket' variable
        value: issue,
        
        // Bonus: Shows a preview line at the bottom when highlighted!
        description: issue.description ? issue.description.substring(0, 100) + '...' : 'No description'
      }))
    });
  
    console.log(`\n✅ Selected: ${ticket.identifier}`);

    // 4. GIT OPERATIONS
    // Use Linear's provided branch name, or fallback to constructing one
    const branchName = ticket.branchName || `feature/${ticket.identifier}-${ticket.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)}`;

    console.log(`🌿 Branch: ${branchName}`);
    
    // Check/Create Branch
    try {
        // Check if branch exists
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

    // 5. LAUNCH AIDER
    const prompt = `Task: ${ticket.title}\nDescription: ${ticket.description}\n\nInstructions:\n1. Analyze the existing project structure and coding patterns.\n2. Implement this feature following the exact style of the repo.\n3. Run 'npm run test' to verify.`;

    console.log("\n🚀 Starting Aider...");
    console.log("Type '/exit' when you're done to finish the session.\n");
    
    // Build aider arguments
    const aiderArgs: string[] = [
        '--model', 'gemini-2.5-pro',
        '--message', prompt,
        '--auto-commits'
    ];
    
    // Add API key if provided
    if (process.env.GOOGLE_API_KEY) {
        aiderArgs.push('--api-key', `google=${process.env.GOOGLE_API_KEY}`);
    }
    
    console.log('Running:', 'aider', aiderArgs.join(' '));
    
    const aiderProcess = spawn('aider', aiderArgs, {
        cwd: targetPath,
        stdio: 'inherit',
        shell: false
    });

    // Wait for aider to complete
    await new Promise<void>((resolve, reject) => {
        aiderProcess.on('exit', (code) => {
            if (code === 0) {
                console.log("\n✅ Aider session completed successfully.");
            } else {
                console.log(`\n⚠️  Aider exited with code ${code}.`);
            }
            resolve();
        });
        
        aiderProcess.on('error', (error) => {
            console.error("\n❌ Error starting Aider:", error.message);
            reject(error);
        });
    });

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