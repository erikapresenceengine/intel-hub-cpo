/**
 * Database Migrations for @libsql/client
 *
 * Each CREATE TABLE/INDEX is a separate statement in a batch call.
 * Uses CREATE IF NOT EXISTS so it's safe to run on every startup.
 */

export async function runMigrations(db) {
  await db.batch([
    // --- Migration 1: Core tables ---
    {
      sql: `CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        source_url TEXT,
        title TEXT NOT NULL,
        link TEXT UNIQUE NOT NULL,
        published_at DATETIME,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        content_snippet TEXT,
        summary TEXT,
        lens TEXT,
        secondary_lens TEXT,
        relevance_score INTEGER,
        is_preferred_voice BOOLEAN DEFAULT 0,
        author TEXT,
        tags TEXT,
        status TEXT DEFAULT 'unread',
        used_for TEXT
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS linkedin_pastes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author_name TEXT NOT NULL,
        author_linkedin TEXT,
        content TEXT NOT NULL,
        pasted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        summary TEXT,
        lens TEXT,
        secondary_lens TEXT,
        relevance_score INTEGER,
        is_preferred_voice BOOLEAN DEFAULT 0,
        tags TEXT,
        status TEXT DEFAULT 'unread',
        used_for TEXT
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        brief_date DATE NOT NULL,
        content TEXT NOT NULL,
        article_count INTEGER,
        paste_count INTEGER
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        feed_url TEXT NOT NULL,
        lens TEXT NOT NULL,
        source_type TEXT,
        priority TEXT DEFAULT 'normal',
        last_fetched DATETIME,
        last_success BOOLEAN,
        article_count INTEGER DEFAULT 0
      )`,
    },
    // Indexes for core tables
    { sql: `CREATE INDEX IF NOT EXISTS idx_articles_lens ON articles(lens)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_articles_fetched_at ON articles(fetched_at)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_articles_preferred ON articles(is_preferred_voice)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_pastes_lens ON linkedin_pastes(lens)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_pastes_status ON linkedin_pastes(status)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_briefs_date ON briefs(brief_date)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_sources_lens ON sources(lens)` },

    // --- Migration 2: Signal history ---
    {
      sql: `CREATE TABLE IF NOT EXISTS signal_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_id TEXT NOT NULL,
        date DATE NOT NULL,
        strength INTEGER NOT NULL,
        source_count INTEGER NOT NULL,
        preferred_hits INTEGER DEFAULT 0,
        UNIQUE(signal_id, date)
      )`,
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_signal_history_signal ON signal_history(signal_id)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_signal_history_date ON signal_history(date)` },

    // --- Migration 3: AI cache ---
    {
      sql: `CREATE TABLE IF NOT EXISTS ai_cache (
        cache_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )`,
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at)` },

    // --- Migration 4: User actions ---
    {
      sql: `CREATE TABLE IF NOT EXISTS user_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        action_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_user_actions_type ON user_actions(action_type)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions(created_at)` },

    // --- Migration 5: Feedback ---
    {
      sql: `CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL,
        item_id TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_feedback_section ON feedback(section)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at)` },
  ]);
}
