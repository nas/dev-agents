// run-conductor.ts
import 'dotenv/config';

export function showHelp(): void {
  console.log(`
GEMINI CONDUCTOR CLI

Usage:
  npx tsx run-conductor.ts
  npx tsx run-conductor.ts --help

Options:
  --help, -h      Show this help message
`);
}

export async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  console.clear();
  console.log("🚀 \x1b[36mGEMINI CONDUCTOR\x1b[0m");
}

if (require.main === module) {
  main();
}
