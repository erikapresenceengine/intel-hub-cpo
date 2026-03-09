import dayjs from 'dayjs';
import { LENS_NAMES, LENS_EMOJI } from '../config/constants.js';
import { safeClaude, getModel, isAIAvailable } from './claudeClient.js';
import { getCachedData } from '../storage/db.js';

/**
 * Executive Summary Generator — CPO Strategic Intelligence Briefing
 *
 * Generates a 3-section strategic briefing for the dashboard hero:
 *   1. YOUR MOVE — one specific action with cited article substance
 *   2. WHAT SHIFTED — per-lens intelligence with actual findings
 *   3. GAPS & OPPORTUNITIES — where you're falling behind and why
 *
 * Two modes:
 *   - With Claude API: AI-synthesized briefing from article content
 *   - Without API: template-based briefing using article snippets directly
 */

// ─── ARTICLE INTELLIGENCE BUILDER ────────────────────────────────

async function buildArticleIntelligence(signals, articles, lensHealth) {
  const lensIds = Object.keys(LENS_NAMES);
  const blocks = [];

  for (const lensId of lensIds) {
    const lensName = LENS_NAMES[lensId];
    const emoji = LENS_EMOJI[lensId] || '';
    const health = lensHealth ? lensHealth[lensId] : null;

    const lensArticles = articles
      .filter((a) => a.lens === lensId || a.secondary_lens === lensId)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 3);

    if (lensArticles.length === 0) {
      const status = health ? health.status : 'silent';
      const gap = health?.gapWarning || '';
      blocks.push(`${emoji} ${lensName}: No articles today. Status: ${status}.${gap ? ` ${gap}` : ''}`);
      continue;
    }

    const lensSignals = signals.filter((s) => (s.lenses || []).includes(lensId));

    const cachedNarratives = [];
    for (const signal of lensSignals.slice(0, 2)) {
      try {
        const cached = await getCachedData(`signal_synth_${signal.id}`);
        if (cached && cached.narrative) {
          cachedNarratives.push(`[Prior AI analysis] ${signal.label}: ${cached.narrative}`);
        }
      } catch {
        // ignore cache misses
      }
    }

    const articleLines = lensArticles.map((a, i) => {
      const snippet = (a.content_snippet || '').slice(0, 400).replace(/\n/g, ' ').trim();
      const author = a.author ? ` / ${a.author}` : '';
      return `  ${i + 1}. "${a.title}" [${a.source_name}${author}]\n     ${snippet || 'No content available.'}`;
    }).join('\n');

    const articleCount = health ? health.articleCount : lensArticles.length;
    const signalCount = health ? health.signalCount : lensSignals.length;

    let block = `${emoji} ${lensName} (${articleCount} articles, ${signalCount} signals):\n`;
    if (cachedNarratives.length > 0) {
      block += cachedNarratives.join('\n') + '\n';
    }
    block += articleLines;

    blocks.push(block);
  }

  return blocks.join('\n\n');
}

// ─── AI-POWERED SUMMARY ──────────────────────────────────────────

