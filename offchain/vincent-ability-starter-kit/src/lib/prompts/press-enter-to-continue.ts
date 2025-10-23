import inquirer from 'inquirer';

/**
 * Prompts the user to press Enter to continue.
 * Blocks until the user presses Enter.
 */
export async function pressEnterToContinue(actionMessage: string): Promise<void> {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'continue',
      message: `Once you have ${actionMessage}, Press Enter to continue...`,
    },
  ]);
}
