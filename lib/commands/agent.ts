import { select } from '@inquirer/prompts';
import { runConductor } from './conductor';
import { runCodex } from './codex';
import { runFeature } from './aider';

type AgentChoice = {
  name: string;
  runner: (argv: string[]) => Promise<void>;
};

const AGENTS: AgentChoice[] = [
  { name: 'Aider Builder', runner: runFeature },
  { name: 'Gemini Conductor', runner: runConductor },
  { name: 'Codex', runner: runCodex }
];

function showHelp(): void {
  console.log(`
AGENT LAUNCHER

Usage:
  npx tsx bin/ai-ops.ts agent
  npx tsx bin/ai-ops.ts agent -- --model gpt-4.1

Options:
  --help, -h  Show this help message

Notes:
  - Use "--" to pass flags to the selected agent.
  - Example: npx tsx bin/ai-ops.ts agent -- --model gpt-4.1
`);
}

function splitArgs(argv: string[]): { launcherArgs: string[]; passThrough: string[] } {
  const normalizedArgs = argv[0] === 'agent' ? argv.slice(1) : argv;
  const dividerIndex = normalizedArgs.indexOf('--');

  if (dividerIndex === -1) {
    return { launcherArgs: normalizedArgs, passThrough: normalizedArgs };
  }

  return {
    launcherArgs: normalizedArgs.slice(0, dividerIndex),
    passThrough: normalizedArgs.slice(dividerIndex + 1)
  };
}

export async function runAgent(argv: string[]) {
  const { launcherArgs, passThrough } = splitArgs(argv);
  if (launcherArgs.includes('--help') || launcherArgs.includes('-h')) {
    showHelp();
    return;
  }

  const selection = await select({
    message: 'Which agent do you want to run?',
    choices: AGENTS.map((agent) => ({
      name: agent.name,
      value: agent
    }))
  });

  await selection.runner(passThrough);
}
