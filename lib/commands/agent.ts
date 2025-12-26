import { select } from '@inquirer/prompts';
import { runConductor } from './conductor';
import { runCodex } from './codex';
import { runFeature } from './aider';
import { runAmp } from './amp';
import { showHelp } from '../../utils';

type AgentChoice = {
  name: string;
  runner: (argv: string[]) => Promise<void>;
  models?: string[]; // Available models for this agent
};

const AGENTS: AgentChoice[] = [
  { name: 'Aider Builder', runner: runFeature },
  { 
    name: 'Gemini Conductor', 
    runner: runConductor,
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-3-flash-preview',
      'gemini-3-pro-preview'
    ]
  },
  { 
    name: 'Codex', 
    runner: runCodex,
    models: [
      'gpt-5.2-codex',
      'gpt-5.1-codex-max',
      'gpt-5.1-codex-mini',
      'gpt-5.2'
    ]
  },
  { name: 'Amp Agent', runner: runAmp }
];

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

  const agentSelection = await select({
    message: 'Which agent do you want to run?',
    choices: AGENTS.map((agent) => ({
      name: agent.name,
      value: agent
    }))
  });

  // If agent has model options, let user select a model
  let finalArgs = [...passThrough];
  if (agentSelection.models && agentSelection.models.length > 0) {
    // Check if model is already provided via --model flag
    const hasModelFlag = passThrough.includes('--model');
    
    if (!hasModelFlag) {
      const modelSelection = await select({
        message: 'Select a model:',
        choices: agentSelection.models.map((model) => ({
          name: model,
          value: model
        }))
      });
      
      // Add --model flag with selected model
      finalArgs.push('--model', modelSelection);
    }
  }

  await agentSelection.runner(finalArgs);
}
