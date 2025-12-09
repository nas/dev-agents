import 'dotenv/config';

// ==========================================
// 🔧 CONFIGURATION
// ==========================================
export const REPOS = {
  'Backend': process.env.BACKEND_REPO_PATH,
  'Frontend': process.env.FRONTEND_REPO_PATH,
  'Other': null, // Custom path will be entered by user
};