async function generateWithAI(signals, voiceAnalysis, marketMoves, contentHooks, lensHealth, crossLensThemes, trendVelocity, articles) {
  try {
    const available = await isAIAvailable();
    if (!available) return null;

    const model = getModel('SUMMARIZE_MODEL');

    const articleIntelligence = await buildArticleIntelligence(signals, articles, lensHealth);

    const voiceSummaries = voiceAnalysis.slice(0, 5).map((v) => {
      const topSnippet = v.topArticle?.content_snippet
        ? v.topArticle.content_snippet.slice(0, 250).replace(/\n/g, ' ').trim()
        : '';
      return `- ${v.name} (${v.count} piece${v.count !== 1 ? 's' : ''}): "${v.topArticle?.title || 'N/A'}"${topSnippet ? `\n  Content: ${topSnippet}` : ''}`;
    }).join('\n');

    const velocitySummaries = (trendVelocity || []).slice(0, 5).map((t) =>
      `- "${t.label}" [${t.velocity}] ${t.change} — ${t.forwardInsight}`
    ).join('\n');

    const crossLensSummaries = (crossLensThemes || []).map((t) =>
      `- ${t.lensLabels.join(' + ')}: ${t.bridgeNarrative}`
    ).join('\n');

    const dayOfWeek = dayjs().format('dddd');
    const totalArticles = articles.length;

    const prompt = `You are the CPO's chief of staff and intelligence advisor. She leads people strategy for a high-growth organization and tracks workforce trends across 4 lenses: Workforce AI, Productivity & Efficiency, People Strategy, and Leadership & Culture.

Write a strategic briefing she can glance at on her phone in 5 minutes and immediately know what matters, what to do, and where she's falling behind. You MUST extract real substance from the article content below. Not counts. Not buzzwords. What are the articles actually SAYING?

Today is ${dayOfWeek}, ${dayjs().format('MMMM D, YYYY')}. ~${totalArticles} articles scanned.

ARTICLE INTELLIGENCE BY LENS (read the actual content, extract specific findings):

${articleIntelligence}

TREND VELOCITY:
${velocitySummaries || 'No trend data yet.'}

CROSS-LENS THEMES:
${crossLensSummaries || 'None detected.'}

PREFERRED VOICES ACTIVE:
${voiceSummaries || 'No preferred voice activity today.'}

Write EXACTLY 3 sections:

YOUR MOVE
One specific action for TODAY. Be extremely specific:
- WHAT to do: cite the actual finding/data point/argument from the articles above. Not "review AI strategy" but "brief your exec team on [specific finding from specific article]."
- The HOOK: what specific data point or expert argument makes this urgent right now
- WHERE to use it: board prep, exec sync, manager toolkit, all-hands talking point, or team brief
- WHEN: time of day, considering her schedule
This must be actionable in 15 minutes with no additional research.

WHAT SHIFTED
Per-lens intelligence. For each of her 4 lenses, start with the emoji and write 2-3 sentences about what the articles ACTUALLY SAY:
- Specific findings, company names, data points, expert arguments
- What pattern or shift these articles reveal for people strategy
- NOT "12 articles detected" or "signals are firing" — those are useless
- If a lens has articles, tell her what she'd learn from reading them so she doesn't have to
- If a lens has zero articles, say so in one line

GAPS & OPPORTUNITIES
Where is she falling behind or missing an opening?
- Which lens has gone quiet and what specific topic would fill it?
- What are her preferred voices (Josh Bersin, David Green, Adam Grant, etc.) covering that she hasn't acted on? Be specific about WHAT they're arguing.
- Where is there a strategic gap she could own? What specific angle on workforce or people strategy is nobody else in her peer group taking?
- For each gap, explain WHY it's an opportunity with substance from the articles.

RULES:
- Extract ACTUAL SUBSTANCE from the article snippets. Quote specific data points, company names, findings, arguments.
- If an article snippet mentions a company, product, regulation, or statistic, include it.
- Never say "signals are firing" or "buzz is growing" without saying WHAT the signal actually says.
- If a snippet is too vague to extract substance, skip it. Never invent details.
- Tone: Smart, direct, strategic. Like a brilliant chief of staff who did the reading for her.
- No preamble. Jump straight in.

Use these exact section headers: YOUR MOVE, WHAT SHIFTED, GAPS & OPPORTUNITIES.
Output ONLY the briefing text. No markdown formatting, no numbering, no asterisks.`;

    const text = await safeClaude({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] });
    if (!text) return null;

    const sections = parseSections(text);
    return { summary: text, sections, source: 'ai' };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[ExecSummary] AI generation failed:', err.message);
    }
    return null;
  }
}

// ─── SECTION PARSER ──────────────────────────────────────────────

function parseSections(text) {
  const sections = {
    move: '',
    shifted: '',
    gaps: '',
  };

  const moveMatch = text.match(/YOUR MOVE\s*\n([\s\S]*?)(?=WHAT SHIFTED|$)/i);
  const shiftedMatch = text.match(/WHAT SHIFTED\s*\n([\s\S]*?)(?=GAPS\s*[&]\s*OPPORTUNITIES|$)/i);
  const gapsMatch = text.match(/GAPS\s*[&]\s*OPPORTUNITIES\s*\n([\s\S]*?)$/i);

  if (moveMatch) sections.move = moveMatch[1].trim();
  if (shiftedMatch) sections.shifted = shiftedMatch[1].trim();
  if (gapsMatch) sections.gaps = gapsMatch[1].trim();

  if (!sections.move && !sections.shifted && !sections.gaps) {
    sections.move = text;
  }

  return sections;
}

// ─── TEMPLATE-BASED SUMMARY (fallback) ───────────────────────────

