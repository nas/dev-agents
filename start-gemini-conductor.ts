import 'dotenv/config';
import { input, select } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { ProgressIndicator } from './utils';

type ApprovalMode = 'default' | 'auto_edit' | 'yolo';

type GeminiConductorOptions = {
  model?: string;
  approvalMode?: ApprovalMode;
  extensions: string[];
  debug?: boolean;
};

type ParsedArgs = {
  task?: string;
  options: GeminiConductorOptions;
  showHelp: boolean;
};

function showHelp(): void {
  console.log(`
GEMINI CONDUCTOR

Usage:
  npx tsx start-gemini-conductor.ts --task "Your task"
  npx tsx start-gemini-conductor.ts "Your task"
  npx tsx start-gemini-conductor.ts --help

Options:
  --task <text>              Task description (positional also supported)
  --model <name>             Gemini model override
  --extensions <list>        Comma-separated extensions (default: conductor)
  --approval-mode <mode>     default | auto_edit | yolo
  --yolo                     Shortcut for --approval-mode yolo
  --debug                    Enable Gemini CLI debug logging
  --help, -h                 Show this help message
`);
}

function normalizeExtensions(extensions?: string[]): string[] {
  const base = extensions && extensions.length > 0 ? extensions : ['conductor'];
  const unique = Array.from(new Set(base.map((item) => item.trim()).filter(Boolean)));
  if (!unique.includes('conductor')) {
    unique.push('conductor');
  }
  return unique;
}

function parseArgs(argv: string[]): ParsedArgs {
  let task: string | undefined;
  let model: string | undefined;
  let approvalMode: ApprovalMode | undefined;
  let extensions: string[] | undefined;
  let debug = false;
  let showHelp = false;
  let yolo = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
      break;
    }

    if (arg === '--task') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --task.');
      }
      task = value;
      i += 1;
      continue;
    }

    if (arg === '--model') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --model.');
      }
      model = value;
      i += 1;
      continue;
    }

    if (arg === '--approval-mode') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --approval-mode.');
      }
      if (!['default', 'auto_edit', 'yolo'].includes(value)) {
        throw new Error('Invalid value for --approval-mode. Use default, auto_edit, or yolo.');
      }
      approvalMode = value as ApprovalMode;
      i += 1;
      continue;
    }

    if (arg === '--extensions') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --extensions.');
      }
      extensions = value.split(',');
      i += 1;
      continue;
    }

    if (arg === '--yolo') {
      yolo = true;
      continue;
    }

    if (arg === '--debug') {
      debug = true;
      continue;
    }

    if (arg === '--') {
      task = argv.slice(i + 1).join(' ');
      break;
    }

    if (!arg.startsWith('-') && !task) {
      task = argv.slice(i).join(' ');
      break;
    }
  }

  if (yolo) {
    if (approvalMode && approvalMode !== 'yolo') {
      throw new Error('Use either --yolo or --approval-mode, not both.');
    }
    approvalMode = 'yolo';
  }

  return {
    task,
    options: {
      model,
      approvalMode,
      extensions: normalizeExtensions(extensions),
      debug
    },
    showHelp
  };
}

function buildInitialPlanPrompt(task: string): string {
  return `Task:
${task}

You are the Gemini Conductor agent for this repository.
Use the conductor guidelines in the repo for context.
Create a concise, numbered solution plan.
Do not edit files or run commands.
Output only the plan.`;
}

function buildRevisionPlanPrompt(task: string, previousPlan: string, modifications: string): string {
  return `Task:
${task}

Previous plan:
${previousPlan}

Requested changes:
${modifications}

Update the plan accordingly.
Do not edit files or run commands.
Output only the revised plan as numbered steps.`;
}

function buildImplementationPrompt(task: string, plan: string): string {
  return `Task:
${task}

Approved plan:
${plan}

Implement the plan in this repository.
Follow existing code style and patterns.
If tests are available, run them and fix failures.`;
}

function buildGeminiArgs(options: GeminiConductorOptions, extraArgs: string[] = []): string[] {
  const args: string[] = [];
  if (options.model) {
    args.push('-m', options.model);
  }
  if (options.debug) {
    args.push('--debug');
  }
  if (options.extensions.length > 0) {
    args.push('--extensions', options.extensions.join(','));
  }
  if (options.approvalMode) {
    args.push('--approval-mode', options.approvalMode);
  }
  args.push(...extraArgs);
  return args;
}

async function runGeminiConductorPlan(prompt: string, options: GeminiConductorOptions): Promise<string> {
  const args = buildGeminiArgs(options, ['--output-format', 'text']);
  args.push(prompt);

  return new Promise<string>((resolve, reject) => {
    const gemini = spawn('gemini', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';

    gemini.stdout?.on('data', (data) => {
      output += data.toString();
    });

    gemini.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    gemini.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Gemini Conductor plan failed with code ${code}. ${errorOutput}`.trim()));
        return;
      }
      resolve(output.trim());
    });

    gemini.on('error', (error) => reject(error));
  });
}

async function runGeminiConductorImplementation(prompt: string, options: GeminiConductorOptions): Promise<void> {
  const args = buildGeminiArgs(options);
  args.push(prompt);

  return new Promise<void>((resolve, reject) => {
    const gemini = spawn('gemini', args, { stdio: 'inherit' });

    gemini.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Gemini Conductor implementation failed with code ${code}.`));
        return;
      }
      resolve();
    });

    gemini.on('error', (error) => reject(error));
  });
}

async function main() {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error: any) {
    console.error(`\n${error.message}`);
    showHelp();
    process.exit(1);
    return;
  }

  if (parsed.showHelp) {
    showHelp();
    process.exit(0);
  }

  let task = parsed.task;
  if (!task) {
    task = await input({
      message: 'What task should Gemini Conductor solve?',
      validate: (value: string) => (value.trim() ? true : 'Please describe the task.')
    });
  }

  const options = parsed.options;
  const progress = new ProgressIndicator();
  let planPrompt = buildInitialPlanPrompt(task);
  let planText = '';

  while (true) {
    progress.start('Generating solution with Gemini Conductor...');
    try {
      planText = await runGeminiConductorPlan(planPrompt, options);
      progress.stop('Solution ready');
    } catch (error: any) {
      progress.stop();
      console.error(`\n${error.message}`);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('PROPOSED SOLUTION');
    console.log('='.repeat(60));
    console.log(planText || '(no output)');
    console.log('='.repeat(60));

    const decision = await select({
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Approve and implement', value: 'approve' },
        { name: 'Request changes', value: 'modify' },
        { name: 'Cancel', value: 'cancel' }
      ]
    });

    if (decision === 'approve') {
      break;
    }

    if (decision === 'cancel') {
      console.log('Exiting without changes.');
      process.exit(0);
    }

    const modifications = await input({
      message: 'Describe the changes you want in the solution:',
      validate: (value: string) => (value.trim() ? true : 'Please enter your requested changes.')
    });

    planPrompt = buildRevisionPlanPrompt(task, planText, modifications);
  }

  console.log('\nStarting implementation...');
  try {
    await runGeminiConductorImplementation(buildImplementationPrompt(task, planText), options);
    console.log('\nImplementation completed.');
  } catch (error: any) {
    console.error(`\n${error.message}`);
    process.exit(1);
  }
}

main();
