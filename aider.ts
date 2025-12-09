import 'dotenv/config';
import { spawn } from 'child_process';

// Helper to run aider with a specific prompt and capture output (planning only, no changes)
export async function runAiderForPlan(prompt: string, targetPath: string): Promise<string> {
  const aiderArgs: string[] = [
    '--model', 'gemini-2.5-pro',
    '--message', prompt,
    '--dry-run', // Don't make any actual changes, just show what would be done
    '--yes-always', // Auto-accept file additions and other prompts during planning
    '--no-auto-commits',
    '--add-gitignore-files' // Allow aider to work with files even if they're in gitignore (for planning)
  ];
  
  if (process.env.GOOGLE_API_KEY) {
    aiderArgs.push('--api-key', `google=${process.env.GOOGLE_API_KEY}`);
  }
  
  return new Promise<string>((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    
    const aiderProcess = spawn('aider', aiderArgs, {
      cwd: targetPath,
      stdio: ['pipe', 'pipe', 'pipe'], // Use pipe for stdin too so we can control it
      shell: false
    });

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
      if (code === 0) {
        resolve(output + errorOutput);
      } else {
        reject(new Error(`Aider exited with code ${code}. Output: ${output + errorOutput}`));
      }
    });
    
    aiderProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper to run aider with a specific prompt (for implementation)
export async function runAider(prompt: string, targetPath: string): Promise<void> {
  const aiderArgs: string[] = [
    '--model', 'gemini-2.5-pro',
    '--message', prompt,
    '--auto-commits'
  ];
  
  if (process.env.GOOGLE_API_KEY) {
    aiderArgs.push('--api-key', `google=${process.env.GOOGLE_API_KEY}`);
  }
  
  const aiderProcess = spawn('aider', aiderArgs, {
    cwd: targetPath,
    stdio: 'inherit',
    shell: false
  });

  return new Promise<void>((resolve, reject) => {
    aiderProcess.on('exit', (code) => {
      if (code === 0) {
        console.log("\n✅ Aider session completed.");
      } else {
        console.log(`\n⚠️  Aider exited with code ${code}.`);
      }
      resolve();
    });
    
    aiderProcess.on('error', (error) => {
      console.error("\n❌ Error starting Aider:", error.message);
      reject(error);
    });
  });
}
