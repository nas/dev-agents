import 'dotenv/config';
import { execSync } from 'child_process';

export interface AppConfig {
  linearApiKey?: string;
  googleApiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
  aiderApiKey?: string;
  defaultModel: string;
  defaultEditorModel: string;
  backendRepoPath?: string;
  frontendRepoPath?: string;
}

export class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = {
      linearApiKey: process.env.LINEAR_API_KEY,
      googleApiKey: process.env.GOOGLE_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      aiderApiKey: process.env.AIDER_API_KEY,
      defaultModel: process.env.AIDER_MODEL || 'gemini-2.5-pro',
      defaultEditorModel: process.env.AIDER_EDITOR_MODEL || 'deepseek-coder',
      backendRepoPath: process.env.BACKEND_REPO_PATH,
      frontendRepoPath: process.env.FRONTEND_REPO_PATH,
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  validate(): string[] {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for at least one AI API key if using AI models
    if (!this.config.googleApiKey && !this.config.anthropicApiKey && !this.config.openaiApiKey && !this.config.deepseekApiKey && !this.config.aiderApiKey) {
      warnings.push('No AI API key found. Set GOOGLE_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or AIDER_API_KEY');
    }

    try {
      execSync('which aider', { stdio: 'pipe' });
    } catch {
      errors.push('aider command not found. Install with: pip install aider-chat');
    }

    try {
      execSync('which gh', { stdio: 'pipe' });
    } catch {
      errors.push('GitHub CLI (gh) not found. Install from: https://cli.github.com');
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  Environment warnings:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    return errors;
  }

  getApiKeyArgs(model: string): string[] {
    const args: string[] = [];
    
    // Check for Google/Gemini models
    if (model.includes('gemini') || model.includes('google')) {
      if (this.config.googleApiKey) {
        args.push('--api-key', `google=${this.config.googleApiKey}`);
      } else {
        console.warn(`⚠️  GOOGLE_API_KEY not set for Gemini model: ${model}`);
      }
    }
    // Check for Anthropic/Claude models
    else if (model.includes('claude') || model.includes('anthropic')) {
      if (this.config.anthropicApiKey) {
        args.push('--api-key', `anthropic=${this.config.anthropicApiKey}`);
      } else {
        console.warn(`⚠️  ANTHROPIC_API_KEY not set for Claude model: ${model}`);
      }
    }
    // Check for OpenAI models
    else if (model.includes('gpt') || model.includes('openai')) {
      if (this.config.openaiApiKey) {
        args.push('--api-key', `openai=${this.config.openaiApiKey}`);
      } else {
        console.warn(`⚠️  OPENAI_API_KEY not set for OpenAI model: ${model}`);
      }
    }
    // Check for DeepSeek models
    else if (model.includes('deepseek')) {
      if (this.config.deepseekApiKey) {
        args.push('--api-key', `deepseek=${this.config.deepseekApiKey}`);
      } else {
        console.warn(`⚠️  DEEPSEEK_API_KEY not set for DeepSeek model: ${model}`);
      }
    }
    // For other models, check for a generic API key
    else if (this.config.aiderApiKey) {
      args.push('--api-key', this.config.aiderApiKey);
    }
    
    return args;
  }
}
