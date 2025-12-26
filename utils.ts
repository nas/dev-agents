// Hello World
// utils.ts - Utility functions for the feature builder
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Display help information
export function showHelp(): void {
  console.log(`
AI OPS CLI

Usage:
  npx tsx bin/ai-ops.ts <command> [options]
  npm run <command> -- [options]

Commands:
  aider       Start the Aider feature builder
  conductor   Start the Gemini conductor
  codex       Start the Codex builder
  agent       Choose an agent to run

Global Options:
  --help, -h  Show this help message

Aider Options:
  --dry-run            Preview without making changes
  --skip-tests         Skip running tests after implementation
  --no-pr              Skip creating a PR at the end
  --model <name>       Override the AI model used by aider
  --editor-model <name> Override the editor model used by aider

Conductor Options:
  --model <name>         Override the Gemini model
  --extensions <list>    Comma-separated extension list
  --approval-mode <mode> Approval mode for tool usage
  --allowed-tools <list> Comma-separated tool allowlist
  --debug                Enable debug logging
  --no-pr                Skip creating a PR at the end

Codex Options:
  --model <name>   Override the Codex model
  --profile <name> Use a Codex profile
  --no-pr          Skip creating a PR at the end

Agent Options:
  --help, -h  Show agent launcher help

Environment Variables:
  LINEAR_API_KEY      Your Linear API key
  GOOGLE_API_KEY      Your Google AI API key for Gemini models
  ANTHROPIC_API_KEY   Your Anthropic API key for Claude models
  OPENAI_API_KEY      Your OpenAI API key for GPT models
  DEEPSEEK_API_KEY    Your DeepSeek API key for DeepSeek models
  AIDER_API_KEY       Generic API key for other models (used as-is)
  AIDER_MODEL         Default AI model to use with aider (overrides default)

Notes:
  - Use "--" to pass flags through the agent launcher.
  - Example: npx tsx bin/ai-ops.ts agent -- --model gpt-5.2
  - Example: npm run agent -- --model gemini-2.5-flash
  - Example: npm run conductor -- --model gemini-2.5-flash
  - Example: npm run codex -- --model gpt-5.2-codex

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
  const warnings: string[] = [];
  
  if (!process.env.LINEAR_API_KEY) {
    errors.push('LINEAR_API_KEY environment variable is not set');
  }
  
  // Check for at least one API key if using AI models
  if (!process.env.GOOGLE_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY && !process.env.AIDER_API_KEY) {
    warnings.push('No AI API key found. Set GOOGLE_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or AIDER_API_KEY');
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
  
  // Show warnings but don't treat them as errors
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('\n   You may need to set appropriate API keys for your chosen model.\n');
  }
  
  return errors;
}
