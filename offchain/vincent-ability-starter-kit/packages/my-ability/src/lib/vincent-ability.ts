import {
  createVincentAbility,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import type { EthersType /*LitNamespace*/ } from '../Lit';
import { HermesClient } from "@pythnetwork/hermes-client";


import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
  KNOWN_ERRORS,
  AccountInformation,
  TokenBalance,
} from './schemas';

// declare const Lit: typeof LitNamespace;
declare const ethers: EthersType;

const { USER_IS_OVERCOLLATERALIZED } = KNOWN_ERRORS;


const LIQUIDATION_THRESHOLD = BigInt(50); // 200% overcollateralized
const LIQUIDATION_PRECISION = BigInt(100);
const vincentAlgorithmicStablecoinEngineABI = [
    {
      "inputs": [
        {
          "internalType": "contract VincentAlgorithmicStablecoin",
          "name": "vas",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "pythContract",
          "type": "address"
        },
        {
          "internalType": "address[]",
          "name": "tokenAddresses",
          "type": "address[]"
        },
        {
          "internalType": "bytes32[]",
          "name": "pythFeedIds",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "CombinedPriceOverflow",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExponentOverflow",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInputExpo",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NegativeInputPrice",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_AmountMustBeGreaterThanZero",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "healthFactor",
          "type": "uint256"
        }
      ],
      "name": "VincentAlgorithmicStablecoinEngine_HealthFactorIsBroken",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_HealthFactorNotImproved",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_HealthFactorOk",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_MintFailed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_TokenAddressesAndPriceFeedIdsMustBeSameLength",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_TransferFailed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoinEngine_UnsupportedCollateralToken",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "CollateralDeposited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "CollateralRedeemed",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "int64",
          "name": "price",
          "type": "int64"
        },
        {
          "internalType": "int32",
          "name": "expo",
          "type": "int32"
        },
        {
          "internalType": "uint8",
          "name": "targetDecimals",
          "type": "uint8"
        }
      ],
      "name": "_convertToUint",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "depositCollateral",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountCollateral",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amountVasToMint",
          "type": "uint256"
        },
        {
          "internalType": "bytes[]",
          "name": "pythPriceUpdates",
          "type": "bytes[]"
        },
        {
          "internalType": "uint64[]",
          "name": "pythPublishTimes",
          "type": "uint64[]"
        }
      ],
      "name": "depositCollateralAndMint",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAcceptedCollateralTokens",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getAccountInformationBalances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalVasMinted",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint8",
              "name": "decimals",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "priceFeedId",
              "type": "bytes32"
            }
          ],
          "internalType": "struct VincentAlgorithmicStablecoinEngine.TokenBalance[]",
          "name": "balances",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getPriceFeedIds",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "collateral",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "debtToCover",
          "type": "uint256"
        },
        {
          "internalType": "bytes[]",
          "name": "pythPriceUpdates",
          "type": "bytes[]"
        },
        {
          "internalType": "uint64[]",
          "name": "pythPublishTimes",
          "type": "uint64[]"
        }
      ],
      "name": "liquidate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amountVasToMint",
          "type": "uint256"
        },
        {
          "internalType": "bytes[]",
          "name": "pythPriceUpdates",
          "type": "bytes[]"
        },
        {
          "internalType": "uint64[]",
          "name": "pythPublishTimes",
          "type": "uint64[]"
        }
      ],
      "name": "mintVas",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ];

const vincentAlgorithmicStablecoinABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "allowance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientAllowance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSpender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoin_MustBeMoreThanZero",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "VincentAlgorithmicStablecoin_NotZeroAddress",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "burn",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "burnFrom",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mint",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

// const SendLimitPolicy = createVincentAbilityPolicy({
//   abilityParamsSchema: abilityParamsSchema,
//   bundledVincentPolicy,
//   abilityParameterMappings: {
//     to: 'to',
//   },
// });


