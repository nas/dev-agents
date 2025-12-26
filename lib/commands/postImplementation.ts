import { input, select } from '@inquirer/prompts';
import { execFileSync, execSync } from 'child_process';
import { Issue } from '@linear/sdk';
import { buildBranchName } from './ticketFlow';

export interface PostImplementationResult {
  committed: boolean;
  prCreated: boolean;
}

function getGitStatus(targetPath: string): string | null {
  try {
    return execSync('git status --porcelain', { cwd: targetPath, encoding: 'utf-8' }).trim();
  } catch (error: any) {
    console.error(`\n❌ Git status failed: ${error.message}`);
    return null;
  }
}

function runGitCommand(targetPath: string, args: string[]): void {
  execFileSync('git', args, { cwd: targetPath, stdio: 'inherit' });
}

function runGhCommand(args: string[]): void {
  execFileSync('gh', args, { stdio: 'inherit' });
}

function buildDefaultCommitMessage(ticket: Issue): string {
  return `feat(${ticket.identifier}): ${ticket.title}`;
}

export async function runPostImplementation(options: {
  targetPath: string;
  ticket: Issue;
  skipPr?: boolean;
}): Promise<PostImplementationResult> {
  const status = getGitStatus(options.targetPath);
  if (status === null) {
    return { committed: false, prCreated: false };
  }

  let committed = false;
  if (status) {
    const commitDecision = await select({
      message: 'Commit the changes?',
      choices: [
        { name: 'Yes, commit', value: 'commit' },
        { name: 'No, skip commit', value: 'skip' }
      ]
    });

    if (commitDecision === 'commit') {
      const message = await input({
        message: 'Commit message:',
        default: buildDefaultCommitMessage(options.ticket),
        validate: (value: string) => (value.trim() ? true : 'Commit message cannot be empty.')
      });

      try {
        runGitCommand(options.targetPath, ['add', '-A']);
        runGitCommand(options.targetPath, ['commit', '-m', message]);
        committed = true;
      } catch (error: any) {
        console.error(`\n❌ Failed to commit changes: ${error.message}`);
      }
    }
  } else {
    console.log('\n✅ Working tree clean. No changes to commit.');
  }

  if (options.skipPr) {
    return { committed, prCreated: false };
  }

  const prDecision = await select({
    message: 'Ready to push and create PR?',
    choices: [
      { name: 'Yes, push and create PR', value: 'yes' },
      { name: 'No, skip', value: 'no' }
    ]
  });

  if (prDecision === 'no') {
    return { committed, prCreated: false };
  }

  const branchName = buildBranchName(options.ticket);

  try {
    runGitCommand(options.targetPath, ['push', '-u', 'origin', branchName]);
    runGhCommand([
      'pr',
      'create',
      '--title',
      `${options.ticket.identifier}: ${options.ticket.title}`,
      '--body',
      `Fixes ${options.ticket.url}`
    ]);
    return { committed, prCreated: true };
  } catch (error: any) {
    console.error(`\n❌ Failed to create PR: ${error.message}`);
    return { committed, prCreated: false };
  }
}
