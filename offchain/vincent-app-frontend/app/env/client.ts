import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
 
export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_VINCENT_APP_ID: z.coerce.number(),
    NEXT_PUBLIC_REDIRECT_URI: z.url(),
    NEXT_PUBLIC_RPC_URL: z.url(),
    NEXT_PUBLIC_VAS_ENGINE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    NEXT_PUBLIC_VAS_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_VINCENT_APP_ID: process.env.NEXT_PUBLIC_VINCENT_APP_ID,
    NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_VAS_ENGINE_ADDRESS: process.env.NEXT_PUBLIC_VAS_ENGINE_ADDRESS,
    NEXT_PUBLIC_VAS_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_VAS_TOKEN_ADDRESS,
  },
});