export const vincentAbility = createVincentAbility({
  packageName: '@arthuravianna/vas-liquidate-ability' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription: 'Liquidates undercollateralized Vincent Algorithmic Stablecoin users.',
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  
  /**
   * Precheck function to determine if the user can be liquidated
   * STEP 1: Fetch user account information from the Vincent Engine contract
   * STEP 2: Calculate health factor based on collateral value and VAS minted
   * STEP 3: Calculate debt to cover to bring health factor back to 1
   * STEP 4: Return debt to cover and collateral token to liquidate
   */
  precheck: async ({ abilityParams }, { fail, succeed, delegation }) => {
    const { rpcUrl, engineAddress, userAddress, vasAddress } = abilityParams;
    const { ethAddress: delegatorAddress } = delegation.delegatorPkpInfo;

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const engineContract = new ethers.Contract(
      engineAddress,
      vincentAlgorithmicStablecoinEngineABI,
      provider
    );

    // STEP 1: Fetch user account information from the Vincent Engine contract
    const accountInfo: AccountInformation = await engineContract.getAccountInformationBalances(userAddress);
    if (accountInfo.totalVasMinted === BigInt(0)) {
      return fail({
        error: `User (${userAddress}) has no VAS minted, cannot be liquidated.`,
        reason: USER_IS_OVERCOLLATERALIZED,
      });
    }

    const priceFeedIds: Array<string> = (await engineContract.functions.getPriceFeedIds())[0];

    // Fetch the latest prices from Pyth using the priceFeedIds
    const hermesClientConnection = new HermesClient(
      "https://hermes.pyth.network"
    );
    const priceFeedUpdateData = await hermesClientConnection.getLatestPriceUpdates(
        priceFeedIds, 
    );
    let pythPublishTimes: Array<number> = priceFeedUpdateData.parsed?.map(p => p.price.publish_time) || [];

    let tokenBalancesInUsd: Array<{address: string, amountUsd: bigint}> = [];
    // calculate total collateral value in USD
    const getCollateralValueUSD = (balance: TokenBalance) => {
      if (balance.amount === BigInt(0)) return BigInt(0);
      
      const priceFeed = priceFeedUpdateData.parsed?.find(p => p.id === balance.priceFeedId);
      if (!priceFeed) return BigInt(0);

      const price = Number(priceFeed.price.price);
      const adjustedPrice = price * (10 ** (18 + priceFeed.price.expo)); // Adjust to 18 decimals
      const collateralValueUSD = (BigInt(balance.amount.toString()) * BigInt(Math.floor(adjustedPrice))) / BigInt(10 ** 18);
      tokenBalancesInUsd.push({address: balance.token, amountUsd: collateralValueUSD});

      return collateralValueUSD;
    }

    let totalCollateralValueUSD: bigint = BigInt(0);
    for (let i = 0; i < accountInfo.balances.length; i++) {
      const balance = accountInfo.balances[i];
      totalCollateralValueUSD += getCollateralValueUSD(balance);
    }

    // STEP 2: Calculate health factor based on collateral value and VAS minted
    const totalVasMinted = BigInt(accountInfo.totalVasMinted.toString());
    const collateralThreshold = (totalCollateralValueUSD * LIQUIDATION_THRESHOLD) / LIQUIDATION_PRECISION;
    const healthFactor = collateralThreshold / BigInt(totalVasMinted);

    if (healthFactor >= BigInt(1)) {
      return fail({
        error: `User (${userAddress}) is overcollateralized with health factor ${healthFactor.toString()}.`,
        reason: USER_IS_OVERCOLLATERALIZED,
      });
    }

    // STEP 3: Calculate debt to cover to bring health factor back to 1
    const debtToCover = totalVasMinted - collateralThreshold; // how much USD beyond collateral threshold
    const vasContract = new ethers.Contract(
      vasAddress,
      vincentAlgorithmicStablecoinABI,
      provider
    );

    // STEP 4: Return debt to cover and collateral token to liquidate
    const delegatorBalance: bigint = await vasContract.balanceOf(delegatorAddress);

    // select collateral token to liquidate
    // we are going to liquidate the token with the highest total value in USD (amount * price)
    // we can only liquidate one token at a time.
    const selectedCollateral = tokenBalancesInUsd.reduce((a, b) => (a.amountUsd > b.amountUsd ? a : b));
    // we can only liquidate up to selected collateral token USD value or equal to debtToCover
    const debtToLiquidate = selectedCollateral.amountUsd < debtToCover ? selectedCollateral.amountUsd : debtToCover;

    if (delegatorBalance < debtToLiquidate) {
      return succeed({ 
        debtToLiquidate: delegatorBalance, 
        priceFeedUpdateHexData: priceFeedUpdateData.binary.data,
        pythPublishTimes: pythPublishTimes,
        collateralAddress: selectedCollateral.address
      });
    }

    return succeed({ 
      debtToLiquidate: debtToLiquidate, 
      priceFeedUpdateHexData: priceFeedUpdateData.binary.data,
      pythPublishTimes: pythPublishTimes,
      collateralAddress: selectedCollateral.address 
    });
  },




  execute: async ({ abilityParams }, { succeed, fail, delegation, policiesContext }) => {
    try {
      const { rpcUrl, engineAddress, userAddress, 
        collateralAddress, debtToLiquidate, priceFeedUpdateHexData, pythPublishTimes
      } = abilityParams;

      if (!debtToLiquidate || debtToLiquidate === BigInt(0)) {
        throw new Error('Debt to liquidate must be greater than zero.');
      }

      if (!collateralAddress) {
        throw new Error('Collateral address is required for liquidation.');
      }
      
      if (!priceFeedUpdateHexData || priceFeedUpdateHexData.length === 0) {
        throw new Error('Price feed update data is required for liquidation.');
      }

      if (!pythPublishTimes || pythPublishTimes.length === 0) {
        throw new Error('Pyth publish times are required for liquidation.');
      }

      console.log(
        '[@arthuravianna/vas-liquidate-ability] Executing VAS liquidation with params:',
        {
          collateralAddress,
          userAddress,
          debtToLiquidate,
          priceFeedUpdateHexData,
          pythPublishTimes
        },
      );

      // Get provider - use provided RPC URL or default to Yellowstone
      const finalRpcUrl = rpcUrl || 'https://yellowstone-rpc.litprotocol.com/';
      const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl);

      console.log(
        '[@arthuravianna/vas-liquidate-ability] Using RPC URL:',
        finalRpcUrl,
      );

      // Get PKP's public key from the delegation context to use while composing a signed tx
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;

      // Execute the native send transaction
      const txHash = await laUtils.transaction.handler.contractCall({
        provider: provider,
        pkpPublicKey: pkpPublicKey,
        contractAddress: engineAddress,
        abi: vincentAlgorithmicStablecoinEngineABI,
        functionName: 'liquidate',
        args: [
          collateralAddress,
          userAddress,
          debtToLiquidate,
          priceFeedUpdateHexData,
          pythPublishTimes
        ],
        callerAddress: pkpPublicKey,
      });

      console.log(
        '[@arthuravianna/vas-liquidate-ability] Liquidate successful',
        {
          txHash,
          collateralAddress,
          userAddress,
          debtToLiquidate,
          priceFeedUpdateHexData,
          pythPublishTimes
        },
      );

      return succeed({
        txHash,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        '[@arthuravianna/vas-liquidate-ability] Liquidate failed',
        error,
      );

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
