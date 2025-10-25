import { ethers } from 'ethers';

import { serverEnv } from '@env/server';

export const readOnlySigner = new ethers.Wallet(
  ethers.Wallet.createRandom().privateKey,
  new ethers.providers.JsonRpcProvider(serverEnv.CHRONICLE_YELLOWSTONE_RPC)
);

export const delegateeSigner = new ethers.Wallet(
  serverEnv.VINCENT_DELEGATEE_PRIVATE_KEY,
  new ethers.providers.StaticJsonRpcProvider(serverEnv.CHRONICLE_YELLOWSTONE_RPC)
);