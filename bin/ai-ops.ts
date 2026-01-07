#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Load .env file from project root, regardless of current working directory
// Since we're using ESM with tsx, get the script directory from import.meta.url
const scriptDir = dirname(fileURLToPath(import.meta.url));
// Go up one level from bin/ to project root
const projectRoot = resolve(scriptDir, '..');
// Load .env from project root
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  // Fallback: try current working directory
  console.warn('No .env file found for dev-agents project, using environment variables');
  config();
}

config({ path: resolve(projectRoot, '.env') });

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
