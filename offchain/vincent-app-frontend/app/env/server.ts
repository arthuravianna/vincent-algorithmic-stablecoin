import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
 
export const serverEnv = createEnv({
  server: {
    RPC_URL: z.url(),
    VAS_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    VINCENT_APP_ID: z.number(),
    CRON_SECRET: z.string(),
    TURSO_AUTH_TOKEN: z.string(),
    TURSO_DATABASE_URL: z.url(),
  },
  runtimeEnv: process.env,
});