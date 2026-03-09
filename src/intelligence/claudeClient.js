/**
 * Shared Claude Client
 *
 * Singleton client with error handling and graceful degradation.
 * All AI modules import from here instead of maintaining their own getClient().
 */

let Anthropic = null;
let _client = null;
let _lastCheck = 0;
let _available = null;

const CHECK_INTERVAL = 60_000; // re-check availability every 60s

/**
 * Get or create the shared Anthropic client.
 * Returns null if no API key or SDK unavailable.
 */
export async function getClaudeClient() {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey || apiKey.length < 10) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Claude] No valid API key found (length:', apiKey.length, ')');
    }
    return null;
  }

  try {
    if (!Anthropic) {
      const mod = await import('@anthropic-ai/sdk');
      // Handle both ESM default export and named export patterns
      Anthropic = mod.default || mod.Anthropic || mod;
      if (typeof Anthropic !== 'function') {
        console.error('[Claude] SDK exported unexpected type:', typeof Anthropic, 'keys:', Object.keys(mod).slice(0, 5).join(','));
        Anthropic = null;
        return null;
      }
    }
    if (!_client) {
      _client = new Anthropic({ apiKey });
    }
    return _client;
  } catch (err) {
    console.error('[Claude] SDK import/init failed:', err.message);
    return null;
  }
}

/**
 * Resolve which model to use. Checks env var, falls back to SUMMARIZE_MODEL, then default.
 *
 * @param {string} envVar - Environment variable name (e.g., 'DRAFT_MODEL')
 * @returns {string} Model identifier
 */
export function getModel(envVar) {
  return (process.env[envVar] || process.env.SUMMARIZE_MODEL || 'claude-haiku-4-5').trim();
}

/**
 * Check if AI features are available (API key set + SDK importable).
 * Caches the result for 60 seconds.
 */
export async function isAIAvailable() {
  const now = Date.now();
  if (_available === true && (now - _lastCheck) < CHECK_INTERVAL) {
    return true;
  }

  const client = await getClaudeClient();
  _available = client !== null;
  _lastCheck = now;
  return _available;
}

/**
 * Safe wrapper for Claude API calls with timeout and error handling.
 * Returns null on any failure instead of throwing.
 */
export async function safeClaude({ model, max_tokens, messages, system, timeout = 30_000 }) {
  const client = await getClaudeClient();
  if (!client) return null;

  try {
    const params = { model, max_tokens, messages };
    if (system) params.system = system;

    const apiCall = client.messages.create(params);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude API timeout')), timeout)
    );

    const response = await Promise.race([apiCall, timeoutPromise]);
    const text = response.content?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Claude API] ${err.message || 'Unknown error'}`);
    }
    return null;
  }
}
