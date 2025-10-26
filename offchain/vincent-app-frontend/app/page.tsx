"use client"

import { useState, useEffect } from 'react';
import { JwtProvider } from '@lit-protocol/vincent-app-sdk/react';
import { clientEnv } from './env/client';
import Home from './home/components/Home';


export default function AppContent() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render the JwtProvider on the server to avoid localStorage errors
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  //console.log("Using NEXT_PUBLIC_VINCENT_APP_ID:", clientEnv.NEXT_PUBLIC_VINCENT_APP_ID);
  console.log(process.env.NEXT_PUBLIC_VINCENT_APP_ID);

  return (
    <JwtProvider appId={Number(clientEnv.NEXT_PUBLIC_VINCENT_APP_ID)}>
      <Home />
    </JwtProvider>
  );
}
