// import { createEnv } from "@t3-oss/env-core";
// import { z } from "zod";
 
// export const serverEnv = createEnv({
//   server: {
//     RPC_URL: z.url(),
//     CHRONICLE_YELLOWSTONE_RPC: z.url(),
//     VINCENT_DELEGATEE_PRIVATE_KEY: z.string().min(1, 'VINCENT_DELEGATEE_PRIVATE_KEY is required'),
//     VAS_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
//     VAS_ENGINE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
//     CRON_SECRET: z.string(),
//     TURSO_AUTH_TOKEN: z.string(),
//     TURSO_DATABASE_URL: z.url(),
//   },
//   runtimeEnv: process.env,
// });

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
 
export const serverEnv = createEnv({
  server: {
    CHRONICLE_YELLOWSTONE_RPC: z.url(),
    VINCENT_DELEGATEE_PRIVATE_KEY: z.string().min(1, 'VINCENT_DELEGATEE_PRIVATE_KEY is required'),
    VAS_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    VAS_ENGINE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
    CRON_SECRET: z.string(),
    TURSO_AUTH_TOKEN: z.string(),
    TURSO_DATABASE_URL: z.url(),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY,
  // },
  // For Next.js >= 13.4.4, you can just reference process.env:
  experimental__runtimeEnv: process.env
});