import { execSync } from 'child_process';
import { ConfigManager } from './lib/ConfigManager';
import fs from 'fs';
import { select, input } from '@inquirer/prompts';
import { Issue, LinearClient } from '@linear/sdk';

// Helper to run commands in the target folder
export function runInRepo(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: 'utf-8' }).trim();
  } catch (error: any) {
    // If command fails, we want to know why, but sometimes git status fails if not a repo
    return ""; 
  }
}

// Helper to run tests and return whether they passed, along with output
export function runTests(cwd: string): { passed: boolean; output: string } {
  try {
    console.log("\n🧪 Running tests...");
    const output = execSync('npm run test', { cwd, encoding: 'utf-8' });
    console.log(output);
    console.log("\n✅ All tests passed!");
    return { passed: true, output };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message || 'Test execution failed';
    console.log(output);
    console.log("\n❌ Tests failed.");
    return { passed: false, output };
  }
}

export async function confirmWorkingDirectory(): Promise<string> {
  const currentDir = process.cwd();
  
  console.log(`\n📁 Current working directory: ${currentDir}`);
  
  const confirmed = await select({
    message: 'Continue with this directory?',
    choices: [
      { name: 'Yes, continue', value: true },
      { name: 'No, exit', value: false },
    ],
  });

  if (!confirmed) {
    console.log('\n❌ Exiting...');
    process.exit(0);
  }

  // Verify it's a git repo
  if (!fs.existsSync(`${currentDir}/.git`)) {
    console.error(`\n❌ Current directory is not a git repository.`);
    process.exit(1);
  }

  return currentDir;
}

export async function selectTicket(): Promise<Issue | undefined> {
  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  console.log("\n⏳ Connecting to Linear...");
  
  try {
    const me = await linear.viewer;
    const myIssues = await me.assignedIssues({ 
      first: 10,
      filter: { state: { name: { eq: "Todo" } } } 
    });

    const tickets = myIssues.nodes;

    console.log(`✅ Found ${tickets.length} tickets assigned to you.`);
    
    if (tickets.length === 0) {
      console.log("⚠️  Make sure you have tickets in 'Todo' status assigned to your user.");
      process.exit(0);
    }

    const ticket = await select({
      message: 'Select a ticket to build:',
      pageSize: 10, // Controls how many items are visible at once
      choices: myIssues.nodes.map(issue => ({
        name: `[${issue.identifier}] ${issue.title}`,
        
        // What gets returned into the 'ticket' variable
        value: issue,
        
        // Bonus: Shows a preview line at the bottom when highlighted!
        description: issue.description ? issue.description.substring(0, 100) + '...' : 'No description'
      }))
    });

    return ticket;
  } catch (error: any) {
    console.error("\n❌ Error selecting ticket:", error.message);
    return undefined;
  }
}
