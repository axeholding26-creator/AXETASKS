// Vercel serverless entrypoint: wraps the shared Express app from
// src/server/app.ts. Vercel routes every /api/* request here (see
// vercel.json rewrites). This file must stay free of app.listen()/Vite —
// those belong to server.ts, the local dev/traditional-host entrypoint.
import { createApp } from '../src/server/app.ts';
import { ensureAdminUser } from '../src/db/queries.ts';

const app = createApp();

// Runs once per cold start, before the function starts serving requests.
await ensureAdminUser().catch(err => {
  console.warn('[AxeTask Boot] Could not ensure admin account:', err);
});

export default app;
