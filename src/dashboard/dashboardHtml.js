import dayjs from 'dayjs';
import { getRecentArticles, getRecentPastes } from '../storage/db.js';
import { LENS_NAMES, LENS_EMOJI } from '../config/constants.js';
import { PREFERRED_VOICES } from '../config/preferredVoices.js';
import { detectSignals, analyzePreferredVoices as analyzeVoices, generateContentHooks, extractMarketMoves, analyzeLensHealth, detectCrossLensThemes, detectTrendVelocity, generateActions } from '../intelligence/signalDetector.js';
import { generateExecSummary } from '../intelligence/execSummary.js';

function esc(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(text, maxLen) {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + '...';
}

function nl2br(text) {
  if (!text) return '';
  return esc(text).replace(/\n/g, '<br>');
}

export async function generateDashboardHtml() {
  const articles = await getRecentArticles({ hours: 72 });

  // ─── Intelligence Layer ───────────────────────────────────────
  const signals = detectSignals(articles);
  const signalVoiceAnalysis = analyzeVoices(articles);
  const contentHooks = generateContentHooks(signals, signalVoiceAnalysis, articles);
  const marketMoves = extractMarketMoves(articles);
  const lensHealth = analyzeLensHealth(articles, signals);
  const crossLensThemes = detectCrossLensThemes(signals);
  let trendVelocity = [];
  try { trendVelocity = await detectTrendVelocity(signals); } catch { /* first run */ }
  const actions = generateActions(signals, marketMoves, signalVoiceAnalysis, {
    lensHealth, crossLensThemes, trendVelocity,
  });

  // Exec summary (AI or template)
  let execSummary = null;
  try {
    execSummary = await generateExecSummary(
      signals, signalVoiceAnalysis, marketMoves, contentHooks,
      lensHealth, crossLensThemes, trendVelocity, articles
    );
  } catch (err) {
    console.error('Exec summary failed:', err.message);
  }

  // ─── Dashboard Data ───────────────────────────────────────────
  // Group preferred voice articles
  const voiceMap = {};
  for (const voice of PREFERRED_VOICES) {
    voiceMap[voice.name] = { name: voice.name, count: 0, articles: [] };
  }
  for (const a of articles) {
    if (!a.is_preferred_voice) continue;
    const authorName = a.author || a.source_name || '';
    for (const voice of PREFERRED_VOICES) {
      const names = [voice.name, ...(voice.aliases || [])];
      if (names.some(n => authorName.toLowerCase().includes(n.toLowerCase()))) {
        voiceMap[voice.name].count++;
        voiceMap[voice.name].articles.push(a);
        break;
      }
    }
  }
  const voiceAnalysis = Object.values(voiceMap);

  const now = Date.now();
  const enrichedArticles = articles.map(a => ({
    ...a,
    isTrulyToday: a.published_at && (now - new Date(a.published_at).getTime()) < 36 * 60 * 60 * 1000,
  }));

  const preferredCount = articles.filter(a => a.is_preferred_voice).length;
  const trulyTodayCount = enrichedArticles.filter(a => a.isTrulyToday).length;

  // Lens counts
  const lensCounts = {};
  for (const lens of Object.keys(LENS_NAMES)) {
    lensCounts[lens] = articles.filter(a => a.lens === lens || a.secondary_lens === lens).length;
  }
  const maxLens = Math.max(...Object.values(lensCounts), 1);

  // Top articles by score
  const topArticles = [...articles]
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 15);

  const displayDate = dayjs().format('dddd, MMMM D, YYYY');

  // ─── Build exec summary HTML ──────────────────────────────────
  let execHtml = '';
  if (execSummary && execSummary.sections) {
    const s = execSummary.sections;
    const sourceLabel = execSummary.source === 'ai' ? 'AI-synthesized' : 'Template';
    execHtml = `
<!-- EXEC SUMMARY -->
<div class="exec-summary" id="sec-exec">
  <div class="exec-header">
    <div class="exec-title">\u{1F3AF} YOUR DAILY BRIEFING</div>
    <span class="exec-source">${sourceLabel}</span>
  </div>

  <div class="exec-section">
    <div class="exec-section-label">\u{1F3AF} YOUR MOVE</div>
    <div class="exec-section-content">${nl2br(s.move || 'No action generated yet. Run a feed refresh to populate.')}</div>
  </div>

  <div class="exec-section">
    <div class="exec-section-label">\u{1F50D} WHAT SHIFTED</div>
    <div class="exec-section-content">${nl2br(s.shifted || 'No lens intelligence yet.')}</div>
  </div>

  <div class="exec-section exec-section-last">
    <div class="exec-section-label">\u26A1 GAPS & OPPORTUNITIES</div>
    <div class="exec-section-content">${nl2br(s.gaps || 'No gaps detected.')}</div>
  </div>
</div>`;
  }

  // ─── Build actions HTML ───────────────────────────────────────
  const topActions = actions.slice(0, 5);
  let actionsHtml = '';
  if (topActions.length > 0) {
    actionsHtml = `
<!-- DO THIS TODAY -->
<div class="section" id="sec-actions">
  <div class="section-header" onclick="toggleSection('sec-actions')">
    <h2>\u2705 DO THIS TODAY <span class="badge">${topActions.length}</span></h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${topActions.map(a => `
    <div class="action-card">
      <span class="action-emoji">${a.emoji || '\u{1F4CC}'}</span>
      <div class="action-body">
        <div class="action-text">${esc(a.text)}</div>
        <div class="action-detail">${esc(a.detail || '')}</div>
        ${a.link ? `<a href="${esc(a.link)}" target="_blank" class="action-link">Read \u2192</a>` : ''}
      </div>
    </div>`).join('')}
  </div>
</div>`;
  }

  // ─── Build signals HTML ───────────────────────────────────────
  const topSignals = signals.slice(0, 6);
  let signalsHtml = '';
  if (topSignals.length > 0) {
    signalsHtml = `
<!-- SIGNALS -->
<div class="section" id="sec-signals">
  <div class="section-header" onclick="toggleSection('sec-signals')">
    <h2>\u{1F4E1} SIGNALS DETECTED <span class="badge">${signals.length}</span></h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${topSignals.map(sig => {
      const strengthPct = Math.min(Math.round((sig.strength / 15) * 100), 100);
      const velocity = trendVelocity.find(t => t.signalId === sig.id);
      const velLabel = velocity ? velocity.velocity : '';
      const velColor = { accelerating: 'var(--green)', emerging: 'var(--accent)', steady: 'var(--text-muted)', decelerating: 'var(--red)' };
      const lensNames = (sig.lenses || []).map(l => LENS_NAMES[l] || l).join(', ');
      return `
    <div class="signal-card">
      <div class="signal-header">
        <span class="signal-label">${esc(sig.label)}</span>
        ${velLabel ? `<span class="velocity-badge" style="color:${velColor[velLabel] || 'var(--text-muted)'}">${velLabel}${velocity?.change ? ` ${velocity.change}` : ''}</span>` : ''}
      </div>
      <div class="signal-meta">
        <span>${sig.strength} articles</span> \u00B7 <span>${sig.sourceCount} sources</span>
        ${sig.preferredHits > 0 ? `\u00B7 <span style="color:var(--red)">${sig.preferredHits} preferred</span>` : ''}
        \u00B7 <span class="signal-lenses">${esc(lensNames)}</span>
      </div>
      <div class="signal-bar"><div class="signal-bar-fill" style="width:${strengthPct}%"></div></div>
      <div class="signal-insight">${esc(sig.insight)}</div>
    </div>`;
    }).join('')}
  </div>
</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CPO Intel Hub \u2014 ${esc(displayDate)}</title>
<style>
:root {
  --bg: #0f172a; --surface: #1e293b; --surface2: #334155; --border: #475569;
  --text: #f1f5f9; --text-muted: #94a3b8; --accent: #38bdf8; --accent2: #818cf8;
  --green: #4ade80; --red: #f87171; --yellow: #fbbf24; --orange: #fb923c;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding-bottom: 40px; }
.container { max-width: 940px; margin: 0 auto; padding: 16px; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Hero */
.hero { background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1a1a3e 100%); border-bottom: 1px solid var(--border); padding: 28px 0 24px; }
.hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.hero h1 span { color: var(--accent); }
.hero .date { color: var(--text-muted); font-size: 13px; margin-bottom: 12px; }
.hero .subtitle { font-size: 14px; color: var(--text-muted); max-width: 700px; }

/* Refresh button */
.refresh-btn { background: none; border: 1px solid var(--border); color: var(--text-muted); font-size: 11px; padding: 3px 10px; border-radius: 6px; cursor: pointer; margin-left: 8px; vertical-align: middle; transition: all 0.15s; }
.refresh-btn:hover { color: var(--accent); border-color: var(--accent); }
.refresh-btn.loading { opacity: 0.6; cursor: wait; }

/* Exec Summary */
.exec-summary { background: linear-gradient(135deg, #1e293b 0%, #1a1a3e 100%); border: 1px solid var(--accent2); border-radius: 14px; margin-bottom: 16px; overflow: hidden; }
.exec-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 0; }
.exec-title { font-size: 15px; font-weight: 700; color: var(--accent); letter-spacing: 0.5px; }
.exec-source { font-size: 10px; color: var(--text-muted); background: var(--surface2); padding: 2px 8px; border-radius: 8px; }
.exec-section { padding: 12px 20px; border-bottom: 1px solid rgba(71, 85, 105, 0.4); }
.exec-section-last { border-bottom: none; padding-bottom: 16px; }
.exec-section-label { font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 6px; letter-spacing: 0.3px; }
.exec-section-content { font-size: 13px; line-height: 1.7; color: var(--text); }

/* Action cards */
.action-card { background: var(--bg); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 10px; border-left: 3px solid var(--green); }
.action-emoji { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
.action-body { flex: 1; min-width: 0; }
.action-text { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.action-detail { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
.action-link { font-size: 11px; color: var(--accent); margin-top: 4px; display: inline-block; }

/* Signal cards */
.signal-card { background: var(--bg); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
.signal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.signal-label { font-size: 14px; font-weight: 600; }
.velocity-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
.signal-meta { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
.signal-lenses { color: var(--accent2); }
.signal-bar { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.signal-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent)); border-radius: 3px; }
.signal-insight { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

/* Filter bar */
.filter-bar { position: sticky; top: 0; z-index: 50; background: var(--bg); border-bottom: 1px solid var(--border); padding: 10px 0; }
.filter-bar .container { display: flex; gap: 8px; overflow-x: auto; align-items: center; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
.filter-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text-muted); font-size: 13px; padding: 6px 16px; border-radius: 20px; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
.filter-btn:hover, .filter-btn.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.filter-btn.saved-btn { border-color: var(--yellow); color: var(--yellow); }
.filter-btn.saved-btn.active { background: var(--yellow); color: var(--bg); }

/* Stats */
.stats-row { display: flex; gap: 10px; margin: 16px 0; flex-wrap: wrap; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; flex: 1 1 calc(20% - 10px); min-width: 80px; text-align: center; }
.stat-card .number { font-size: 28px; font-weight: 700; color: var(--accent); }
.stat-card .label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

/* Sections */
.section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 14px; overflow: hidden; }
.section-header { padding: 14px 18px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; }
.section-header:hover { background: var(--surface2); }
.section-header h2 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.badge { background: var(--accent); color: var(--bg); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.chevron { font-size: 16px; color: var(--text-muted); transition: transform 0.2s; }
.section.collapsed .section-body { display: none; }
.section.collapsed .chevron { transform: rotate(-90deg); }
.section-body { padding: 0 18px 18px; }

/* Article cards */
.article-card { background: var(--bg); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; border-left: 3px solid var(--accent); display: flex; align-items: flex-start; gap: 10px; }
.article-card.preferred { border-left-color: var(--red); }
.article-body { flex: 1; min-width: 0; }
.article-title { font-size: 14px; font-weight: 600; margin-bottom: 3px; }
.article-meta { font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.article-snippet { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.lens-tag { font-size: 10px; padding: 1px 8px; border-radius: 10px; background: var(--surface2); font-weight: 600; }
.score-bar { display: inline-block; width: 40px; height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; vertical-align: middle; }
.score-fill { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent)); border-radius: 3px; }
.today-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.today-badge.fresh { background: #4ade8022; color: var(--green); }
.today-badge.backlog { background: #94a3b822; color: var(--text-muted); }

/* Bookmark star */
.bookmark-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 2px; opacity: 0.4; transition: all 0.15s; flex-shrink: 0; }
.bookmark-btn:hover { opacity: 1; }
.bookmark-btn.bookmarked { opacity: 1; }

/* Voice cards */
.voice-card { background: var(--bg); border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.voice-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.voice-name { font-weight: 700; font-size: 15px; }
.voice-count { font-size: 11px; color: var(--text-muted); background: var(--surface2); padding: 2px 10px; border-radius: 10px; }
.voice-articles { list-style: none; padding: 0; }
.voice-articles li { padding: 5px 0; border-bottom: 1px solid var(--surface2); font-size: 12px; }
.voice-articles li:last-child { border-bottom: none; }
.snippet { color: var(--text-muted); font-size: 11px; display: block; margin-top: 2px; }

/* Lens bars */
.lens-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--surface2); }
.lens-row:last-child { border-bottom: none; }
.lens-label { width: 180px; font-size: 13px; font-weight: 500; flex-shrink: 0; }
.lens-bar-track { flex: 1; height: 22px; background: var(--surface2); border-radius: 6px; overflow: hidden; }
.lens-bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 11px; font-weight: 600; }
.lens-count { width: 50px; text-align: right; font-size: 13px; font-weight: 600; color: var(--text-muted); flex-shrink: 0; }

/* Spinner */
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--text-muted); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 6px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Mobile */
@media (max-width: 640px) {
  .stat-card { flex: 1 1 calc(50% - 10px); }
  .stat-card .number { font-size: 22px; }
  .hero h1 { font-size: 20px; }
  .lens-label { width: 130px; font-size: 12px; }
  .section-header h2 { font-size: 14px; }
  .exec-section-content { font-size: 12px; }
}

.footer { text-align: center; padding: 20px 0; color: var(--text-muted); font-size: 11px; }
</style>
</head>
<body>

<!-- HERO -->
<div class="hero">
  <div class="container">
    <h1>\u{1F9E0} <span>CPO Intel Hub</span></h1>
    <div class="date">${esc(displayDate)} \u00B7 <span class="local-time"></span>
      <button class="refresh-btn" id="refresh-btn" onclick="refreshFeeds()" title="Refresh feeds">\u{1F504} Refresh</button>
    </div>
    <div class="subtitle">Workforce intelligence for the Chief People Officer \u2014 ${articles.length} articles across ${Object.keys(LENS_NAMES).length} strategic lenses \u00B7 ${signals.length} signals detected</div>
  </div>
</div>

<!-- FILTER BAR -->
<div class="filter-bar">
  <div class="container">
    <button class="filter-btn active" data-lens="all" onclick="filterLens('all')">All</button>
    ${Object.entries(LENS_NAMES).map(([k, v]) =>
      `<button class="filter-btn" data-lens="${k}" onclick="filterLens('${k}')">${LENS_EMOJI[k] || ''} ${esc(v)}</button>`
    ).join('')}
    <button class="filter-btn" data-lens="preferred" onclick="filterLens('preferred')">\u{1F534} Preferred</button>
    <button class="filter-btn saved-btn" data-lens="saved" onclick="filterLens('saved')">\u2B50 Saved</button>
  </div>
</div>

<div class="container">

<!-- STATS -->
<div class="stats-row">
  <div class="stat-card"><div class="number">${articles.length}</div><div class="label">Articles</div></div>
  <div class="stat-card"><div class="number" style="color:var(--green)">${trulyTodayCount}</div><div class="label">New Today</div></div>
  <div class="stat-card"><div class="number" style="color:var(--red)">${preferredCount}</div><div class="label">Preferred</div></div>
  <div class="stat-card"><div class="number" style="color:var(--accent2)">${signals.length}</div><div class="label">Signals</div></div>
  <div class="stat-card"><div class="number" style="color:var(--orange)">${actions.length}</div><div class="label">Actions</div></div>
</div>

${execHtml}

${actionsHtml}

${signalsHtml}

<!-- PREFERRED VOICES -->
<div class="section" id="sec-voices">
  <div class="section-header" onclick="toggleSection('sec-voices')">
    <h2>\u{1F534} PREFERRED VOICES <span class="badge">${preferredCount}</span></h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${voiceAnalysis.map(v => `
    <div class="voice-card">
      <div class="voice-header">
        <span class="voice-name">${esc(v.name)}</span>
        <span class="voice-count">${v.count} article${v.count !== 1 ? 's' : ''}</span>
      </div>
      <ul class="voice-articles">
        ${(v.articles || []).slice(0, 5).map(a => {
          const isFresh = a.published_at && (now - new Date(a.published_at).getTime()) < 36 * 60 * 60 * 1000;
          return `
        <li>
          <a href="${esc(a.link)}" target="_blank">${esc(a.title)}</a>
          <span class="today-badge ${isFresh ? 'fresh' : 'backlog'}">${isFresh ? '\u{1F7E2} New' : '\u{1F4E6} Older'}</span>
          <button class="bookmark-btn ${a.status === 'flagged' ? 'bookmarked' : ''}" onclick="toggleBookmark(${a.id}, this)">\u2B50</button>
          <span class="snippet">${esc(truncate(a.content_snippet, 120))}</span>
        </li>`;
        }).join('')}
        ${v.count === 0 ? '<li style="color:var(--text-muted);font-style:italic;">No recent articles \u2014 track via LinkedIn paste</li>' : ''}
      </ul>
    </div>`).join('')}
  </div>
</div>

<!-- TOP ARTICLES -->
<div class="section" id="sec-top">
  <div class="section-header" onclick="toggleSection('sec-top')">
    <h2>\u{1F525} TOP ARTICLES <span class="badge">${topArticles.length}</span></h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${topArticles.map(a => {
      const isFresh = a.published_at && (now - new Date(a.published_at).getTime()) < 36 * 60 * 60 * 1000;
      const scorePct = Math.round(((a.relevance_score || 1) / 10) * 100);
      return `
    <div class="article-card ${a.is_preferred_voice ? 'preferred' : ''}" data-lens="${a.lens || ''}" data-secondary-lens="${a.secondary_lens || ''}" data-preferred="${a.is_preferred_voice ? '1' : '0'}">
      <div class="article-body">
        <div class="article-title"><a href="${esc(a.link)}" target="_blank">${esc(a.title)}</a></div>
        <div class="article-meta">
          <span>${esc(a.source_name)}</span>
          <span class="lens-tag">${LENS_EMOJI[a.lens] || ''} ${esc(LENS_NAMES[a.lens] || a.lens || '')}</span>
          <span class="score-bar"><span class="score-fill" style="width:${scorePct}%"></span></span> ${a.relevance_score}/10
          ${a.is_preferred_voice ? '<span style="color:var(--red);font-weight:600;">\u{1F534} Preferred</span>' : ''}
          <span class="today-badge ${isFresh ? 'fresh' : 'backlog'}">${isFresh ? '\u{1F7E2} New' : '\u{1F4E6}'}</span>
        </div>
        <div class="article-snippet">${esc(truncate(a.content_snippet, 160))}</div>
      </div>
      <button class="bookmark-btn ${a.status === 'flagged' ? 'bookmarked' : ''}" onclick="toggleBookmark(${a.id}, this)" title="Bookmark">\u2B50</button>
    </div>`;
    }).join('')}
  </div>
</div>

<!-- ALL ARTICLES BY LENS -->
${Object.entries(LENS_NAMES).map(([lens, name]) => {
  const lensArticles = articles.filter(a => a.lens === lens).slice(0, 10);
  return `
<div class="section collapsed" id="sec-${lens}">
  <div class="section-header" onclick="toggleSection('sec-${lens}')">
    <h2>${LENS_EMOJI[lens] || ''} ${esc(name)} <span class="badge">${lensCounts[lens] || 0}</span></h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${lensArticles.map(a => {
      const scorePct = Math.round(((a.relevance_score || 1) / 10) * 100);
      return `
    <div class="article-card ${a.is_preferred_voice ? 'preferred' : ''}" data-lens="${lens}" data-preferred="${a.is_preferred_voice ? '1' : '0'}">
      <div class="article-body">
        <div class="article-title"><a href="${esc(a.link)}" target="_blank">${esc(a.title)}</a></div>
        <div class="article-meta">
          <span>${esc(a.source_name)}</span>
          <span class="score-bar"><span class="score-fill" style="width:${scorePct}%"></span></span> ${a.relevance_score}/10
          ${a.is_preferred_voice ? '<span style="color:var(--red);">\u{1F534}</span>' : ''}
        </div>
        <div class="article-snippet">${esc(truncate(a.content_snippet, 140))}</div>
      </div>
      <button class="bookmark-btn ${a.status === 'flagged' ? 'bookmarked' : ''}" onclick="toggleBookmark(${a.id}, this)">\u2B50</button>
    </div>`;
    }).join('')}
    ${lensArticles.length === 0 ? '<p style="color:var(--text-muted);font-style:italic;">No articles in this lens yet.</p>' : ''}
  </div>
</div>`;
}).join('')}

<!-- LENS SNAPSHOT -->
<div class="section" id="sec-lenses">
  <div class="section-header" onclick="toggleSection('sec-lenses')">
    <h2>\u{1F4CA} LENS SNAPSHOT</h2><span class="chevron">\u25BC</span>
  </div>
  <div class="section-body">
    ${Object.entries(LENS_NAMES).map(([lens, name]) => {
      const count = lensCounts[lens] || 0;
      const pct = Math.round((count / maxLens) * 100);
      const colors = { workforce_ai: '#3b82f6', productivity: '#f59e0b', people_strategy: '#10b981', leadership: '#8b5cf6' };
      return `
    <div class="lens-row">
      <span class="lens-label">${LENS_EMOJI[lens] || ''} ${esc(name)}</span>
      <div class="lens-bar-track"><div class="lens-bar-fill" style="width:${pct}%;background:${colors[lens] || '#38bdf8'}"></div></div>
      <span class="lens-count">${count}</span>
    </div>`;
    }).join('')}
  </div>
</div>

<div class="footer">CPO Intel Hub \u00B7 ${esc(displayDate)} \u00B7 <span class="local-time"></span></div>

</div><!-- /container -->

<script>
// Local time
document.querySelectorAll('.local-time').forEach(function(el) {
  el.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
});

// Refresh
async function refreshFeeds() {
  var btn = document.getElementById('refresh-btn');
  btn.innerHTML = '\\u23F3 Fetching...';
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    var resp = await fetch('/api/refresh', { method: 'POST' });
    var data = await resp.json();
    if (data.success) {
      btn.innerHTML = '\\u2705 ' + (data.totalNew || 0) + ' new';
      setTimeout(function() { window.location.reload(); }, 1500);
    } else {
      btn.innerHTML = '\\u274C Error';
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  } catch(e) {
    btn.innerHTML = '\\u274C Failed';
    btn.classList.remove('loading');
    btn.disabled = false;
    setTimeout(function() { btn.innerHTML = '\\uD83D\\uDD04 Refresh'; }, 3000);
  }
}

// Section toggle
function toggleSection(id) { document.getElementById(id).classList.toggle('collapsed'); }

// Lens filtering
var activeLens = 'all';
function filterLens(lens) {
  activeLens = lens;
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  var target = document.querySelector('.filter-btn[data-lens="'+lens+'"]');
  if (target) target.classList.add('active');

  if (lens === 'saved') {
    document.querySelectorAll('.article-card').forEach(function(el) {
      el.style.display = el.querySelector('.bookmark-btn.bookmarked') ? '' : 'none';
    });
    return;
  }

  if (lens === 'preferred') {
    document.querySelectorAll('.article-card').forEach(function(el) {
      el.style.display = el.dataset.preferred === '1' ? '' : 'none';
    });
    return;
  }

  document.querySelectorAll('.article-card').forEach(function(el) {
    if (lens === 'all') { el.style.display = ''; return; }
    var elLens = el.dataset.lens || '';
    var elSecondary = el.dataset.secondaryLens || '';
    el.style.display = (elLens === lens || elSecondary === lens) ? '' : 'none';
  });
}

// Bookmarks
async function toggleBookmark(articleId, btn) {
  try {
    var resp = await fetch('/api/bookmark', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ articleId: articleId })
    });
    var data = await resp.json();
    if (data.status === 'flagged') { btn.classList.add('bookmarked'); }
    else { btn.classList.remove('bookmarked'); }
  } catch(e) { console.error('Bookmark error:', e); }
}
</script>

</body>
</html>`;
}
