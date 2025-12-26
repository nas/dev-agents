#!/usr/bin/env node
import { runFeature } from '../lib/commands/aider';
import { runConductor } from '../lib/commands/conductor';
import { runCodex } from '../lib/commands/codex';
import { runAgent } from '../lib/commands/agent';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
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
    case 'agent':
      await runAgent(process.argv.slice(2));
      break;
    default:
      console.log(`
Usage: ai-ops <command> [options]

Commands:
  aider       Start the Aider Feature Builder
  conductor   Start the Gemini Conductor
  codex       Start the Codex Builder
  agent       Choose an agent to run
      `);
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
