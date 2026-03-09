import dayjs from 'dayjs';
import { LENS_NAMES, LENS_EMOJI } from '../config/constants.js';

export function generateBrief(articles, pastes, date) {
  const briefDate = date || dayjs().format('YYYY-MM-DD');
  const displayDate = dayjs(briefDate).format('MMMM D, YYYY');

  const preferredArticles = articles.filter((a) => a.is_preferred_voice);
  const regularArticles = articles.filter((a) => !a.is_preferred_voice);

  const byLens = {};
  for (const lens of Object.keys(LENS_NAMES)) {
    byLens[lens] = regularArticles.filter(
      (a) => a.lens === lens || a.secondary_lens === lens
    );
  }

  let md = `# CPO Intel Hub Daily Brief — ${displayDate}\n\n`;

  // Preferred Voices section
  if (preferredArticles.length > 0) {
    md += `## 🔴 PREFERRED VOICES (What your people leaders are saying)\n`;
    for (const a of preferredArticles) {
      const summary = a.summary || truncate(a.content_snippet, 120);
      md += `- **${a.author || a.source_name}** (${a.source_name}): [${a.title}](${a.link})`;
      if (summary) md += ` — ${summary}`;
      md += `\n`;
    }
    md += `\n`;
  }

  // Lens sections
  for (const [lens, name] of Object.entries(LENS_NAMES)) {
    const lensArticles = byLens[lens] || [];
    if (lensArticles.length === 0) continue;

    const emoji = LENS_EMOJI[lens] || '';
    md += `## ${emoji} Lens: ${name} (${lensArticles.length} new)\n`;

    for (const a of lensArticles.slice(0, 10)) {
      const summary = a.summary || truncate(a.content_snippet, 120);
      md += `- [${a.title}](${a.link}) — ${a.source_name}`;
      if (summary) md += ` — ${summary}`;
      md += `\n`;
    }

    if (lensArticles.length > 10) {
      md += `- *...and ${lensArticles.length - 10} more*\n`;
    }
    md += `\n`;
  }

  // LinkedIn pastes section
  if (pastes && pastes.length > 0) {
    md += `## 📋 LinkedIn Insights (${pastes.length} paste-ins today)\n`;
    for (const p of pastes) {
      const summary = p.summary || truncate(p.content, 120);
      md += `- **${p.author_name}**`;
      if (p.lens) md += ` (${LENS_NAMES[p.lens] || p.lens})`;
      md += `: ${summary}\n`;
    }
    md += `\n`;
  }

  // Stats section
  const topLens = Object.entries(byLens)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, items]) => items.length > 0);

  md += `## 📊 Stats\n`;
  md += `- Total new articles: ${articles.length}\n`;
  md += `- Preferred voice hits: ${preferredArticles.length}\n`;
  if (pastes && pastes.length > 0) {
    md += `- LinkedIn paste-ins: ${pastes.length}\n`;
  }
  if (topLens) {
    md += `- Top lens today: ${LENS_NAMES[topLens[0]] || topLens[0]}\n`;
  }
  md += `\n`;

  return {
    brief_date: briefDate,
    content: md,
    article_count: articles.length,
    paste_count: pastes ? pastes.length : 0,
  };
}

function truncate(text, maxLen) {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + '...';
}
