// utils.ts - Utility functions for the feature builder
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Display help information
export function showHelp(): void {
  console.log(`
🤖 AI FEATURE BUILDER - Usage

Commands:
  npx tsx start-feature.ts          Start the feature builder
  npx tsx start-feature.ts --help   Show this help message
  npx tsx start-feature.ts --dry-run Preview without making changes

Options:
  --help, -h      Show help
  --dry-run       Preview what would happen without making changes
  --skip-tests    Skip running tests after implementation
  --no-pr         Skip creating a PR at the end
  --model <name>  Override the AI model used by aider (default: gemini-2.5-pro)

Environment Variables:
  LINEAR_API_KEY  Your Linear API key
  GOOGLE_API_KEY  Your Google AI API key for Gemini
  AIDER_MODEL     Default AI model to use with aider (overrides default)

Workflow:
  1. Select a repository
  2. Choose a Linear ticket
  3. Review AI-generated implementation plan
  4. Implement feature with Aider
  5. Run tests and fix issues
  6. Create PR (optional)

For more information, see the README.
`);
}

// Progress indicator
export class ProgressIndicator {
  private interval: NodeJS.Timeout | null = null;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private i = 0;

  start(message: string): void {
    process.stdout.write(`\r${this.frames[this.i]} ${message}`);
    this.interval = setInterval(() => {
      this.i = (this.i + 1) % this.frames.length;
      process.stdout.write(`\r${this.frames[this.i]} ${message}`);
    }, 80);
  }

  stop(message?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (message) {
      console.log(`\r✅ ${message}`);
    } else {
      process.stdout.write('\r');
    }
  }
}

// Summary report
export interface SummaryReport {
  ticketId: string;
  ticketTitle: string;
  branchName: string;
  planApproved: boolean;
  testPassed: boolean;
  testAttempts: number;
  prCreated: boolean;
  startTime: Date;
  endTime: Date;
  changedFiles?: string[];
}

export function generateSummary(report: SummaryReport): void {
  const duration = report.endTime.getTime() - report.startTime.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FEATURE IMPLEMENTATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Ticket: ${report.ticketId} - ${report.ticketTitle}`);
  console.log(`Branch: ${report.branchName}`);
  console.log(`Plan Approved: ${report.planApproved ? '✅ Yes' : '❌ No'}`);
  console.log(`Tests Passed: ${report.testPassed ? '✅ Yes' : '❌ No'}`);
  console.log(`Test Fix Attempts: ${report.testAttempts}`);
  console.log(`PR Created: ${report.prCreated ? '✅ Yes' : '❌ No'}`);
  console.log(`Duration: ${minutes}m ${seconds}s`);
  console.log(`Started: ${report.startTime.toLocaleTimeString()}`);
  console.log(`Ended: ${report.endTime.toLocaleTimeString()}`);
  
  if (report.changedFiles && report.changedFiles.length > 0) {
    console.log('\n📝 Changed Files:');
    report.changedFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  console.log('='.repeat(60));
}

// Get changed files from git
export function getChangedFiles(cwd: string): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf-8' });
    return output.trim().split('\n').filter(file => file.trim() !== '');
  } catch {
    return [];
  }
}

// Validate environment
export function validateEnvironment(): string[] {
  const errors: string[] = [];
  
  if (!process.env.LINEAR_API_KEY) {
    errors.push('LINEAR_API_KEY environment variable is not set');
  }
  
  if (!process.env.GOOGLE_API_KEY) {
    errors.push('GOOGLE_API_KEY environment variable is not set');
  }
  
  try {
    execSync('which aider', { stdio: 'pipe' });
  } catch {
    errors.push('aider command not found. Install with: pip install aider-chat');
  }
  
  try {
    execSync('which gh', { stdio: 'pipe' });
  } catch {
    errors.push('GitHub CLI (gh) not found. Install from: https://cli.github.com');
  }
  
  return errors;
}
