import { access, writeFile } from 'fs/promises';
import { join } from 'path';

import { stringify } from 'envfile';

import { getPinataJwt } from './prompts/get-pinata-jwt';
import { pressEnterToContinue } from './prompts/press-enter-to-continue';

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks for existing root .env, guides user to obtain Pinata JWT, prompts for it, and writes .env
 */
export async function setupPinataJwt(repoRoot: string): Promise<void> {
  const rootEnvPath = join(repoRoot, '.env');

  // Ensure there is no .env in the repo root
  if (await fileExists(rootEnvPath)) {
    console.log('An env file already exists at .env; skipping setup for Pinata JWT..');
    return;
  }

  console.log(
    'A Pinata JWT is required for e2e tests and for publishing Vincent Abilities and Policies to the Registry.',
  );
  console.log('You can get one for free at: https://app.pinata.cloud/developers/api-keys');

  await pressEnterToContinue('obtained your Pinata JWT');

  const { pinataJwt } = await getPinataJwt();

  // Write the root .env with the PINATA_JWT
  await writeFile(rootEnvPath, stringify({ PINATA_JWT: pinataJwt }), {
    encoding: 'utf8',
    flag: 'wx',
  });

  console.log('Saved your Pinata JWT to .env');
}
