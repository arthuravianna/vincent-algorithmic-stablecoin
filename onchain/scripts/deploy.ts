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

async function main() {
  const connection = await hre.network.connect();
  const chainId = connection.id;
  const pythPriceFeedAddress = getPythAddress(chainId);
  
  console.log(`Deploying to chain ID: ${chainId}`);
  console.log(`Using Pyth price feed address: ${pythPriceFeedAddress}`);
  
  const { vas, vasEngine } = await connection.ignition.deploy(VincentAlgorithmicStablecoinEngineModule, {
    parameters: {
      VincentAlgorithmicStablecoinEngineModule: {
        pythPriceFeedAddress
      }
    },
  });

  console.log(`Vincent Algorithmic Stablecoin deployed to: ${vas.address}`);
  console.log(`Vincent Algorithmic Stablecoin Engine deployed to: ${vasEngine.address}`);
}

main().catch(console.error);
