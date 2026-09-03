// Vercel serverless entrypoint: wraps the shared Express app from
// src/server/app.ts. Vercel routes every /api/* request here (see
// vercel.json rewrites). This file must stay free of app.listen()/Vite —
// those belong to server.ts, the local dev/traditional-host entrypoint.
import type { Request, Response } from 'express';
import { createApp } from '../src/server/app.ts';
import { ensureAdminUser } from '../src/db/queries.ts';

let app: ReturnType<typeof createApp> | null = null;
let initError: Error | null = null;

try {
  app = createApp();
  // Runs once per cold start, before the function starts serving requests.
  await ensureAdminUser().catch(err => {
    console.warn('[AxeTask Boot] Could not ensure admin account:', err);
  });
} catch (err: any) {
  initError = err;
  console.error('[AxeTask Boot] Failed to initialize app:', err);
}

export default function handler(req: Request, res: Response) {
  if (!app) {
    res.status(500).json({
      error: 'Server misconfigured — the app failed to initialize.',
      detail: initError?.message,
    });
    return;
  }
  return app(req, res);
}
