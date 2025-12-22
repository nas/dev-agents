import 'dotenv/config';

// ==========================================
// 🔧 CONFIGURATION
// ==========================================
export const REPOS = {
  'Backend': process.env.BACKEND_REPO_PATH,
  'Frontend': process.env.FRONTEND_REPO_PATH,
  'Other': null, // Custom path will be entered by user
};

// Default AI model to use
export const DEFAULT_MODEL = process.env.AIDER_MODEL || 'gemini-2.5-pro';
export const DEFAULT_EDITOR_MODEL = process.env.AIDER_EDITOR_MODEL || 'deepseek-coder';