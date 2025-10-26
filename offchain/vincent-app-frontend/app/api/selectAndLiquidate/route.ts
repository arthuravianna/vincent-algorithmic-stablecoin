import { serverEnv } from "@env/server";
import { clientEnv } from "@env/client";
import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { ethers } from "ethers";
import client from '../../turso_sql/turso';

import {getLiquidateVasToolClient} from "../../utils/vincentAbilities";

// VAS Token ABI - for checking balance
const VAS_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

type Liquidator = {
  address: string;
  pkpPublicKey: string;
  vasBalance: string;
};

type LiquidatePrecheckSuccessResult = {
  debtToLiquidate: bigint;
  collateralAddress: string;
  priceFeedUpdateHexData: string[];
  pythPublishTimes: number[];
};

type UndercollateralizedUser = LiquidatePrecheckSuccessResult & {
  userAddress: string;
};

// @notice Select a random liquidator and search a undercollateralized position to liquidate
// @dev This endpoint is triggered via a cron job (Vercel Functions)
// @dev Expected database schema: users table with columns: id (INTEGER PRIMARY KEY), address (TEXT UNIQUE), block_number (INTEGER)
// @dev Expected database schema: liquidators table with columns: id (INTEGER PRIMARY KEY), address (TEXT UNIQUE), pkpPublicKey (TEXT)
export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional - uncomment if you want to protect this endpoint)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting liquidator selection and liquidation process...');

    // Setup blockchain connection
    const provider = new ethers.providers.JsonRpcProvider(clientEnv.NEXT_PUBLIC_RPC_URL);
    const vasContract = new ethers.Contract(clientEnv.NEXT_PUBLIC_VAS_TOKEN_ADDRESS, VAS_ABI, provider);

    // Step 1: Select liquidators and find one with VAS balance > 0
    const selectedLiquidator = await selectLiquidatorWithBalance(vasContract);
    
    if (!selectedLiquidator) {
      return Response.json({
        success: false,
        error: 'No liquidators found with VAS balance > 0',
        message: 'All available liquidators have zero VAS balance'
      }, { status: 404 });
    }

    console.log(`Selected liquidator: ${selectedLiquidator.address} with balance: ${selectedLiquidator.vasBalance}`);

    // Step 2: Find undercollateralized position to liquidate
    const liquidatePrecheckResult = await selectUndercollateralizedUser(selectedLiquidator);
    if (!liquidatePrecheckResult) {
      return Response.json({
        success: false,
        error: 'No undercollateralized users found',
        message: 'All users are currently overcollateralized'
      }, { status: 404 });
    }

    // Step 3: Approve VAS spending if needed
    const approveResult = await approveLiquidatorVas(liquidatePrecheckResult.debtToLiquidate, selectedLiquidator);
    if (approveResult) {
      console.log(`Approved VAS spending for liquidator ${selectedLiquidator.address}, txHash: ${approveResult}`);
    } else {
      console.log(`No approval needed for liquidator ${selectedLiquidator.address}, already approved`);
    }

    // Step 4: Execute liquidation
    const liquidationTxHash = await liquidate(liquidatePrecheckResult, selectedLiquidator);
    console.log(`Successfully liquidated user ${liquidatePrecheckResult.userAddress} by liquidator ${selectedLiquidator.address}, liquidation txHash: ${liquidationTxHash}`);

    const response = {
      success: true,
      selectedLiquidator: {
        address: selectedLiquidator.address,
        pkpPublicKey: selectedLiquidator.pkpPublicKey,
        vasBalance: selectedLiquidator.vasBalance
      },
      message: `Successfully selected liquidator ${selectedLiquidator.address} with VAS balance ${selectedLiquidator.vasBalance}`
    };

    console.log('Liquidator selection complete:', response);
    return Response.json(response);

  } catch (error) {
    console.error('Error in selectAndLiquidate:', error);
    return Response.json({
      success: false,
      error: 'Failed to select liquidator',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Selects a liquidator from the database that has VAS balance > 0
 * @param vasContract - The VAS token contract instance
 * @returns Selected liquidator with their VAS balance, or null if none found
 */
async function selectLiquidatorWithBalance(vasContract: any): Promise<Liquidator | null> {
  try {
    // Get all liquidators from the database
    const liquidatorsResult = await client.execute(
      'SELECT address, pkpPublicKey FROM liquidators ORDER BY RANDOM();'
    );

    if (liquidatorsResult.rows.length === 0) {
      console.log('No liquidators found in database');
      return null;
    }

    console.log(`Found ${liquidatorsResult.rows.length} liquidators in database`);

    // Check each liquidator's VAS balance until we find one with balance > 0
    for (const row of liquidatorsResult.rows) {
      const liquidatorAddress = row.address as string;
      const pkpPublicKey = row.pkpPublicKey as string;

      try {
        // Check VAS balance
        const balance = await vasContract.balanceOf(liquidatorAddress) as ethers.BigNumber;
        const balanceString = balance.toString();

        console.log(`Liquidator ${liquidatorAddress} has VAS balance: ${balanceString}`);

        // If balance is greater than 0, select this liquidator
        if (balance.gt(0)) {
          return {
            address: liquidatorAddress,
            pkpPublicKey: pkpPublicKey,
            vasBalance: balanceString
          };
        }
      } catch (balanceError) {
        console.error(`Error checking balance for liquidator ${liquidatorAddress}:`, balanceError);
        // Continue to next liquidator if balance check fails
        continue;
      }
    }

    console.log('No liquidators found with VAS balance > 0');
    return null;

  } catch (error) {
    console.error('Error selecting liquidator:', error);
    throw error;
  }
}

async function selectUndercollateralizedUser(liquidator: Liquidator): Promise<UndercollateralizedUser | null> {
    // Get all users from the database
    const usersResult = await client.execute(
      'SELECT address FROM users ORDER BY RANDOM();'
    );

    if (usersResult.rows.length === 0) {
      console.log('No users found in database');
      return null;
    }

    console.log(`Found ${usersResult.rows.length} users in database`);

    const abilityContext = {
      delegatorPkpEthAddress: liquidator.pkpPublicKey
    };

    let liquidateAbilityParams = {
        rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
        userAddress: '', // to be filled per user
        engineAddress: clientEnv.NEXT_PUBLIC_VAS_ENGINE_ADDRESS,
        vasAddress: clientEnv.NEXT_PUBLIC_VAS_TOKEN_ADDRESS,
    };
    for (const row of usersResult.rows) {
        liquidateAbilityParams.userAddress = row.address as string;

        const liquidatePrecheckResult = await getLiquidateVasToolClient.precheck(
            liquidateAbilityParams,
            abilityContext
        );

        if (liquidatePrecheckResult.error) {
            // user is not undercollateralized or other error
            continue;
        }

        console.log(`Found undercollateralized user: ${liquidateAbilityParams.userAddress}`);

        return {
          userAddress: liquidateAbilityParams.userAddress,
          debtToLiquidate: liquidatePrecheckResult.debtToLiquidate,
          collateralAddress: liquidatePrecheckResult.collateralAddress,
          priceFeedUpdateHexData: liquidatePrecheckResult.priceFeedUpdateHexData,
          pythPublishTimes: liquidatePrecheckResult.pythPublishTimes,
        };
    }

    return null;
}

async function approveLiquidatorVas(debtToLiquidate: bigint, liquidator: Liquidator): Promise<`0x${string}` | null> {
  let approvalParams = {
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    tokenAddress: clientEnv.NEXT_PUBLIC_VAS_TOKEN_ADDRESS,
    spenderAddress: clientEnv.NEXT_PUBLIC_VAS_ENGINE_ADDRESS,
    amount: debtToLiquidate,
  };

  let approvalContext = {
    delegatorPkpEthAddress: liquidator.pkpPublicKey,
  };
  const approvalPrecheckResult = await erc20ApprovalToolClient.precheck(
    approvalParams,
    approvalContext
  );
  
  if (!approvalPrecheckResult.success) {
    throw new Error(`ERC20 approval tool precheck failed: ${approvalPrecheckResult}`);
  } else if (approvalPrecheckResult.result.alreadyApproved) {
    // No need to send tx, allowance is already at that amount
    return null;
  }

  // Sending approval tx
  const approvalExecutionResult = await erc20ApprovalToolClient.execute(
    approvalParams,
    approvalContext
  );
    console.log('ERC20 Approval Vincent Tool Response:', approvalExecutionResult);
  if (!approvalExecutionResult.success) {
    throw new Error(`ERC20 approval tool execution failed: ${approvalExecutionResult}`);
  }

  return approvalExecutionResult.result.approvalTxHash as `0x${string}`;
}

async function liquidate(undercollateralizedUser: UndercollateralizedUser, liquidator: Liquidator) {
  let liquidateAbilityParams = {
    rpcUrl: clientEnv.NEXT_PUBLIC_RPC_URL,
    engineAddress: clientEnv.NEXT_PUBLIC_VAS_ENGINE_ADDRESS,
    vasAddress: clientEnv.NEXT_PUBLIC_VAS_TOKEN_ADDRESS,
    userAddress: undercollateralizedUser.userAddress,
    debtToLiquidate: undercollateralizedUser.debtToLiquidate,
    collateralAddress: undercollateralizedUser.collateralAddress,
    priceFeedUpdateHexData: undercollateralizedUser.priceFeedUpdateHexData,
    pythPublishTimes: undercollateralizedUser.pythPublishTimes,
  };

  const abilityContext = {
    delegatorPkpEthAddress: liquidator.pkpPublicKey
  };

  const liquidateExecuteResult = await getLiquidateVasToolClient.execute(
      liquidateAbilityParams,
      abilityContext
  );

  if (liquidateExecuteResult.error) {
      throw new Error(`Liquidate execute failed: ${liquidateExecuteResult.error}`);
  }

  return liquidateExecuteResult.txHash;
}