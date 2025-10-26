"use client";


import { useState, useEffect } from 'react';
import { LIT_EVM_CHAINS } from '@lit-protocol/constants';
import { ethers } from 'ethers';
import { clientEnv } from '@env/client';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// VincentAlgorithmicStablecoinEngine ABI - only the functions we need
const ENGINE_ABI = [
  'function getAcceptedCollateralTokens() view returns (address[])',
  'function getPriceFeedIds() view returns (bytes32[])'
];

interface CollateralContract {
  address: string;
  contract: ethers.Contract;
  symbol?: string;
  name?: string;
  decimals?: number;
}

export const useChain = () => {
  const [chain, setChain] = useState(LIT_EVM_CHAINS.baseSepolia);

  return {
    chain,
    setChain,
  };
};