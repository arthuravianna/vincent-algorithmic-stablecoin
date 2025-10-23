import inquirer from 'inquirer';

export type GetFunderAccountResult = {
  funderPrivateKey: string;
};

/**
 * Prompt the user for the funder account private key.
 * - Input is masked
 * - Trims whitespace
 * - Validates basic 0x-prefixed 64-hex pattern but allows empty to let caller decide fallback
 */
export async function getFunderAccount(): Promise<GetFunderAccountResult> {
  const { funderPrivateKey } = await inquirer.prompt<{ funderPrivateKey: string }>([
    {
      type: 'password',
      name: 'funderPrivateKey',
      message: 'Enter the Funder account private key (hex, starts with 0x):',
      mask: '*',
      validate: (input: string) => {
        const value = input.trim();
        if (!value) return 'Funder account private key is required';
        const isHex = /^0x[a-fA-F0-9]{64}$/.test(value);
        return isHex || 'Private key must be a 66-character 0x-prefixed hex string';
      },
    },
  ]);

  return { funderPrivateKey: funderPrivateKey.trim() };
}
