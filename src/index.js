#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ override: true });
import { Command } from 'commander';
import { fetchCommand } from './commands/fetch.js';
import { briefCommand } from './commands/brief.js';
import { pasteCommand } from './commands/paste.js';
import { searchCommand } from './commands/search.js';
import { flagCommand, exportCommand } from './commands/export.js';
import { validateCommand } from './commands/validate.js';
import { ensureMigrated } from './storage/db.js';

const program = new Command();

program
  .name('cpo-intel')
  .description('CPO Intel Hub — Intelligence system for Chief People Officers: RSS feeds, daily briefs, and LinkedIn insights')
  .version('1.0.0')
  .hook('preAction', async () => {
    await ensureMigrated();
  });

// --- fetch ---
program
  .command('fetch')
  .description('Pull all RSS feeds and store new articles')
  .option('-l, --lens <lens>', 'Fetch only one lens (workforce_ai, productivity, people_strategy, leadership)')
  .option('-p, --preferred-only', 'Fetch only preferred voice feeds')
  .action(async (options) => {
    try {
      await fetchCommand(options);
    } catch (err) {
      console.error('Fetch error:', err.message);
      process.exit(1);
    }
  });

// --- brief ---
program
  .command('brief')
  .description('Generate a strategic intelligence brief')
  .option('-d, --date <date>', 'Generate brief for a specific date (YYYY-MM-DD)')
  .option('-s, --summarize', 'Use Claude API to summarize top articles')
  .action(async (options) => {
    try {
      await briefCommand(options);
    } catch (err) {
      console.error('Brief error:', err.message);
      process.exit(1);
    }
  });

// --- paste ---
program
  .command('paste')
  .description('Paste and process LinkedIn posts')
  .option('-a, --author <name>', 'Author name for the paste')
  .option('--stdin', 'Read content from stdin pipe')
  .action(async (options) => {
    try {
      await pasteCommand(options);
    } catch (err) {
      console.error('Paste error:', err.message);
      process.exit(1);
    }
  });

// --- search ---
program
  .command('search [query]')
  .description('Search stored intelligence')
  .option('-l, --lens <lens>', 'Filter by lens')
  .option('-p, --preferred', 'Show only preferred voices')
  .option('-s, --status <status>', 'Filter by status (unread, read, flagged, used)')
  .option('-d, --days <days>', 'Limit to last N days', parseInt)
  .option('--linkedin [query]', 'Search LinkedIn pastes')
  .action(async (query, options) => {
    try {
      await searchCommand(query, options);
    } catch (err) {
      console.error('Search error:', err.message);
      process.exit(1);
    }
  });

// --- flag ---
program
  .command('flag <id>')
  .description('Flag an article for content use')
  .option('-f, --for <purpose>', 'Purpose: board_deck, all_hands, manager_toolkit, exec_brief')
  .action(async (id, options) => {
    try {
      await flagCommand(id, options);
    } catch (err) {
      console.error('Flag error:', err.message);
      process.exit(1);
    }
  });

// --- export ---
program
  .command('export')
  .description('Export flagged content or briefs')
  .option('-f, --for <purpose>', 'Export content flagged for a purpose')
  .option('-b, --briefs', 'Export recent briefs')
  .option('-w, --week', 'Limit to this week')
  .action(async (options) => {
    try {
      await exportCommand(options);
    } catch (err) {
      console.error('Export error:', err.message);
      process.exit(1);
    }
  });

// --- validate ---
program
  .command('validate')
  .description('Test all feed URLs and report which are working, broken, or redirecting')
  .option('-l, --lens <lens>', 'Validate only one lens (workforce_ai, productivity, people_strategy, leadership)')
  .action(async (options) => {
    try {
      await validateCommand(options);
    } catch (err) {
      console.error('Validate error:', err.message);
      process.exit(1);
    }
  });

program.parse();
