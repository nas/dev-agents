import { spawn, execSync, SpawnOptions } from 'child_process';

export class ProcessRunner {
  static async run(
    command: string, 
    args: string[], 
    options: SpawnOptions & { 
      onOutput?: (data: string) => void;
      onErrorOutput?: (data: string) => void;
      input?: string; 
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        ...options,
        stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
      });

      if (options.input && child.stdin) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      const cleanup = () => {
        if (!child.killed) {
          child.kill('SIGINT');
        }
      };
      process.on('SIGINT', cleanup);

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        if (options.onOutput) options.onOutput(text);
        else process.stdout.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        if (options.onErrorOutput) options.onErrorOutput(text);
        else process.stderr.write(text);
      });

      child.on('exit', (code) => {
        process.removeListener('SIGINT', cleanup);
        if (code === 0 || code === 130) { // 130 is SIGINT
          resolve();
        } else {
          reject(new Error(`${command} exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        process.removeListener('SIGINT', cleanup);
        reject(error);
      });
    });
  }

  static async runAndCapture(command: string, args: string[], options: SpawnOptions & { input?: string }): Promise<string> {
    let output = '';
    let errorOutput = '';
    
    await this.run(command, args, {
        ...options,
        onOutput: (data) => { output += data; process.stdout.write(data); },
        onErrorOutput: (data) => { errorOutput += data; process.stderr.write(data); },
        input: options.input
    });

    return output;
  }

  static exec(command: string, cwd?: string): string {
    try {
      return execSync(command, { cwd, encoding: 'utf-8' }).trim();
    } catch (error: any) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }
}
