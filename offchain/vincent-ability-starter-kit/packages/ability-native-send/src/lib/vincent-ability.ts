import {
  createVincentAbility,
  createVincentAbilityPolicy,
  supportedPoliciesForAbility,
} from '@lit-protocol/vincent-ability-sdk';
import { bundledVincentPolicy } from '@lit-protocol/vincent-example-policy-counter';
import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

import type { EthersType /*LitNamespace*/ } from '../Lit';

import {
  executeFailSchema,
  executeSuccessSchema,
  precheckFailSchema,
  precheckSuccessSchema,
  abilityParamsSchema,
  KNOWN_ERRORS,
} from './schemas';

// declare const Lit: typeof LitNamespace;
declare const ethers: EthersType;

const { INSUFFICIENT_BALANCE } = KNOWN_ERRORS;

const SendLimitPolicy = createVincentAbilityPolicy({
  abilityParamsSchema: abilityParamsSchema,
  bundledVincentPolicy,
  abilityParameterMappings: {
    to: 'to',
  },
});

export const vincentAbility = createVincentAbility({
  packageName: '@lit-protocol/vincent-example-ability-native-send' as const,
  abilityParamsSchema: abilityParamsSchema,
  abilityDescription: 'Send native ETH to a recipient',
  supportedPolicies: supportedPoliciesForAbility([SendLimitPolicy]),

  precheckSuccessSchema,
  precheckFailSchema,

  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { fail, succeed, delegation }) => {
    const { rpcUrl, amount, to } = abilityParams;
    const { ethAddress: delegatorAddress } = delegation.delegatorPkpInfo;

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const accountBalance = await provider.getBalance(delegatorAddress);
    if (accountBalance.lt(ethers.utils.parseEther(amount))) {
      return fail({
        error: `Delegator (${delegatorAddress} does not have enough tokens to send ${amount} to ${to}`,
        reason: INSUFFICIENT_BALANCE,
      });
    }

    return succeed({ availableBalance: accountBalance.toString() });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation, policiesContext }) => {
    try {
      const { to, amount, rpcUrl } = abilityParams;

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Executing Native Send Tool',
        {
          to,
          amount,
          rpcUrl,
        },
      );

      // Get provider - use provided RPC URL or default to Yellowstone
      const finalRpcUrl = rpcUrl || 'https://yellowstone-rpc.litprotocol.com/';
      const provider = new ethers.providers.JsonRpcProvider(finalRpcUrl);

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Using RPC URL:',
        finalRpcUrl,
      );

      // Get PKP's public key from the delegation context to use while composing a signed tx
      const pkpPublicKey = delegation.delegatorPkpInfo.publicKey;

      // Execute the native send transaction
      const txHash = await laUtils.transaction.handler.nativeSend({
        provider,
        pkpPublicKey,
        amount,
        to,
      });

      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Native send successful',
        {
          txHash,
          to,
          amount,
        },
      );

      // We will first track the send limit entry before submitting the tx to be extra safe about double-spending
      // If committing to the count policy fails, we don't want to submit the tx at all, so doing it first is important
      console.log(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Manually calling policy commit function...',
      );

      // This is a type-safe reference based on `supportedPolicies` in the ability definition
      const sendLimitPolicyContext =
        policiesContext.allowedPolicies['@lit-protocol/vincent-example-policy-counter'];

      if (sendLimitPolicyContext) {
        console.log(
          `[@lit-protocol/vincent-example-ability-native-send/execute] ✅ Found send limit policy context. The policy was enabled for ${delegation.delegatorPkpInfo.ethAddress}`,
        );

        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ✅ Policy evaluation result:',
          sendLimitPolicyContext.result,
        );

        const { currentCount, maxSends, remainingSends, timeWindowSeconds } =
          sendLimitPolicyContext.result;

        // `evaluate()` for this particular policy returns some data that are useful when committing the count for the policy.
        const commitParams = {
          currentCount,
          maxSends,
          remainingSends,
          timeWindowSeconds,
        };

        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ✅ Available in sendLimitPolicyContext:',
          Object.keys(sendLimitPolicyContext),
        );
        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ✅ Calling commit with explicit parameters (ignoring TS signature)...',
        );

        const commitResult = await sendLimitPolicyContext.commit(commitParams);
        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ✅ Policy commit result:',
          commitResult,
        );
      } else {
        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ❌ Send limit policy context not found in policiesContext.allowedPolicies',
        );
        console.log(
          '[@lit-protocol/vincent-example-ability-native-send/execute] ❌ Available policies:',
          Object.keys(policiesContext.allowedPolicies || {}),
        );
      }

      return succeed({
        txHash,
        to,
        amount,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(
        '[@lit-protocol/vincent-example-ability-native-send/execute] Native send failed',
        error,
      );

      return fail({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },
});
