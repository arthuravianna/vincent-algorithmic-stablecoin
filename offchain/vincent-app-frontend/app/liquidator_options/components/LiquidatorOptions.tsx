"use client"



// export default function LiquidatorOptions() {
//     return (
//         <div>Liquidator Options Component</div>
//     );
// }

import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { LogOut, RefreshCcw, Copy, Check, WalletIcon, ArrowDownToLine } from 'lucide-react';

import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import { Spinner } from '@components/ui/spinner';
import { WalletModal } from '@components/wallet-modal';
import { useChain } from '@hooks/useChain';
import { clientEnv } from '@/app/env/client';

type collateralToken = {
  name: string;
  decimals: number;
  symbol: string;
  balance: ethers.BigNumber;
};

interface CollateralContract {
  address: string;
  contract: ethers.Contract;
  symbol?: string;
  name?: string;
  decimals?: number;
}

// VincentAlgorithmicStablecoinEngine ABI - only the functions we need
const ENGINE_ABI = [
  'function getAcceptedCollateralTokens() view returns (address[])',
  'function getPriceFeedIds() view returns (bytes32[])'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

const formatAddress = (address: string | undefined) => {
  if (!address) return 'Loading...';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function LiquidatorOptions() {
  const { chain } = useChain();
  const [balanceTokens, setBalanceTokens] = useState<collateralToken[]>([]);
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { authInfo, logOut } = useJwtContext();

  const fetchPkpCollateralBalance = async () => {
    if (!authInfo?.pkp.ethAddress) return;
  
    const provider = new ethers.providers.JsonRpcProvider(clientEnv.NEXT_PUBLIC_RPC_URL);
    try {
      setIsLoadingBalance(true);
      setError(null);


      const collateralContracts = await fetchAcceptedCollateralTokens(provider);
      let promises = collateralContracts.map(async (contract) => {
        const balance: ethers.BigNumber = await contract.contract.balanceOf(authInfo.pkp.ethAddress);
        return {
          name: contract.name || 'Unknown',
          symbol: contract.symbol || 'UNKNOWN',
          decimals: contract.decimals || 18,
          balance: balance,
        };
      });
  
      const tokensBalances = await Promise.all(promises);
      const [ethBalanceWei] = await Promise.all([
        provider.getBalance(authInfo?.pkp.ethAddress),
      ]);
  
      setEthBalance(ethers.utils.formatUnits(ethBalanceWei, 18));
      setBalanceTokens(tokensBalances);
  
      setIsLoadingBalance(false);
    } catch (err: unknown) {
      console.error('Error fetching PKP balances:', err);
      setError(`Failed to fetch wallet balance`);
      setIsLoadingBalance(false);
    }
  }

  const fetchAcceptedCollateralTokens = async (provider: ethers.providers.JsonRpcProvider) => {
    const engineContract = new ethers.Contract(clientEnv.NEXT_PUBLIC_VAS_ENGINE_ADDRESS, ENGINE_ABI, provider);
    
    // Get accepted collateral token addresses
    const tokenAddresses: string[] = await engineContract.getAcceptedCollateralTokens();

    console.log('Accepted collateral tokens:', tokenAddresses);

    // Create contract instances for each token and fetch metadata
    const contracts: CollateralContract[] = [];

    for (const tokenAddress of tokenAddresses) {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      try {
        // Fetch token metadata in parallel
        const [symbol, name, decimals] = await Promise.all([
          tokenContract.symbol().catch(() => 'UNKNOWN'),
          tokenContract.name().catch(() => 'Unknown Token'),
          tokenContract.decimals().catch(() => 18)
        ]);

        contracts.push({
          address: tokenAddress,
          contract: tokenContract,
          symbol,
          name,
          decimals
        });

        console.log(`Added collateral token: ${symbol} (${name}) at ${tokenAddress}`);
      } catch (tokenError) {
        console.error(`Error fetching metadata for token ${tokenAddress}:`, tokenError);
        // Still add the contract even if metadata fetch fails
        contracts.push({
          address: tokenAddress,
          contract: tokenContract
        });
      }
    }
    
    return contracts;
  }

  useEffect(() => {
    fetchPkpCollateralBalance();
  }, [authInfo]);
  
  const copyAddress = useCallback(async () => {
    const address = authInfo?.pkp.ethAddress;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy address to clipboard', err);
    }
  }, [authInfo?.pkp.ethAddress]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div data-test-id="wallet" className="w-full space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: 'Poppins, system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              Wallet Address
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`${chain.blockExplorerUrls[0]}/address/${authInfo?.pkp.ethAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:opacity-80"
                title={authInfo?.pkp.ethAddress}
                style={{
                  fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                  color: '#FF4205',
                }}
              >
                {formatAddress(authInfo?.pkp.ethAddress)}
              </a>
              <button
                onClick={copyAddress}
                disabled={!authInfo?.pkp.ethAddress}
                title={copied ? 'Copied!' : 'Copy address'}
                aria-label="Copy wallet address"
                className="p-0 bg-transparent border-none cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <Check className="h-5 w-5" style={{ color: '#FF4205' }} />
                ) : (
                  <Copy className="h-5 w-5" style={{ color: '#FF4205' }} />
                )}
              </button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: 'Poppins, system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              Network
            </span>
            <a
              href="https://basescan.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
            >
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-md"
                style={{
                  fontFamily: 'Poppins, system-ui, sans-serif',
                  backgroundColor: '#0052FF',
                  color: 'white',
                }}
              >
                {chain.name}
              </span>
            </a>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{
                  fontFamily: 'Poppins, system-ui, sans-serif',
                  color: 'var(--footer-text-color, #121212)',
                }}
              >
                ETH Balance
              </span>
            </div>
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                color: 'var(--footer-text-color, #121212)',
              }}
            >
              {isLoadingBalance
                ? 'Loading...'
                : `${parseFloat(ethBalance).toFixed(6)} ${chain.symbol}`}
            </span>
          </div>

          {
            balanceTokens.map((token) => {
              return (
                <div key={token.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{
                        fontFamily: 'Poppins, system-ui, sans-serif',
                        color: 'var(--footer-text-color, #121212)',
                      }}
                    >
                      {token.name} Balance
                    </span>
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: '"Encode Sans Semi Expanded", system-ui, sans-serif',
                      color: 'var(--footer-text-color, #121212)',
                    }}
                  >
                    {isLoadingBalance ? 'Loading...' : `${parseFloat(ethers.utils.formatUnits(token.balance, token.decimals))} ${token.symbol}`}
                  </span>
                </div>
              )
            })
          }
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fff1f0',
              color: '#ff4d4f',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span role="img" aria-label="Error">
              ⚠️
            </span>{' '}
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="flex-1 min-w-0" disabled={isLoadingBalance} onClick={fetchPkpCollateralBalance}>
            {isLoadingBalance ? (
              <>
                <Spinner variant="destructive" size="sm" />{' '}
                <span className="truncate">Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCcw className="flex-shrink-0" />{' '}
                <span className="truncate">Refresh Balance</span>
              </>
            )}
          </Button>
          <Button className="flex-1 min-w-0" onClick={() => setIsModalOpen(true)}>
            <ArrowDownToLine className="flex-shrink-0" /> <span className="truncate">Deposit</span>
          </Button>
          <Button
            className="flex-1 min-w-0"
            onClick={() =>
              window.open(
                `https://dashboard.heyvincent.ai/user/appId/${clientEnv.NEXT_PUBLIC_VINCENT_APP_ID}/wallet`,
                '_blank'
              )
            }
          >
            <WalletIcon className="flex-shrink-0" /> <span className="truncate">Withdraw</span>
          </Button>
        </div>
        <Button className="w-full" variant="destructive" onClick={logOut}>
          <LogOut className="flex-shrink-0" /> <span className="truncate">Log Out</span>
        </Button>

        <WalletModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          walletAddress={authInfo?.pkp.ethAddress}
        />
      </div>
    </div>
  );
};