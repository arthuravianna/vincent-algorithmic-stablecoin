import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

// Define supported tokens and their symbols
const getTokenInfo = (chainId: number) => {
  const tokenInfo: Record<number, Array<{ address: string; symbol: string; decimals: number }>> = {
    // Ethereum Mainnet
    1: [
      { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "wBTC", decimals: 8 },
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "wETH", decimals: 18 },
    ],
    // Ethereum Sepolia Testnet
    11155111: [
      { address: "0x29f2D40B0605204364af54EC677bD022dA425d03", symbol: "wBTC", decimals: 8 },
      { address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", symbol: "wETH", decimals: 18 },
    ],
    // Optimism Mainnet
    10: [
      { address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", symbol: "wBTC", decimals: 8 },
      { address: "0x4200000000000000000000000000000000000006", symbol: "wETH", decimals: 18 },
    ],
    // Hardhat local network (use test values)
    31337: [
      { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "wBTC", decimals: 8 },
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "wETH", decimals: 18 },
    ],
  };

  return tokenInfo[chainId] || tokenInfo[31337];
};

function help_message(env_var:string) {
  console.error(`❌ Please set ${env_var} environment variable or update the script`);
  console.log("Usage: VAS_ENGINE_ADDRESS=0x... TOKEN_SYMBOL=wETH DEPOSIT_AMOUNT=1 npx hardhat run scripts/depositCollateral.ts");
  process.exit(1);
}

async function main() {
  // Configuration - Update these values
  const VAS_ENGINE_ADDRESS = process.env.VAS_ENGINE_ADDRESS;
  const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL;
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT; // Amount to deposit
  
  if (!VAS_ENGINE_ADDRESS) {
    help_message("VAS_ENGINE_ADDRESS");
    process.exit(1);
  }

  if (!TOKEN_SYMBOL) {
    help_message("TOKEN_SYMBOL");
    process.exit(1);
  }

  if (!DEPOSIT_AMOUNT) {
    help_message("DEPOSIT_AMOUNT");
    process.exit(1);
  }

  const connection = await hre.network.connect();
  const chainId = connection.id;
  const [deployer] = await connection.viem.getWalletClients();
  const publicClient = await connection.viem.getPublicClient();

  console.log(`🔗 Connected to chain ID: ${chainId}`);
  console.log(`👤 Depositor address: ${deployer.account.address}`);
  console.log(`🏦 VAS Engine address: ${VAS_ENGINE_ADDRESS}`);
  
  // Get token information for this chain
  const tokenInfo = getTokenInfo(chainId);
  const selectedToken = tokenInfo.find(token => token.symbol.toLowerCase() === TOKEN_SYMBOL.toLowerCase());
  
  if (!selectedToken) {
    console.error(`❌ Token ${TOKEN_SYMBOL} not supported on chain ${chainId}`);
    console.log("Supported tokens:", tokenInfo.map(t => t.symbol).join(", "));
    process.exit(1);
  }

  console.log(`💰 Token: ${selectedToken.symbol} (${selectedToken.address})`);
  console.log(`📊 Amount: ${DEPOSIT_AMOUNT} ${selectedToken.symbol}`);

  // Convert amount to proper decimals
  const amount = parseUnits(DEPOSIT_AMOUNT, selectedToken.decimals);
  
  console.log(`🔢 Amount in wei: ${amount.toString()}`);

  try {
    // Get contract instances
    const vasEngine = await connection.viem.getContractAt(
      "VincentAlgorithmicStablecoinEngine",
      VAS_ENGINE_ADDRESS as `0x${string}`
    );

    const token = await connection.viem.getContractAt(
      "IERC20",
      selectedToken.address as `0x${string}`
    );

    // Check user's token balance
    const userBalance = await token.read.balanceOf([deployer.account.address]) as bigint;
    console.log(`💳 Your ${selectedToken.symbol} balance: ${formatUnits(userBalance, selectedToken.decimals)} ${selectedToken.symbol}`);

    if (userBalance < amount) {
      console.error(`❌ Insufficient balance. You have ${formatUnits(userBalance, selectedToken.decimals)} ${selectedToken.symbol}, but need ${DEPOSIT_AMOUNT} ${selectedToken.symbol}`);
      process.exit(1);
    }

    // Check current allowance
    const currentAllowance = await token.read.allowance([deployer.account.address, VAS_ENGINE_ADDRESS]) as bigint;
    console.log(`🔓 Current allowance: ${formatUnits(currentAllowance, selectedToken.decimals)} ${selectedToken.symbol}`);

    // Approve token spending if needed
    if (currentAllowance < amount) {
      console.log(`📝 Approving ${selectedToken.symbol} spending...`);
      
      const approveTx = await token.write.approve([VAS_ENGINE_ADDRESS, amount], {
        account: deployer.account,
      });
      
      console.log(`⏳ Approval transaction hash: ${approveTx}`);
      
      // Wait for approval confirmation
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx,
      });
      
      if (approvalReceipt.status === "success") {
        console.log(`✅ Approval confirmed in block ${approvalReceipt.blockNumber}`);
      } else {
        console.error(`❌ Approval failed`);
        process.exit(1);
      }
    } else {
      console.log(`✅ Sufficient allowance already exists`);
    }

    // Deposit collateral
    console.log(`🏦 Depositing ${DEPOSIT_AMOUNT} ${selectedToken.symbol} as collateral...`);
    
    const depositTx = await vasEngine.write.depositCollateral([
      selectedToken.address as `0x${string}`,
      amount
    ], {
      account: deployer.account,
    });

    console.log(`⏳ Deposit transaction hash: ${depositTx}`);

    // Wait for deposit confirmation
    const depositReceipt = await publicClient.waitForTransactionReceipt({
      hash: depositTx,
    });

    if (depositReceipt.status === "success") {
      console.log(`✅ Deposit confirmed in block ${depositReceipt.blockNumber}`);
      
      // Check for CollateralDeposited event
      const logs = depositReceipt.logs;
      if (logs.length > 0) {
        console.log(`� Transaction included ${logs.length} event(s)`);
      }

      console.log(`🎉 Successfully deposited ${DEPOSIT_AMOUNT} ${selectedToken.symbol} as collateral!`);
      console.log(`ℹ️  Your collateral is now available for minting VAS tokens`);
      
    } else {
      console.error(`❌ Deposit failed`);
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Error during deposit:", error);
    process.exit(1);
  }
}

main().catch(console.error);