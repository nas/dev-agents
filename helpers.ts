import { execSync } from 'child_process';
import { REPOS } from './config';
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

export async function selectRepo(): Promise<string> {
  const repoKey = await select({
    message: 'Select Project:',
    choices: Object.keys(REPOS).map(key => ({
      name: key,
      value: key
    })),
  });

  let targetPath: string;
  
  if (repoKey === 'Other') {
    // Prompt for custom path
    targetPath = await input({
      message: 'Enter the full path to the project:',
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Path cannot be empty';
        }
        return true;
      }
    });
  } else {
    const envPath = REPOS[repoKey];
    if (!envPath) {
      console.error(`\n❌ Path for ${repoKey} is not configured. Please check your environment variables.`);
      process.exit(1);
    }
    targetPath = envPath;
  }
  
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`);
    process.exit(1);
  }

  return targetPath;
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
