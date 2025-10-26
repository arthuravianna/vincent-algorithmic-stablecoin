import { useCallback } from 'react';

import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';
import { clientEnv } from '../env/client';


export const useBackend = () => {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(clientEnv.NEXT_PUBLIC_VINCENT_APP_ID);

  const getJwt = useCallback(() => {
    // Redirect to Vincent Auth consent page with appId and version
    vincentWebAuthClient.redirectToConnectPage({
      // consentPageUrl: `http://localhost:3000/`,
      redirectUri: clientEnv.NEXT_PUBLIC_REDIRECT_URI,
    });
  }, [vincentWebAuthClient]);

  return {
    getJwt,
  };
};