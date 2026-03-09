import { createClient } from '@libsql/client';
import { runMigrations } from './migrations.js';

let _db = null;
let _migrated = false;

export function getDb() {
  if (_db) return _db;

  _db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./data/intel-hub-cpo.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return _db;
}

export async function ensureMigrated() {
  if (_migrated) return;
  const db = getDb();
  await runMigrations(db);
  _migrated = true;
}

// --- Articles ---

export async function insertArticle(article) {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT OR IGNORE INTO articles
      (source_name, source_url, title, link, published_at, content_snippet,
       summary, lens, secondary_lens, relevance_score, is_preferred_voice, author, tags, status)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      article.source_name, article.source_url, article.title, article.link,
      article.published_at, article.content_snippet, article.summary, article.lens,
      article.secondary_lens, article.relevance_score, article.is_preferred_voice,
      article.author, article.tags, article.status,
    ],
  });
  return result;
}

export async function insertArticles(articles) {
  const db = getDb();
  const statements = articles.map((article) => ({
    sql: `INSERT OR IGNORE INTO articles
      (source_name, source_url, title, link, published_at, content_snippet,
       summary, lens, secondary_lens, relevance_score, is_preferred_voice, author, tags, status)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      article.source_name, article.source_url, article.title, article.link,
      article.published_at, article.content_snippet, article.summary, article.lens,
      article.secondary_lens, article.relevance_score, article.is_preferred_voice,
      article.author, article.tags, article.status,
    ],
  }));

  const results = await db.batch(statements);
  let inserted = 0;
  for (const r of results) {
    if (r.rowsAffected > 0) inserted++;
  }
  return inserted;
}

export async function getArticleByLink(link) {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id FROM articles WHERE link = ?',
    args: [link],
  });
  return result.rows[0] || null;
}

export async function getRecentArticles({ hours = 24, lens = null, preferredOnly = false, status = null } = {}) {
  const db = getDb();
  let sql = "SELECT * FROM articles WHERE fetched_at >= datetime('now', ?)";
  const args = [`-${hours} hours`];

  if (lens) {
    sql += ' AND (lens = ? OR secondary_lens = ?)';
    args.push(lens, lens);
  }
  if (preferredOnly) {
    sql += ' AND is_preferred_voice = 1';
  }
  if (status) {
    sql += ' AND status = ?';
    args.push(status);
  }

  sql += ' ORDER BY is_preferred_voice DESC, relevance_score DESC, published_at DESC';
  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function searchArticles({ query = null, lens = null, preferredOnly = false, status = null, days = null } = {}) {
  const db = getDb();
  const conditions = [];
  const args = [];

  if (query) {
    conditions.push('(title LIKE ? OR content_snippet LIKE ? OR summary LIKE ? OR tags LIKE ?)');
    const q = `%${query}%`;
    args.push(q, q, q, q);
  }
  if (lens) {
    conditions.push('(lens = ? OR secondary_lens = ?)');
    args.push(lens, lens);
  }
  if (preferredOnly) {
    conditions.push('is_preferred_voice = 1');
  }
  if (status) {
    conditions.push('status = ?');
    args.push(status);
  }
  if (days) {
    conditions.push("fetched_at >= datetime('now', ?)");
    args.push(`-${days} days`);
  }

  let sql = 'SELECT * FROM articles';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY is_preferred_voice DESC, relevance_score DESC, published_at DESC';
  sql += ' LIMIT 50';

  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function updateArticleStatus(id, status) {
  const db = getDb();
  return db.execute({ sql: 'UPDATE articles SET status = ? WHERE id = ?', args: [status, id] });
}

export async function flagArticle(id, usedFor) {
  const db = getDb();
  return db.execute({ sql: 'UPDATE articles SET status = ?, used_for = ? WHERE id = ?', args: ['flagged', usedFor, id] });
}

export async function getArticleById(id) {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM articles WHERE id = ?', args: [id] });
  return result.rows[0] || null;
}

export async function getFlaggedArticles(usedFor = null) {
  const db = getDb();
  if (usedFor) {
    const result = await db.execute({
      sql: 'SELECT * FROM articles WHERE status = ? AND used_for = ? ORDER BY fetched_at DESC',
      args: ['flagged', usedFor],
    });
    return result.rows;
  }
  const result = await db.execute({
    sql: 'SELECT * FROM articles WHERE status = ? ORDER BY fetched_at DESC',
    args: ['flagged'],
  });
  return result.rows;
}

// --- Signal History ---

export async function upsertSignalHistory(signalId, date, strength, sourceCount, preferredHits) {
  const db = getDb();
  return db.execute({
    sql: `INSERT OR REPLACE INTO signal_history
      (signal_id, date, strength, source_count, preferred_hits)
    VALUES (?, ?, ?, ?, ?)`,
    args: [signalId, date, strength, sourceCount, preferredHits],
  });
}

export async function getSignalTrend(signalId, days = 7) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT date, strength, source_count
    FROM signal_history
    WHERE signal_id = ? AND date >= date('now', ?)
    ORDER BY date ASC`,
    args: [signalId, `-${days} days`],
  });
  return result.rows;
}

// --- LinkedIn Pastes ---

export async function insertPaste(paste) {
  const db = getDb();
  return db.execute({
    sql: `INSERT INTO linkedin_pastes
      (author_name, author_linkedin, content, summary, lens, secondary_lens,
       relevance_score, is_preferred_voice, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      paste.author_name, paste.author_linkedin, paste.content, paste.summary,
      paste.lens, paste.secondary_lens, paste.relevance_score, paste.is_preferred_voice,
      paste.tags, paste.status,
    ],
  });
}

export async function searchPastes({ query = null, lens = null, preferredOnly = false, days = null } = {}) {
  const db = getDb();
  const conditions = [];
  const args = [];

  if (query) {
    conditions.push('(author_name LIKE ? OR content LIKE ? OR summary LIKE ? OR tags LIKE ?)');
    const q = `%${query}%`;
    args.push(q, q, q, q);
  }
  if (lens) {
    conditions.push('(lens = ? OR secondary_lens = ?)');
    args.push(lens, lens);
  }
  if (preferredOnly) {
    conditions.push('is_preferred_voice = 1');
  }
  if (days) {
    conditions.push("pasted_at >= datetime('now', ?)");
    args.push(`-${days} days`);
  }

  let sql = 'SELECT * FROM linkedin_pastes';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY is_preferred_voice DESC, relevance_score DESC, pasted_at DESC';
  sql += ' LIMIT 50';

  const result = await db.execute({ sql, args });
  return result.rows;
}

export async function getRecentPastes({ hours = 24 } = {}) {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM linkedin_pastes WHERE pasted_at >= datetime('now', ?) ORDER BY is_preferred_voice DESC, relevance_score DESC",
    args: [`-${hours} hours`],
  });
  return result.rows;
}

// --- Briefs ---

export async function insertBrief(brief) {
  const db = getDb();
  return db.execute({
    sql: `INSERT INTO briefs (brief_date, content, article_count, paste_count)
    VALUES (?, ?, ?, ?)`,
    args: [brief.brief_date, brief.content, brief.article_count, brief.paste_count],
  });
}

export async function getBriefByDate(date) {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM briefs WHERE brief_date = ?', args: [date] });
  return result.rows[0] || null;
}

export async function getRecentBriefs(limit = 7) {
  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM briefs ORDER BY brief_date DESC LIMIT ?', args: [limit] });
  return result.rows;
}

// --- Sources ---

export async function upsertSource(source) {
  const db = getDb();
  const existing = await db.execute({ sql: 'SELECT id FROM sources WHERE feed_url = ?', args: [source.feed_url] });

  if (existing.rows[0]) {
    await db.execute({
      sql: `UPDATE sources SET last_fetched = ?, last_success = ?, article_count = article_count + ?
      WHERE id = ?`,
      args: [source.last_fetched, source.last_success ? 1 : 0, source.new_articles || 0, existing.rows[0].id],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO sources (name, feed_url, lens, source_type, priority, last_fetched, last_success, article_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        source.name, source.feed_url, source.lens, source.source_type, source.priority,
        source.last_fetched, source.last_success ? 1 : 0, source.new_articles || 0,
      ],
    });
  }
}

// --- AI Cache ---

export async function getCachedData(key) {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT data FROM ai_cache WHERE cache_key = ? AND expires_at > datetime('now')",
    args: [key],
  });
  const row = result.rows[0];
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

export async function setCachedData(key, data, ttlMinutes = 120) {
  const db = getDb();
  const json = JSON.stringify(data);
  await db.execute({
    sql: `INSERT OR REPLACE INTO ai_cache (cache_key, data, created_at, expires_at)
    VALUES (?, ?, datetime('now'), datetime('now', ?))`,
    args: [key, json, `+${ttlMinutes} minutes`],
  });
}

// --- Bookmarks ---

export async function toggleBookmark(articleId) {
  const db = getDb();
  const row = await db.execute({ sql: 'SELECT status FROM articles WHERE id = ?', args: [articleId] });
  const current = row.rows[0]?.status;
  const newStatus = current === 'flagged' ? 'unread' : 'flagged';
  await db.execute({ sql: 'UPDATE articles SET status = ? WHERE id = ?', args: [newStatus, articleId] });
  return newStatus;
}

export async function getBookmarkedArticles() {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM articles WHERE status = 'flagged' ORDER BY fetched_at DESC LIMIT 100",
  });
  return result.rows;
}

// --- Signal Trends (all) ---

export async function getAllSignalTrends(days = 7) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT signal_id, date, strength, source_count, preferred_hits
    FROM signal_history WHERE date >= date('now', ?)
    ORDER BY date DESC`,
    args: [`-${days} days`],
  });
  const trends = {};
  for (const row of result.rows) {
    if (!trends[row.signal_id]) trends[row.signal_id] = [];
    trends[row.signal_id].push(row);
  }
  return trends;
}

// --- Logging ---

export async function logAction(actionType, data = {}) {
  const db = getDb();
  try {
    await db.execute({
      sql: `INSERT INTO user_actions (action_type, data) VALUES (?, ?)`,
      args: [actionType, JSON.stringify(data)],
    });
  } catch {
    // user_actions table may not exist yet, silently ignore
  }
}

// --- Feedback ---

export async function insertFeedback(section, itemId, rating, comment = null) {
  const db = getDb();
  try {
    await db.execute({
      sql: `INSERT INTO feedback (section, item_id, rating, comment) VALUES (?, ?, ?, ?)`,
      args: [section, itemId || null, rating, comment],
    });
  } catch {
    // feedback table may not exist yet
  }
}

// --- Clear expired cache ---

export async function clearExpiredCache() {
  const db = getDb();
  await db.execute({ sql: "DELETE FROM ai_cache WHERE expires_at <= datetime('now')" });
}
