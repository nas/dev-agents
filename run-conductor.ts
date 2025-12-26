// run-conductor.ts
import 'dotenv/config';
import select from '@inquirer/select';
import { spawn } from 'child_process';

export function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

export const actions = {
  handleNewTrack: async () => {
    await runCommand('gemini', ['/conductor:newTrack']);
  },
  handleImplementTrack: async () => {
    await runCommand('gemini', ['/conductor:implement']);
  },
};

export function showHelp(): void {
  console.log(`
GEMINI CONDUCTOR CLI

Usage:
  npx tsx run-conductor.ts
  npx tsx run-conductor.ts --help

Options:
  --help, -h      Show this help message
`);
}

export async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  console.clear();
  console.log("🚀 \x1b[36mGEMINI CONDUCTOR\x1b[0m");

  while (true) {
    const action = await select({
      message: 'Select an action:',
      choices: [
        { name: 'Start New Track', value: 'new_track' },
        { name: 'Work on Track', value: 'implement_track' },
        { name: 'Exit', value: 'exit' },
      ],
    });

    if (action === 'exit') {
      break;
    } else if (action === 'new_track') {
      await actions.handleNewTrack();
    } else if (action === 'implement_track') {
      await actions.handleImplementTrack();
    }
  }
}

if (require.main === module) {
  main();
}
