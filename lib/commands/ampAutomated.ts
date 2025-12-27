import 'dotenv/config';
import { Issue } from '@linear/sdk';
import { select, input } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import { ProgressIndicator } from '../../utils';

interface AmpAutomatedOptions {
  task: string;
  targetPath: string;
  ticket: Issue;
  branchName: string;
}

/**
 * Uses Amp SDK to automatically implement the task and apply changes to the repository
 * Follows the planning loop pattern: plan -> approve -> implement
 */
export async function runAmpAutomated(options: AmpAutomatedOptions): Promise<void> {
  const { task, targetPath, ticket, branchName } = options;
  const progress = new ProgressIndicator();

  try {
    // Check if AMP_API_KEY is available
    const ampApiKey = process.env.AMP_API_KEY;
    if (!ampApiKey) {
      throw new Error('AMP_API_KEY environment variable is not set. Cannot use automated mode.');
    }

    console.log(`\n🤖 Starting Amp planning session...`);

    let plan = '';
    let isFirstRun = true;
    let feedback = '';

    // Planning loop - let user approve or request changes
    while (true) {
      const message = isFirstRun ? 'Generating implementation plan...' : 'Updating plan...';
      progress.start(message);

      try {
        plan = await generatePlan(ampApiKey, task, targetPath, isFirstRun ? '' : plan, feedback);
        progress.stop();
      } catch (error: any) {
        progress.stop();
        console.error(`\n❌ Error generating plan: ${error.message}`);
        const action = await select({
          message: 'How would you like to proceed?',
          choices: [
            { name: 'Retry', value: 'retry' },
            { name: 'Cancel', value: 'cancel' }
          ]
        });
        if (action === 'cancel') return;
        continue;
      }

      isFirstRun = false;

      console.log('\n' + '='.repeat(60));
      console.log('PROPOSED PLAN');
      console.log('='.repeat(60));
      console.log(plan);
      console.log('='.repeat(60));

      const decision = await select({
        message: 'How would you like to proceed?',
        choices: [
          { name: '✅ Approve and implement', value: 'approve' },
          { name: '✏️  Request changes', value: 'modify' },
          { name: '❌ Cancel', value: 'cancel' }
        ]
      });

      if (decision === 'approve') {
        break;
      }

      if (decision === 'cancel') {
        console.log('Exiting without changes.');
        return;
      }

      feedback = await input({
        message: 'Describe the changes you want in the plan:',
        validate: (value: string) => (value.trim() ? true : 'Please enter your requested changes.')
      });
    }

    // Plan is approved, now implement
    console.log('\n🚀 Starting implementation...');
    progress.start('Implementing changes...');

    try {
      const ampResponse = await implementPlan(ampApiKey, task, targetPath, plan);
      progress.stop();

      console.log(`✅ Received implementation from Amp SDK`);
      console.log(`   Files modified: ${ampResponse.filesModified.length}`);

      // Apply the changes returned from Amp SDK
      await applyChanges(targetPath, ampResponse.changes);

      console.log(`✅ Changes applied to repository on branch: ${branchName}`);
    } catch (error: any) {
      progress.stop();
      throw new Error(`Implementation failed: ${error.message}`);
    }
  } catch (error) {
    throw new Error(`Failed to run automated implementation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a plan for implementing the task
 */
async function generatePlan(
  apiKey: string,
  task: string,
  targetPath: string,
  previousPlan: string,
  feedback: string
): Promise<string> {
  const prompt = previousPlan
    ? `Previous plan:\n${previousPlan}\n\nUser feedback:\n${feedback}\n\nPlease update the plan based on the feedback above.`
    : `Create a detailed implementation plan for this task:\n\n${task}\n\nWorking directory: ${targetPath}\n\nProvide a clear, step-by-step plan without implementing it yet.`;

  let planText = '';

  const execute = await getExecute();
  for await (const message of execute({
    prompt,
    options: {
      continue: true,
      cwd: targetPath,
      dangerouslyAllowAll: true,
      logLevel: 'error',
      env: {
        AMP_API_KEY: apiKey
      }
    }
  })) {
    if (message.type === 'result') {
      if (message.is_error) {
        throw new Error(`Amp plan generation failed: ${message.error}`);
      }
      planText = message.result || '';
    }
  }

  if (!planText) {
    throw new Error('No plan generated');
  }

  return planText;
}

/**
 * Implement the approved plan
 */
async function implementPlan(
  apiKey: string,
  task: string,
  targetPath: string,
  plan: string
): Promise<AmpSDKResponse> {
  const prompt = `Based on this approved plan:

${plan}

Now implement the task. Make all necessary code changes to complete the implementation.

${task}

When you're done, output a JSON block with this exact format at the end of your response:
\`\`\`json
{
  "filesModified": ["path/to/file1.ts", "path/to/file2.ts"],
  "changes": [
    {
      "path": "src/file1.ts",
      "content": "file contents here...",
      "action": "create"
    }
  ]
}
\`\`\``;

  let finalResult = '';

  const execute = await getExecute();
  for await (const message of execute({
    prompt,
    options: {
      continue: true,
      cwd: targetPath,
      dangerouslyAllowAll: true,
      logLevel: 'error',
      env: {
        AMP_API_KEY: apiKey
      }
    }
  })) {
    if (message.type === 'assistant') {
      const content = message.message?.content?.[0];
      if (content?.type === 'tool_use') {
        console.log(`   Using ${content.name}...`);
      }
    } else if (message.type === 'result') {
      if (message.is_error) {
        throw new Error(`Amp implementation failed: ${message.error}`);
      }
      finalResult = message.result || '';
    }
  }

  // Parse the JSON response from the final result
  const jsonMatch = finalResult.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    throw new Error('Could not extract implementation results from Amp response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return {
      filesModified: parsed.filesModified || [],
      changes: parsed.changes || []
    };
  } catch (parseError) {
    throw new Error(`Failed to parse Amp response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

/**
 * Get the execute function from Amp SDK (with dynamic import to avoid ESM issues)
 */
async function getExecute() {
  const { execute } = await import('@sourcegraph/amp-sdk');
  return execute;
}

interface AmpSDKResponse {
  filesModified: string[];
  changes: FileChange[];
}

interface FileChange {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

/**
 * Applies file changes to the target repository
 */
async function applyChanges(targetPath: string, changes: FileChange[]): Promise<void> {
  for (const change of changes) {
    const filePath = path.join(targetPath, change.path);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    switch (change.action) {
      case 'create':
      case 'modify':
        fs.writeFileSync(filePath, change.content, 'utf-8');
        console.log(`   ${change.action === 'create' ? '✨' : '📝'} ${change.path}`);
        break;
      case 'delete':
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`   🗑️  ${change.path}`);
        }
        break;
    }
  }
}