function generateFromTemplate(signals, voiceAnalysis, marketMoves, contentHooks, lensHealth, crossLensThemes, trendVelocity, articles) {
  const dayOfWeek = dayjs().format('dddd');
  const lensIds = Object.keys(LENS_NAMES);
  const accelerating = (trendVelocity || []).filter((t) => t.velocity === 'accelerating');

  // ── Section 1: YOUR MOVE ──
  let move = '';
  const topSignal = signals[0];

  if (accelerating.length > 0) {
    const trend = accelerating[0];
    const signal = signals.find((s) => s.id === trend.signalId) || topSignal;
    const topArticle = signal?.topArticles?.[0];
    const snippet = topArticle?.content_snippet?.slice(0, 150)?.replace(/\n/g, ' ')?.trim() || '';
    const lensName = LENS_NAMES[(trend.lenses || [])[0]] || 'your leadership team';
    move = `Brief your exec team on "${trend.label}" — this signal surged ${trend.change} in 3 days.`;
    if (snippet) {
      move += ` The hook: "${snippet}"`;
    }
    move += ` Prepare 3 talking points for your next ${lensName} review.`;
  } else if (topSignal && topSignal.topArticles?.[0]) {
    const a = topSignal.topArticles[0];
    const snippet = a.content_snippet?.slice(0, 150)?.replace(/\n/g, ' ')?.trim() || '';
    move = `Review "${topSignal.label}" — "${a.title}" [${a.source_name}] is worth a 2-minute read.`;
    if (snippet) move += ` Key point: ${snippet}`;
    move += ` Draft a takeaway for your manager toolkit.`;
  } else if (voiceAnalysis[0]?.topArticle) {
    const v = voiceAnalysis[0];
    const snippet = v.topArticle.content_snippet?.slice(0, 150)?.replace(/\n/g, ' ')?.trim() || '';
    move = `Read ${v.name}'s latest: "${v.topArticle.title}".`;
    if (snippet) move += ` They're arguing: ${snippet}`;
    move += ` Form your position before your next CHRO conversation.`;
  } else {
    const dayMoves = {
      Monday: 'Review this brief and set your people strategy talking points for the week.',
      Tuesday: 'Deep dive on your strongest signal. Prepare a 2-minute briefing for your next exec sync.',
      Wednesday: 'Manager enablement day. What insight from your feeds would help your managers this week?',
      Thursday: 'Stakeholder prep. Connect workforce data to business outcomes for your next board touch.',
      Friday: 'Reflection day. What shifted this week? Update your people strategy assumptions.',
      Saturday: 'Light scan. Any weekend news that changes Monday priorities?',
      Sunday: 'Week ahead prep. Map your key people decisions using this brief.',
    };
    move = dayMoves[dayOfWeek] || 'Review your signals and draft one actionable insight for your leadership team.';
  }

  // ── Section 2: WHAT SHIFTED ──
  const shiftedLines = lensIds.map((lensId) => {
    const emoji = LENS_EMOJI[lensId] || '';
    const name = LENS_NAMES[lensId];
    const lensArticles = (articles || [])
      .filter((a) => a.lens === lensId || a.secondary_lens === lensId)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    if (lensArticles.length === 0) {
      return `${emoji} ${name}: No coverage today.`;
    }

    const topTwo = lensArticles.slice(0, 2).map((a) => {
      const snippet = a.content_snippet?.slice(0, 200)?.replace(/\n/g, ' ')?.trim() || '';
      return `"${a.title}" [${a.source_name}]${snippet ? ` — ${snippet}` : ''}`;
    });

    let line = `${emoji} ${name}: ${topTwo[0]}`;
    if (topTwo[1]) {
      line += `\nAlso: ${topTwo[1]}`;
    }
    if (lensArticles.length > 2) {
      line += ` (+${lensArticles.length - 2} more)`;
    }
    return line;
  });
  const shifted = shiftedLines.join('\n');

  // ── Section 3: GAPS & OPPORTUNITIES ──
  const gapLines = [];

  if (lensHealth) {
    for (const [lensId, health] of Object.entries(lensHealth)) {
      if (health.status === 'quiet' || health.status === 'silent') {
        const status = health.status === 'silent' ? 'Silent today' : 'Quiet today';
        gapLines.push(`${health.emoji} ${health.name}: ${status}. ${health.gapWarning || 'Opportunity to get ahead in this space.'}`);
      }
    }
  }

  for (const voice of voiceAnalysis.slice(0, 3)) {
    if (voice.topArticle) {
      const snippet = voice.topArticle.content_snippet?.slice(0, 150)?.replace(/\n/g, ' ')?.trim() || '';
      let line = `${voice.name} published: "${voice.topArticle.title}"`;
      if (snippet) line += ` — ${snippet}`;
      line += '. Have your position ready.';
      gapLines.push(line);
    }
  }

  const gaps = gapLines.length > 0 ? gapLines.join('\n') : 'No major gaps detected. Keep your strategic cadence steady.';

  const summary = `YOUR MOVE\n${move}\n\nWHAT SHIFTED\n${shifted}\n\nGAPS & OPPORTUNITIES\n${gaps}`;
  const sections = { move, shifted, gaps };

  return { summary, sections, source: 'template' };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────

export async function generateExecSummary(
  signals = [], voiceAnalysis = [], marketMoves = [], contentHooks = [],
  lensHealth = null, crossLensThemes = null, trendVelocity = null,
  articles = []
) {
  const aiResult = await generateWithAI(signals, voiceAnalysis, marketMoves, contentHooks, lensHealth, crossLensThemes, trendVelocity, articles);
  if (aiResult) return aiResult;

  return generateFromTemplate(signals, voiceAnalysis, marketMoves, contentHooks, lensHealth, crossLensThemes, trendVelocity, articles);
}

export async function isAvailable() {
  return isAIAvailable();
}
