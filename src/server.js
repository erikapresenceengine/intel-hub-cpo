#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ override: true });
import { createApp } from './app.js';
import { ensureMigrated } from './storage/db.js';
import { exec } from 'child_process';

const app = createApp();
const PORT = process.env.INTEL_HUB_PORT || 3248;

await ensureMigrated();

app.listen(PORT, () => {
  console.log(`
  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502                                         \u2502
  \u2502   \u{1F9E0} CPO Intel Hub Dashboard            \u2502
  \u2502   http://localhost:${PORT}                \u2502
  \u2502                                         \u2502
  \u2502   Press Ctrl+C to stop                  \u2502
  \u2502                                         \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
  `);

  // Auto-open browser
  const url = `http://localhost:${PORT}`;
  const openCmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(openCmd, (err) => {
    if (err) console.log(`  Open manually: ${url}\n`);
  });
});
