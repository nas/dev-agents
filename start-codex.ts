import 'dotenv/config';
import { input, select } from '@inquirer/prompts';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ProgressIndicator } from './utils';

type CodexOptions = {
  cwd: string;
  model?: string;
  profile?: string;
};

function showHelp(): void {
  console.log(`
CODEX FEATURE BUILDER

Usage:
  npx tsx start-codex.ts
  npx tsx start-codex.ts --help

Options:
  --help, -h      Show this help message
  --model <name>  Override the Codex model (e.g., o3, gpt-4.1)
  --profile <id>  Use a Codex config profile from config.toml
`);
}

function buildInitialPlanPrompt(task: string): string {
  return `Task:
${task}

Create a concise, numbered implementation plan for this repository.
Do not make code changes or run commands.
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
Do not make code changes or run commands.
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

function getTempFile(prefix: string, filename: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return path.join(dir, filename);
}

function buildCodexArgs(baseArgs: string[], options: CodexOptions): string[] {
  const args = [...baseArgs];
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.profile) {
    args.push('--profile', options.profile);
  }
  return args;
}

async function runCodexPlan(prompt: string, options: CodexOptions): Promise<string> {
  const outputFile = getTempFile('codex-plan-', 'plan.txt');
  const args = buildCodexArgs(
    ['exec', '-C', options.cwd, '-s', 'read-only', '--output-last-message', outputFile, '-'],
    options
  );

  return new Promise<string>((resolve, reject) => {
    const codex = spawn('codex', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';

    codex.stdin?.write(prompt);
    codex.stdin?.end();

    codex.stdout?.on('data', () => {
      // Drain stdout to prevent backpressure; plan is read from output file.
    });

    codex.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    codex.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Codex plan failed with code ${code}. ${stderr}`.trim()));
        return;
      }
      try {
        const plan = fs.readFileSync(outputFile, 'utf-8').trim();
        resolve(plan);
      } catch (error: any) {
        reject(new Error(`Failed to read plan output: ${error.message}`));
      }
    });

    codex.on('error', (error) => reject(error));
  });
}

async function runCodexImplementation(prompt: string, options: CodexOptions): Promise<void> {
  const args = buildCodexArgs(['exec', '-C', options.cwd, '--full-auto', '-'], options);

  return new Promise<void>((resolve, reject) => {
    const codex = spawn('codex', args, { stdio: 'inherit' });

    codex.stdin?.write(prompt);
    codex.stdin?.end();

    codex.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Codex implementation failed with code ${code}.`));
        return;
      }
      resolve();
    });

    codex.on('error', (error) => reject(error));
  });
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  let model: string | undefined;
  const modelIndex = process.argv.indexOf('--model');
  if (modelIndex !== -1 && modelIndex + 1 < process.argv.length) {
    model = process.argv[modelIndex + 1];
  }

  let profile: string | undefined;
  const profileIndex = process.argv.indexOf('--profile');
  if (profileIndex !== -1 && profileIndex + 1 < process.argv.length) {
    profile = process.argv[profileIndex + 1];
  }

  const task = await input({
    message: 'What do you want Codex to design and implement?',
    validate: (value: string) => (value.trim() ? true : 'Please describe the task.')
  });

  const options: CodexOptions = { cwd: process.cwd(), model, profile };
  const progress = new ProgressIndicator();
  let planPrompt = buildInitialPlanPrompt(task);
  let planText = '';

  while (true) {
    progress.start('Generating plan with Codex...');
    try {
      planText = await runCodexPlan(planPrompt, options);
      progress.stop('Plan ready');
    } catch (error: any) {
      progress.stop();
      console.error(`\n${error.message}`);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('PROPOSED PLAN');
    console.log('='.repeat(60));
    console.log(planText);
    console.log('='.repeat(60));

    const decision = await select({
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Approve and implement', value: 'approve' },
        { name: 'Request changes to the plan', value: 'modify' },
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
      message: 'Describe the changes you want in the plan:',
      validate: (value: string) => (value.trim() ? true : 'Please enter your requested changes.')
    });

    planPrompt = buildRevisionPlanPrompt(task, planText, modifications);
  }

  console.log('\nStarting implementation...');
  try {
    await runCodexImplementation(buildImplementationPrompt(task, planText), options);
    console.log('\nImplementation completed.');
  } catch (error: any) {
    console.error(`\n${error.message}`);
    process.exit(1);
  }
}

main();
