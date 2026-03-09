import dotenv from 'dotenv';
dotenv.config({ override: true });

import { createApp } from '../src/app.js';
import { ensureMigrated } from '../src/storage/db.js';

let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      await ensureMigrated();
      app = createApp();
    }
    return app(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
