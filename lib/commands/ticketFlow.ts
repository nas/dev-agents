import { select, input } from '@inquirer/prompts';
import { Issue } from '@linear/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { runInRepo, confirmWorkingDirectory, selectTicket } from '../../helpers';
import { ConfigManager } from '../ConfigManager';

export interface TicketContext {
  configManager: ConfigManager;
  targetPath: string;
  ticket: Issue;
  task: string;
  ticketDescription: string;
}

export function buildBranchName(ticket: Issue): string {
  if (ticket.branchName) {
    return ticket.branchName;
  }
  const slug = ticket.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
  return `feature/${ticket.identifier}-${slug}`;
}

export function buildTaskFromTicket(ticket: Issue): string {
  const description = ticket.description ? ticket.description.trim() : '';
  return description ? `${ticket.title}\n${description}` : ticket.title;
}

export function ensureWorktree(targetPath: string, branchName: string): string {
  const repoName = path.basename(targetPath);
  const worktreePath = path.resolve(targetPath, '..', 'worktrees', repoName, branchName);
  const worktreeRoot = path.dirname(worktreePath);

  if (!fs.existsSync(worktreeRoot)) {
    fs.mkdirSync(worktreeRoot, { recursive: true });
  }

  if (fs.existsSync(worktreePath)) {
    console.log(`\n🪵 Using existing worktree: ${worktreePath}`);
  } else {
    console.log(`\n🪵 Creating worktree: ${worktreePath}`);
    try {
      execSync(`git worktree add --detach ${worktreePath}`, {
        cwd: targetPath,
        stdio: 'inherit'
      });
    } catch {
      console.error('❌ Git Error - failed to create worktree.');
      process.exit(1);
    }
  }

  console.log(`🧹 Cleanup after merge: git worktree remove ${worktreePath}`);
  return worktreePath;
}

export function ensureFeatureBranch(targetPath: string, ticket: Issue): string {
  const branchName = buildBranchName(ticket);

  console.log(`\n🌿 Creating/checking out branch: ${branchName}`);
  try {
    const branches = runInRepo(`git branch --list ${branchName}`, targetPath);
    if (branches) {
      runInRepo(`git checkout ${branchName}`, targetPath);
      console.log('🔄 Switched to existing branch');
    } else {
      runInRepo(`git checkout -b ${branchName}`, targetPath);
      console.log('✨ Created new branch');
    }
  } catch {
    console.error('❌ Git Error - make sure the path is a valid git repo.');
    process.exit(1);
  }

  return branchName;
}

export async function loadTicketContext(options: {
  requireAider?: boolean;
  requireGh?: boolean;
  requireLinear?: boolean;
} = {}): Promise<TicketContext> {
  const configManager = new ConfigManager();
  const envErrors = configManager.validate({
    requireAider: options.requireAider,
    requireGh: options.requireGh,
    requireLinear: options.requireLinear ?? true
  });

  if (envErrors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    envErrors.forEach(error => console.error(`   - ${error}`));
    console.error('\nPlease fix the issues above and try again.');
    process.exit(1);
  }

  const targetPath = await confirmWorkingDirectory();

  const choice = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Select a Linear Ticket', value: 'linear' },
      { name: 'Describe a new task', value: 'task' },
    ],
  });

  let ticket: Issue | undefined;
  let taskString: string;
  let ticketDescription = '';

  if (choice === 'linear') {
    ticket = await selectTicket();

    if (!ticket) {
      console.log('❌ No ticket selected. Exiting...');
      process.exit(1);
    }
    taskString = buildTaskFromTicket(ticket);
    ticketDescription = ticket.description ? ticket.description.trim() : '';
    console.log(`\n✅ Selected: ${ticket.identifier} - ${ticket.title}`);
  } else { // choice === 'task'
    const taskInput = await input({
      message: 'Enter your task in the format "Title:Description":',
      validate: (value: string) => {
        if (!value.includes(':') || value.split(':').length < 2) {
          return 'Please use the format "Title:Description"';
        }
        return true;
      },
    });

    const [title, description] = taskInput.split(':', 2);
    const trimmedDescription = description.trim();

    const adhocIdentifier = `ADHOC-${Date.now().toString().slice(-6)}`;
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);

    ticket = {
      id: adhocIdentifier, // Placeholder for Linear ID
      identifier: adhocIdentifier,
      title: title.trim(),
      description: trimmedDescription,
      branchName: `feature/${adhocIdentifier}-${slug}`,
    } as Issue;

    taskString = buildTaskFromTicket(ticket);
    ticketDescription = trimmedDescription;
    console.log(`\n✅ Ad-hoc task created: ${ticket.title}`);
  }

  return {
    configManager,
    targetPath,
    ticket,
    task: taskString,
    ticketDescription,
  };
}
