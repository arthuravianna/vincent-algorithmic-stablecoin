import { z } from 'zod';

// Response structure for getAccountInformationBalances
export interface TokenBalance {
  token: string;        // Address of the token
  amount: bigint;       // Amount of tokens (as BigNumber/bigint)
  decimals: number;     // Token decimals (uint8)
  priceFeedId: string;  // Pyth price feed ID (bytes32 as hex string)
}

export interface AccountInformation {
  totalVasMinted: bigint;     // Total VAS minted (as BigNumber/bigint)
  balances: TokenBalance[];   // Array of token balances
}

export const KNOWN_ERRORS = {
  USER_IS_OVERCOLLATERALIZED: 'USER_IS_OVERCOLLATERALIZED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
} as const;

/**
 * Tool parameters schema - defines the input parameters for the native send tool
 */
export const abilityParamsSchema = z.object({
  rpcUrl: z
    .string()
    .url('Invalid RPC URL format')
    .optional()
    .default('https://yellowstone-rpc.litprotocol.com/'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  engineAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  vasAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  debtToLiquidate: z.bigint().optional(),
  collateralAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  priceFeedUpdateHexData: z.string().array().optional(), // Hex string representing the price feed update data
  pythPublishTimes: z.array(z.number()).optional(), // Array of publish times corresponding to the price feed updates
});

/**
 * Precheck success result schema
 */
export const precheckSuccessSchema = z.object({
  debtToLiquidate: z.bigint(),
  priceFeedUpdateHexData: z.string().array(), // Hex string representing the price feed update data
  pythPublishTimes: z.array(z.number()),
  collateralAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'), // address of the collateral token to be liquidated
});

/**
 * Precheck failure result schema
 */
export const precheckFailSchema = z.object({
  reason: z.union([
    z.literal(KNOWN_ERRORS['USER_IS_OVERCOLLATERALIZED']),
    z.literal(KNOWN_ERRORS['INSUFFICIENT_BALANCE']), // Here for schema example purposes
  ]),
  error: z.string(),
});

/**
 * Execute success result schema
 */
export const executeSuccessSchema = z.object({
  txHash: z.string(),
  timestamp: z.number(),
});

/**
 * Execute failure result schema
 */
export const executeFailSchema = z.object({
  error: z.string(),
});

// Type exports
export type AbilityParams = z.infer<typeof abilityParamsSchema>;
export type PrecheckSuccess = z.infer<typeof precheckSuccessSchema>;
export type PrecheckFail = z.infer<typeof precheckFailSchema>;
export type ExecuteSuccess = z.infer<typeof executeSuccessSchema>;
export type ExecuteFail = z.infer<typeof executeFailSchema>;
