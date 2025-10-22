import hre from "hardhat";
import VincentAlgorithmicStablecoinEngineModule from "../ignition/modules/VincentAlgorithmicStablecoin.js";

// Define Pyth contract addresses for different chains
// Addresses from https://docs.pyth.network/price-feeds/contract-addresses/evm
const getPythAddress = (chainId: number): string => {
  const pythAddresses: Record<number, string> = {
    // Ethereum Mainnet
    1: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
    // Ethereum Sepolia Testnet
    11155111: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
    // Optimism Mainnet
    10: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    // Optimism Sepolia Testnet
    11155420: "0x0708325268dF9F66270F1401206434524814508b",
    // Base Mainnet
    8453: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a",
    // Base Sepolia Testnet
    84532: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
    // Arbitrum One
    42161: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    // Arbitrum Sepolia Testnet
    421614: "0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF",
    // Polygon Mainnet
    137: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
    // Avalanche Mainnet
    43114: "0x4305FB66699C3B2702D4d05CF36551390A4c69C6",
    // Local networks (use Sepolia address as fallback)
    31337: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21", // Hardhat default
  };

  return pythAddresses[chainId] || pythAddresses[31337]; // Default to local/testnet address
};

const getTokenAddressesAndPriceFeeds = (chainId: number) => {
  // Token addresses for wBTC, wETH, CTSI, LINK across different chains
  const tokenAddresses: Record<number, Array<string>> = {
    // Ethereum Mainnet
    1: [
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // wBTC
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // wETH
    ],
    // Ethereum Sepolia Testnet
    11155111: [
      "0x29f2D40B0605204364af54EC677bD022dA425d03", // wBTC (mock/testnet)
      "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // wETH (sepolia)
    ],
    // Optimism Mainnet
    10: [
      "0x68f180fcCe6836688e9084f035309E29Bf0A2095", // wBTC
      "0x4200000000000000000000000000000000000006", // wETH
    ],
    // Optimism Sepolia Testnet
    11155420: [
      "0x0000000000000000000000000000000000000000", // wBTC (not available)
      "0x4200000000000000000000000000000000000006", // wETH
    ],
    // Base Mainnet
    8453: [
      "0x0000000000000000000000000000000000000000", // wBTC (not natively available)
      "0x4200000000000000000000000000000000000006", // wETH
    ],
    // Base Sepolia Testnet
    84532: [
      "0x0000000000000000000000000000000000000000", // wBTC (not available)
      "0x4200000000000000000000000000000000000006", // wETH
    ],
    // Arbitrum One
    42161: [
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // wBTC
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // wETH
    ],
    // Arbitrum Sepolia Testnet
    421614: [
      "0x0000000000000000000000000000000000000000", // wBTC (not available)
      "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // wETH
    ],
    // Polygon Mainnet
    137: [
      "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // wBTC
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // wETH
    ],
    // Avalanche Mainnet
    43114: [
      "0x50b7545627a5162F82A992c33b87aDc75187B218", // wBTC
      "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // wETH
    ],
    // Hardhat local network (use Ethereum mainnet addresses for testing)
    31337: [
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // wBTC
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // wETH
    ],
  };

  // Pyth price feed IDs for wBTC/USD, wETH/USD
  const priceFeedIdsArray = [
    "0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33", // BTC/USD
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
  ];
  const priceFeedIds: Record<number, Array<string>> = {
    // All chains use the same Pyth price feed IDs
    1: priceFeedIdsArray,
    11155111: priceFeedIdsArray,
    10: priceFeedIdsArray,
    11155420: priceFeedIdsArray,
    8453: priceFeedIdsArray,
    84532: priceFeedIdsArray,
    42161: priceFeedIdsArray,
    421614: priceFeedIdsArray,
    137: priceFeedIdsArray,
    43114: priceFeedIdsArray,
    31337: priceFeedIdsArray,
  };

  return {
    tokenAddresses: tokenAddresses[chainId] || [],
    priceFeedIds: priceFeedIds[chainId] || [],
  };
};

async function main() {
  const connection = await hre.network.connect();
  const chainId = connection.networkConfig.chainId!;

  const pythPriceFeedAddress = getPythAddress(chainId);
  const { tokenAddresses, priceFeedIds } =
    getTokenAddressesAndPriceFeeds(chainId);

  console.log(`Deploying to chain ID: ${chainId}`);
  console.log(`Using Pyth price feed address: ${pythPriceFeedAddress}`);
  console.log(`Token addresses for this chain:`, tokenAddresses);
  console.log(`Price feed IDs:`, priceFeedIds);

  const { vas, vasEngine } = await connection.ignition.deploy(
    VincentAlgorithmicStablecoinEngineModule,
    {
      parameters: {
        VincentAlgorithmicStablecoinEngineModule: {
          pythPriceFeedAddress,
          tokenAddresses,
          priceFeedIds,
        },
      },
    }
  );

  console.log(`Vincent Algorithmic Stablecoin deployed to:`, vas.address);
  console.log(
    `Vincent Algorithmic Stablecoin Engine deployed to:`,
    vasEngine.address
  );
}

main().catch(console.error);
