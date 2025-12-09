import 'dotenv/config';
import { spawn } from 'child_process';
import { DEFAULT_MODEL } from './config';

// Helper to get API key configuration based on model
function getApiKeyArgs(model: string): string[] {
  const args: string[] = [];
  
  // Check for Google/Gemini models
  if (model.includes('gemini') || model.includes('google')) {
    if (process.env.GOOGLE_API_KEY) {
      args.push('--api-key', `google=${process.env.GOOGLE_API_KEY}`);
    } else {
      console.warn(`⚠️  GOOGLE_API_KEY not set for Gemini model: ${model}`);
    }
  }
  // Check for Anthropic/Claude models
  else if (model.includes('claude') || model.includes('anthropic')) {
    if (process.env.ANTHROPIC_API_KEY) {
      args.push('--api-key', `anthropic=${process.env.ANTHROPIC_API_KEY}`);
    } else {
      console.warn(`⚠️  ANTHROPIC_API_KEY not set for Claude model: ${model}`);
    }
  }
  // Check for OpenAI models
  else if (model.includes('gpt') || model.includes('openai')) {
    if (process.env.OPENAI_API_KEY) {
      args.push('--api-key', `openai=${process.env.OPENAI_API_KEY}`);
    } else {
      console.warn(`⚠️  OPENAI_API_KEY not set for OpenAI model: ${model}`);
    }
  }
  // Check for DeepSeek models
  else if (model.includes('deepseek')) {
    if (process.env.DEEPSEEK_API_KEY) {
      args.push('--api-key', `deepseek=${process.env.DEEPSEEK_API_KEY}`);
    } else {
      console.warn(`⚠️  DEEPSEEK_API_KEY not set for DeepSeek model: ${model}`);
    }
  }
  // For other models, check for a generic API key
  else if (process.env.AIDER_API_KEY) {
    args.push('--api-key', process.env.AIDER_API_KEY);
  }
  
  return args;
}

// Helper to run aider with a specific prompt and capture output (planning only, no changes)
export async function runAiderForPlan(prompt: string, targetPath: string, model?: string): Promise<string> {
  const modelToUse = model || DEFAULT_MODEL;
  const aiderArgs: string[] = [
    '--model', modelToUse,
    '--message', prompt,
    '--dry-run', // Don't make any actual changes, just show what would be done
    '--yes-always', // Auto-accept file additions and other prompts during planning
    '--no-auto-commits',
    '--add-gitignore-files' // Allow aider to work with files even if they're in gitignore (for planning)
  ];
  
  // Add API key configuration based on the model
  aiderArgs.push(...getApiKeyArgs(modelToUse));
  
  return new Promise<string>((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    
    const aiderProcess = spawn('aider', aiderArgs, {
      cwd: targetPath,
      stdio: ['pipe', 'pipe', 'pipe'], // Use pipe for stdin too so we can control it
      shell: false
    });

    // Handle keyboard interrupts
    const cleanup = () => {
      if (!aiderProcess.killed) {
        aiderProcess.kill('SIGINT');
      }
    };
    process.on('SIGINT', cleanup);

    // Auto-answer "A" (all) to file addition prompts
    aiderProcess.stdin?.write('A\n');
    aiderProcess.stdin?.end();

    aiderProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    aiderProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    aiderProcess.on('exit', (code) => {
      process.removeListener('SIGINT', cleanup);
      if (code === 0 || code === 130) { // 130 is SIGINT exit code
        resolve(output + errorOutput);
      } else {
        reject(new Error(`Aider exited with code ${code}. Output: ${output + errorOutput}`));
      }
    });
    
    aiderProcess.on('error', (error) => {
      process.removeListener('SIGINT', cleanup);
      reject(error);
    });
  });
}

// Helper to run aider with a specific prompt (for implementation)
export async function runAider(prompt: string, targetPath: string, model?: string): Promise<void> {
  const modelToUse = model || DEFAULT_MODEL;
  const aiderArgs: string[] = [
    '--model', modelToUse,
    '--message', prompt,
    '--auto-commits'
  ];
  
  // Add API key configuration based on the model
  aiderArgs.push(...getApiKeyArgs(modelToUse));
  
  const aiderProcess = spawn('aider', aiderArgs, {
    cwd: targetPath,
    stdio: 'inherit',
    shell: false
  });

  return new Promise<void>((resolve, reject) => {
    // Handle keyboard interrupts
    const cleanup = () => {
      if (!aiderProcess.killed) {
        aiderProcess.kill('SIGINT');
      }
    };
    process.on('SIGINT', cleanup);

    aiderProcess.on('exit', (code) => {
      process.removeListener('SIGINT', cleanup);
      if (code === 0 || code === 130) { // 130 is SIGINT exit code
        console.log("\n✅ Aider session completed.");
      } else {
        console.log(`\n⚠️  Aider exited with code ${code}.`);
      }
      resolve();
    });
    
    aiderProcess.on('error', (error) => {
      process.removeListener('SIGINT', cleanup);
      console.error("\n❌ Error starting Aider:", error.message);
      reject(error);
    });
  });
}
