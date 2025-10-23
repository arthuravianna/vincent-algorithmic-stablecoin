#!/usr/bin/env tsx

import { setupFunderEnv } from '../lib/funder';
import { setupPinataJwt } from '../lib/pinata-jwt';

export async function runBootstrap() {
  const repoRoot = process.cwd();

  // Run the two setup phases
  await setupPinataJwt(repoRoot);
  await setupFunderEnv(repoRoot);

  // Completion banner
  const banner =
    `\n============================================\n` +
    `Vincent Starter Kit is now configured!\n` +
    `\nNext step: run the example Vincent ability with:\n` +
    `  pnpm test-e2e\n` +
    `============================================\n`;
  console.log(banner);
}

// Execute when run directly via tsx or node (after transpile)
if (require.main === module) {
  runBootstrap().catch((err) => {
    console.error('Bootstrap failed:', err?.message || String(err));
    process.exitCode = 1;
  });
}
