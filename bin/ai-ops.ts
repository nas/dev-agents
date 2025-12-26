#!/usr/bin/env node
import { runFeature } from '../lib/commands/feature';
import { runConductor } from '../lib/commands/conductor';
import { runCodex } from '../lib/commands/codex';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (command) {
    case 'feature':
      await runFeature(process.argv.slice(2)); // Pass all args including flags
      break;
    case 'conductor':
      await runConductor(process.argv.slice(2));
      break;
    case 'codex':
      await runCodex(process.argv.slice(2));
      break;
    default:
      console.log(`
Usage: ai-ops <command> [options]

Commands:
  feature     Start the feature builder (Linear + Aider)
  conductor   Start the Gemini Conductor
  codex       Start the Codex Builder
      `);
      process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
