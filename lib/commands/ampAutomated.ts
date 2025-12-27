import 'dotenv/config';
import { Issue } from '@linear/sdk';
import fs from 'fs';
import path from 'path';

interface AmpAutomatedOptions {
  task: string;
  targetPath: string;
  ticket: Issue;
  branchName: string;
}

/**
 * Uses Amp SDK to automatically implement the task and apply changes to the repository
 */
export async function runAmpAutomated(options: AmpAutomatedOptions): Promise<void> {
  const { task, targetPath, ticket, branchName } = options;

  try {
    // Check if AMP_API_KEY is available
    const ampApiKey = process.env.AMP_API_KEY;
    if (!ampApiKey) {
      throw new Error('AMP_API_KEY environment variable is not set. Cannot use automated mode.');
    }

    console.log(`📤 Sending implementation request to Amp...`);
    console.log(`   Ticket: ${ticket.identifier} - ${ticket.title}`);

    // Call Amp SDK to handle the implementation
    // This would integrate with Amp's SDK to:
    // 1. Send the task to the Amp thread
    // 2. Wait for response with implemented code
    // 3. Apply changes to targetPath
    // 4. Commit changes to the branchName

    const ampResponse = await sendTaskToAmpSdk({
      apiKey: ampApiKey,
      task,
      ticketId: ticket.identifier,
      ticketTitle: ticket.title,
      targetPath,
      branchName
    });

    console.log(`✅ Received implementation from Amp SDK`);
    console.log(`   Files modified: ${ampResponse.filesModified.length}`);
    
    // Apply the changes returned from Amp SDK
    await applyChanges(targetPath, ampResponse.changes);

    console.log(`✅ Changes applied to repository on branch: ${branchName}`);
  } catch (error) {
    throw new Error(`Failed to run automated implementation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface AmpSDKRequest {
  apiKey: string;
  task: string;
  ticketId: string;
  ticketTitle: string;
  targetPath: string;
  branchName: string;
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
 * Sends the task to Amp SDK and waits for the implementation
 */
async function sendTaskToAmpSdk(request: AmpSDKRequest): Promise<AmpSDKResponse> {
  const { apiKey, task, targetPath, branchName } = request;

  const prompt = `Implement this task in the codebase:

${task}

Working directory: ${targetPath}
Branch name: ${branchName}

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

  try {
    console.log('⏳ Waiting for Amp to complete implementation...');

    // Dynamically import the Amp SDK to work around ESM export issues
    const { execute } = await import('@sourcegraph/amp-sdk');

    // Execute the task with API key - start a new thread (don't use continue)
    // This ensures we use API mode instead of free mode
    for await (const message of execute({
      prompt,
      options: {
        cwd: targetPath,
        dangerouslyAllowAll: true,
        logLevel: 'error',
        // Pass API key via env 
        env: {
          AMP_API_KEY: apiKey
        }
      }
    })) {

      if (message.type === 'assistant') {
        // Show progress
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
  } catch (error) {
    throw error;
  }
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
