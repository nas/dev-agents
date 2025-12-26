import { Issue } from '@linear/sdk';
import { runInRepo, selectRepo, selectTicket } from '../../helpers';
import { ConfigManager } from '../ConfigManager';

export interface TicketContext {
  configManager: ConfigManager;
  targetPath: string;
  ticket: Issue;
  task: string;
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

  const targetPath = await selectRepo(configManager);
  const ticket = await selectTicket();

  if (!ticket) {
    console.log('❌ No ticket selected. Exiting...');
    process.exit(1);
  }

  console.log(`\n✅ Selected: ${ticket.identifier} - ${ticket.title}`);

  return {
    configManager,
    targetPath,
    ticket,
    task: buildTaskFromTicket(ticket)
  };
}
