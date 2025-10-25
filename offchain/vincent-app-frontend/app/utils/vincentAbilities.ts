import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { bundledVincentAbility as erc20ApprovalBundledVincentAbility } from '@lit-protocol/vincent-ability-erc20-approval';
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility as liquidateVasBundledVincentAbility } from "@arthuravianna/vas-liquidate-ability";

import { delegateeSigner } from './signer';

// const litNodeClient = new LitNodeClient({
//   debug: true,
//   litNetwork: 'datil',
// });

export function getErc20ApprovalToolClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: erc20ApprovalBundledVincentAbility,
    ethersSigner: delegateeSigner,
  });
}


export function getLiquidateVasToolClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: liquidateVasBundledVincentAbility,
    ethersSigner: delegateeSigner,
  });
}