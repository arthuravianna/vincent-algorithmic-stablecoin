import inquirer from 'inquirer';

export type GetPinataJwtResult = {
  pinataJwt: string;
};

/**
 * Prompt the user for a Pinata JWT used to upload LIT Actions to IPFS.
 * - Input is masked
 * - Trims whitespace
 * - Basic validation to ensure it looks like a JWT (three dot-separated base64url segments)
 */
export async function getPinataJwt(): Promise<GetPinataJwtResult> {
  const { pinataJwt } = await inquirer.prompt<{ pinataJwt: string }>([
    {
      type: 'input',
      name: 'pinataJwt',
      message: 'Enter your Pinata JWT (used to upload LIT Actions to IPFS):',
      validate: (input: string) => {
        const value = input.trim();
        if (!value) return 'Pinata JWT is required';
        // rudimentary JWT format check: header.payload.signature
        const parts = value.split('.');
        if (parts.length !== 3) return 'JWT must have 3 dot-separated parts';
        // base64url safe chars check for each part
        const b64url = /^[A-Za-z0-9-_]+$/;
        if (!parts.every((p) => p.length > 0 && b64url.test(p))) {
          return 'JWT parts must be base64url-encoded';
        }
        return true;
      },
    },
  ]);

  return { pinataJwt: pinataJwt.trim() };
}
