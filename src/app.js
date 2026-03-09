import express from 'express';
import { getRecentArticles, searchArticles, getBookmarkedArticles, toggleBookmark, logAction, ensureMigrated, insertFeedback } from './storage/db.js';
import { fetchHeadless } from './commands/fetch.js';
import { generateDashboardHtml } from './dashboard/dashboardHtml.js';
import { LENS_NAMES, LENS_EMOJI } from './config/constants.js';
import { isAIAvailable } from './intelligence/claudeClient.js';
import { detectSignals, analyzePreferredVoices, generateContentHooks, extractMarketMoves, analyzeLensHealth, detectCrossLensThemes, detectTrendVelocity, generateActions } from './intelligence/signalDetector.js';
import { generateExecSummary } from './intelligence/execSummary.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // ─── DIAGNOSTIC: AI STATUS ─────────────────────────────────────
  app.get('/api/ai-status', async (req, res) => {
    try {
      const available = await isAIAvailable();
      res.json({ available });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── SERVE DASHBOARD ────────────────────────────────────────────
  app.get('/', async (req, res) => {
    try {
      await ensureMigrated();
      const html = await generateDashboardHtml();
      res.type('html').send(html);
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).send(`<h1>Dashboard Error</h1><pre>${err.message}</pre>`);
    }
  });

  // ─── API: GET ARTICLES ──────────────────────────────────────────
  app.get('/api/articles', async (req, res) => {
    try {
      const { lens, hours, preferredOnly, query, days } = req.query;
      const h = parseInt(hours) || 24;

      if (query) {
        const articles = await searchArticles({
          query,
          lens: lens || null,
          preferredOnly: preferredOnly === 'true',
          days: days ? parseInt(days) : null,
        });
        return res.json({ articles });
      }

      const articles = await getRecentArticles({
        hours: h,
        lens: lens || null,
        preferredOnly: preferredOnly === 'true',
      });
      res.json({ articles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: BOOKMARKS ─────────────────────────────────────────────
  app.post('/api/bookmark', async (req, res) => {
    try {
      const { articleId } = req.body;
      const newStatus = await toggleBookmark(articleId);
      await logAction('bookmark', { articleId, status: newStatus });
      res.json({ articleId, status: newStatus });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/bookmarks', async (req, res) => {
    try {
      const articles = await getBookmarkedArticles();
      res.json({ articles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: LENSES METADATA ───────────────────────────────────────
  app.get('/api/lenses', (req, res) => {
    res.json({ lenses: LENS_NAMES, emojis: LENS_EMOJI });
  });

  // ─── API: REFRESH FEEDS (phone button + Vercel cron) ──────────
  const handleRefresh = async (req, res) => {
    try {
      const result = await fetchHeadless();
      await logAction('refresh', result);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('Refresh error:', err);
      res.status(500).json({ error: err.message });
    }
  };
  app.post('/api/refresh', handleRefresh);
  app.get('/api/refresh', handleRefresh);  // GET for Vercel cron

  // ─── API: SIGNALS ──────────────────────────────────────────────
  app.get('/api/signals', async (req, res) => {
    try {
      const articles = await getRecentArticles({ hours: 72 });
      const signals = detectSignals(articles);
      const voiceAnalysis = analyzePreferredVoices(articles);
      const contentHooks = generateContentHooks(signals, voiceAnalysis, articles);
      const marketMoves = extractMarketMoves(articles);
      const lensHealth = analyzeLensHealth(articles, signals);
      const crossLensThemes = detectCrossLensThemes(signals);
      const trendVelocity = await detectTrendVelocity(signals);
      const actions = generateActions(signals, marketMoves, voiceAnalysis, {
        lensHealth, crossLensThemes, trendVelocity,
      });

      res.json({
        signals, voiceAnalysis, contentHooks, marketMoves,
        lensHealth, crossLensThemes, trendVelocity, actions,
      });
    } catch (err) {
      console.error('Signals error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: EXEC SUMMARY ───────────────────────────────────────────
  app.get('/api/exec-summary', async (req, res) => {
    try {
      const articles = await getRecentArticles({ hours: 72 });
      const signals = detectSignals(articles);
      const voiceAnalysis = analyzePreferredVoices(articles);
      const contentHooks = generateContentHooks(signals, voiceAnalysis, articles);
      const marketMoves = extractMarketMoves(articles);
      const lensHealth = analyzeLensHealth(articles, signals);
      const crossLensThemes = detectCrossLensThemes(signals);
      const trendVelocity = await detectTrendVelocity(signals);

      const result = await generateExecSummary(
        signals, voiceAnalysis, marketMoves, contentHooks,
        lensHealth, crossLensThemes, trendVelocity, articles
      );

      res.json(result);
    } catch (err) {
      console.error('Exec summary error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── API: FEEDBACK ────────────────────────────────────────────
  app.post('/api/feedback', async (req, res) => {
    try {
      const { section, itemId, rating, comment } = req.body;
      if (!section || rating === undefined) {
        return res.status(400).json({ error: 'section and rating are required' });
      }
      await insertFeedback(section, itemId, rating, comment);
      await logAction('feedback', { section, itemId, rating });
      res.json({ success: true });
    } catch (err) {
      console.error('Feedback error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}
