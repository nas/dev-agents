#!/usr/bin/env node
import { runFeature } from '../lib/commands/aider';
import { runConductor } from '../lib/commands/conductor';
import { runCodex } from '../lib/commands/codex';
import { runAmp } from '../lib/commands/amp';
import { runAgent } from '../lib/commands/agent';
import { showHelp } from '../utils';

const command = process.argv[2];

async function main() {
  if (command === '--help' || command === '-h' || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  switch (command) {
    case 'aider':
      await runFeature(process.argv.slice(2)); // Pass all args including flags
      break;
    case 'conductor':
      await runConductor(process.argv.slice(2));
      break;
    case 'codex':
      await runCodex(process.argv.slice(2));
      break;
    case 'amp':
      await runAmp(process.argv.slice(2));
      break;
    case 'agent':
      await runAgent(process.argv.slice(2));
      break;
    default:
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
