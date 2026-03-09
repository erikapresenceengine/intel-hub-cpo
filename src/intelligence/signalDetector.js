import dayjs from 'dayjs';
import { getPreferredVoiceName } from '../config/preferredVoices.js';
import { getVoiceProfile } from '../config/preferredVoices.js';
import { getAllSignalTrends } from '../storage/db.js';
import { LENS_NAMES, LENS_EMOJI } from '../config/constants.js';

// ─── SIGNAL THEMES (CPO Domain) ──────────────────────────────────
// Theme clusters to detect convergent signals across sources

export const SIGNAL_THEMES = [
  {
    id: 'ai_workforce_transformation',
    label: 'AI is reshaping the workforce',
    lenses: ['workforce_ai', 'people_strategy'],
    keywords: ['ai workforce', 'ai jobs', 'ai replacing', 'ai augment', 'automation workforce', 'generative ai workforce', 'ai hiring', 'ai talent', 'ai skills gap', 'reskilling ai'],
    insight: 'AI is moving from IT to every function. CPOs who build AI-ready workforce strategies now will define the next era of talent management.',
    contentAngle: 'Your board needs a workforce AI strategy, not an IT pilot. Frame this as a people problem, not a tech problem.',
  },
  {
    id: 'skills_based_org',
    label: 'Skills-based organizations are going mainstream',
    lenses: ['people_strategy', 'productivity'],
    keywords: ['skills-based', 'skills based', 'talent marketplace', 'internal mobility', 'skill taxonomy', 'skills gap', 'competency', 'skills ontology', 'skill-first'],
    insight: 'The shift from jobs to skills is accelerating. Companies adopting skills-based models are seeing 2x internal mobility and lower attrition.',
    contentAngle: 'Most companies say "skills-based" but still hire for titles. Show the gap between aspiration and execution.',
  },
  {
    id: 'employee_experience',
    label: 'Employee experience is the new battleground',
    lenses: ['people_strategy', 'leadership'],
    keywords: ['employee experience', 'engagement', 'retention', 'attrition', 'employee value proposition', 'EVP', 'employer brand', 'quiet quitting', 'great resignation', 'talent retention'],
    insight: 'EX has moved from perks to systems. The CPOs winning retention are designing experiences, not offering pizza parties.',
    contentAngle: 'Architecture before automation applies to EX too. Systems beat perks every time.',
  },
  {
    id: 'people_analytics',
    label: 'People analytics is hitting the boardroom',
    lenses: ['workforce_ai', 'productivity'],
    keywords: ['people analytics', 'workforce analytics', 'hr analytics', 'talent analytics', 'predictive analytics hr', 'data-driven hr', 'workforce planning', 'headcount planning'],
    insight: 'CFOs now expect the same data rigor from HR that they get from finance. People analytics is no longer optional for credible CPOs.',
    contentAngle: 'If you can\'t quantify your people strategy, the CFO won\'t fund it. Show how analytics turns HR from cost center to strategic driver.',
  },
  {
    id: 'hybrid_work_evolution',
    label: 'The hybrid work model is evolving again',
    lenses: ['productivity', 'leadership'],
    keywords: ['hybrid work', 'remote work', 'return to office', 'RTO', 'distributed team', 'async work', 'flexible work', 'work from home', 'office mandate', 'workplace policy'],
    insight: 'The RTO debate is a red herring. The real question is: what work model maximizes both productivity and talent access? CPOs who frame it that way win.',
    contentAngle: 'Stop debating RTO vs remote. Start designing work architecture that optimizes for outcomes, not location.',
  },
  {
    id: 'manager_effectiveness',
    label: 'Manager effectiveness is under the microscope',
    lenses: ['leadership', 'productivity'],
    keywords: ['manager effectiveness', 'manager enablement', 'first-line manager', 'people manager', 'manager training', 'manager coaching', 'leadership development', 'manager burnout', 'span of control'],
    insight: 'Managers are the bottleneck and the multiplier. Companies investing in manager effectiveness see 2-3x returns on engagement and retention.',
    contentAngle: 'Your managers are drowning. Give them systems, not more training modules. Architecture before automation.',
  },
  {
    id: 'psychological_safety',
    label: 'Psychological safety is becoming operational',
    lenses: ['leadership', 'people_strategy'],
    keywords: ['psychological safety', 'trust', 'fearless organization', 'speak up culture', 'learning culture', 'belonging', 'inclusion', 'DEI', 'diversity equity', 'inclusive leadership'],
    insight: 'Psychological safety has moved from concept to measurable competency. Leading CPOs are baking it into performance systems, not just values posters.',
    contentAngle: 'Everyone talks about psychological safety. Almost nobody measures it. Show the operational playbook.',
  },
  {
    id: 'hr_tech_consolidation',
    label: 'HR tech is consolidating around AI-native platforms',
    lenses: ['workforce_ai', 'productivity'],
    keywords: ['hcm', 'workday', 'SAP successfactors', 'hr tech', 'hr technology', 'HRIS', 'talent management platform', 'AI-native hr', 'hr SaaS', 'hr software', 'rippling', 'deel', 'lattice'],
    insight: 'The HR tech stack is consolidating. AI-native platforms are eating point solutions. CPOs who pick the right platform now avoid painful migrations later.',
    contentAngle: 'Your HR tech stack probably has 15+ tools that don\'t talk to each other. The consolidation wave is your chance to architect it right.',
  },
];

// ─── PATTERN ANALYSIS ──────────────────────────────────────────────

export function detectSignals(articles) {
  const signals = [];

  for (const theme of SIGNAL_THEMES) {
    const matchingArticles = articles.filter((a) => {
      const text = `${a.title} ${a.content_snippet || ''} ${a.tags || ''}`.toLowerCase();
      return theme.keywords.some((kw) => text.includes(kw));
    });

    if (matchingArticles.length >= 2) {
      const sources = [...new Set(matchingArticles.map((a) => a.source_name))];
      const preferredHits = matchingArticles.filter((a) => a.is_preferred_voice);

      signals.push({
        ...theme,
        strength: matchingArticles.length,
        sourceCount: sources.length,
        sources: sources.slice(0, 5),
        preferredHits: preferredHits.length,
        topArticles: matchingArticles
          .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
          .slice(0, 3),
      });
    }
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// ─── PREFERRED VOICE ANALYSIS ──────────────────────────────────────

export function analyzePreferredVoices(articles) {
  const preferred = articles.filter((a) => a.is_preferred_voice);
  const byVoice = {};

  for (const a of preferred) {
    const voiceName = getPreferredVoiceName(a.author || '') ||
                      getPreferredVoiceName(a.source_name || '') ||
                      a.author || a.source_name;
    if (!byVoice[voiceName]) {
      byVoice[voiceName] = [];
    }
    byVoice[voiceName].push(a);
  }

  return Object.entries(byVoice).map(([name, arts]) => ({
    name,
    count: arts.length,
    topArticle: arts.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))[0],
    articles: arts.slice(0, 5),
  }));
}

// ─── CONTENT HOOKS (CPO-adapted) ──────────────────────────────────

export function generateContentHooks(signals, voiceAnalysis, articles) {
  const hooks = [];

  // From signals: what's converging?
  for (const signal of signals.slice(0, 3)) {
    if (signal.strength >= 3) {
      hooks.push({
        type: 'trend',
        emoji: '\u{1F4C8}',
        hook: signal.contentAngle,
        why: signal.label,
        evidence: `${signal.strength} articles from ${signal.sourceCount} sources`,
        format: signal.strength >= 5 ? 'Board deck talking point or all-hands slide' : 'Manager toolkit insight or team brief',
      });
    }
  }

  // From preferred voices: what are your thought leaders saying?
  for (const voice of voiceAnalysis.slice(0, 3)) {
    if (voice.topArticle) {
      hooks.push({
        type: 'riff',
        emoji: '\u{1F504}',
        hook: `${voice.name} is arguing: "${voice.topArticle.title}"`,
        why: `${voice.name} published ${voice.count} piece${voice.count > 1 ? 's' : ''} recently`,
        evidence: 'Read their take, form your position, share with your leadership team',
        format: 'Discussion point for next CHRO roundtable or leadership offsite',
      });
    }
  }

  // From high-scoring articles: what's provocative?
  const highScorers = articles
    .filter((a) => (a.relevance_score || 0) >= 7)
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 3);

  for (const a of highScorers) {
    const titleLower = (a.title || '').toLowerCase();
    if (titleLower.includes('myth') || titleLower.includes('wrong') ||
        titleLower.includes('dead') || titleLower.includes('truth') ||
        titleLower.includes('mistake') || titleLower.includes('secret') ||
        titleLower.includes('surprising') || titleLower.includes('controversial') ||
        titleLower.includes('fail') || titleLower.includes('broken')) {
      hooks.push({
        type: 'contrarian',
        emoji: '\u{1F525}',
        hook: `Contrarian angle: "${a.title}"`,
        why: `From ${a.source_name}`,
        evidence: 'Challenge conventional HR wisdom. Your leadership team needs to hear the counter-argument.',
        format: 'Exec brief or leadership team discussion prompt',
      });
    }
  }

  return hooks;
}

// ─── MARKET MOVES (CPO-adapted) ────────────────────────────────────

export function extractMarketMoves(articles) {
  const moves = [];
  const patterns = [
    { pattern: /\b(acqui|merger|acquisition|acquire[sd]?)\b/i, type: '\u{1F4B0} M&A', color: '#8b5cf6' },
    { pattern: /\b(labor law|regulation|compliance|EEOC|NLRB|DOL|wage rule|overtime rule)\b/i, type: '\u2696\uFE0F Regulatory', color: '#10b981' },
    { pattern: /\b(layoff|cut[s]? \d|restructur|reorganiz|reduction in force|RIF)\b/i, type: '\u{1F4C9} Restructure', color: '#ef4444' },
    { pattern: /\b(partner|partnership|collaborat|integrat|team[s]? with)\b/i, type: '\u{1F91D} Partnership', color: '#3b82f6' },
    { pattern: /\b(launch|unveil|announce|introduce|release[sd]?)\b/i, type: '\u{1F680} Launch', color: '#f59e0b' },
    { pattern: /\b(raise[sd]?|funding|series [a-e]|round|ipo)\b/i, type: '\u{1F4C8} Funding', color: '#06b6d4' },
    { pattern: /\b(union|strike|walkout|labor action|collective bargaining)\b/i, type: '\u270A Labor', color: '#6b7280' },
  ];

  for (const a of articles) {
    const text = `${a.title} ${a.content_snippet || ''}`;
    for (const p of patterns) {
      if (p.pattern.test(text)) {
        moves.push({
          type: p.type,
          color: p.color,
          title: a.title,
          source: a.source_name,
          link: a.link,
          lens: a.lens,
        });
        break;
      }
    }
  }

  const seen = new Set();
  return moves.filter((m) => {
    const key = m.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

// ─── LENS HEALTH ANALYSIS ──────────────────────────────────────────

export function analyzeLensHealth(articles, signals) {
  const lensIds = Object.keys(LENS_NAMES);
  const health = {};

  for (const lensId of lensIds) {
    const lensArticles = articles.filter((a) => a.lens === lensId);
    const lensSignals = signals.filter((s) => (s.lenses || []).includes(lensId));
    const topSignal = lensSignals.length > 0
      ? lensSignals.sort((a, b) => b.strength - a.strength)[0]
      : null;

    let status = 'active';
    if (lensArticles.length === 0 && lensSignals.length === 0) {
      status = 'silent';
    } else if (lensArticles.length < 3 && lensSignals.length === 0) {
      status = 'quiet';
    }

    const gapMessages = {
      workforce_ai: 'Your Workforce AI lens is quiet. Good day to review your AI readiness assessment or check what competitors are automating.',
      productivity: 'Productivity lens is quiet. Opportunity to audit your team\'s tool stack or review process bottlenecks.',
      people_strategy: 'People Strategy is quiet today. Good day to review your talent pipeline or succession plan gaps.',
      leadership: 'Leadership & Culture lens is quiet. Consider checking in on manager effectiveness metrics or team pulse data.',
    };

    health[lensId] = {
      name: LENS_NAMES[lensId],
      emoji: LENS_EMOJI[lensId] || '',
      articleCount: lensArticles.length,
      signalCount: lensSignals.length,
      topSignal: topSignal ? topSignal.label : null,
      topSignalId: topSignal ? topSignal.id : null,
      status,
      gapWarning: (status === 'quiet' || status === 'silent') ? gapMessages[lensId] : null,
    };
  }

  return health;
}

// ─── CROSS-LENS THEME DETECTION ───────────────────────────────────

export function detectCrossLensThemes(signals) {
  const crossLens = signals.filter((s) => (s.lenses || []).length >= 2);

  if (crossLens.length === 0) return [];

  const themes = [];
  const used = new Set();

  for (const signal of crossLens) {
    if (used.has(signal.id)) continue;

    const related = crossLens.filter((s) =>
      s.id !== signal.id &&
      !used.has(s.id) &&
      s.lenses.some((l) => signal.lenses.includes(l))
    );

    const allSignals = [signal, ...related];
    const allLenses = [...new Set(allSignals.flatMap((s) => s.lenses))];
    const lensLabels = allLenses.map((l) => LENS_NAMES[l] || l);

    let bridgeNarrative = '';
    let contentAngle = '';

    if (allLenses.includes('workforce_ai') && allLenses.includes('people_strategy')) {
      bridgeNarrative = 'AI transformation and people strategy are converging. The CPOs who win will build AI-ready cultures, not just AI-ready tech stacks.';
      contentAngle = 'Frame workforce AI as a people strategy issue, not a tech issue. That\'s the CPO\'s unique lane.';
    } else if (allLenses.includes('workforce_ai') && allLenses.includes('productivity')) {
      bridgeNarrative = 'AI tools are directly impacting productivity metrics. The link between workforce AI adoption and efficiency gains is becoming measurable.';
      contentAngle = 'Show the data: how AI adoption correlates with productivity. Your CFO will listen to numbers.';
    } else if (allLenses.includes('leadership') && allLenses.includes('people_strategy')) {
      bridgeNarrative = 'Culture and strategy are the same conversation. Leadership effectiveness directly drives people strategy outcomes.';
      contentAngle = 'Connect leadership development to business outcomes. Stop treating them as separate budget lines.';
    } else if (allLenses.includes('productivity') && allLenses.includes('leadership')) {
      bridgeNarrative = 'Productivity and leadership are intersecting. Manager effectiveness is the biggest lever for team output.';
      contentAngle = 'Your managers are your productivity strategy. Invest there first.';
    } else {
      bridgeNarrative = `These signals span ${lensLabels.join(' + ')}. Cross-functional intelligence gives you the edge in CHRO conversations.`;
      contentAngle = `Draft an insight that bridges ${lensLabels.join(' and ')} for your leadership team.`;
    }

    themes.push({
      theme: allSignals.map((s) => s.label).join(' + '),
      lenses: allLenses,
      lensLabels,
      signals: allSignals.map((s) => s.id),
      signalLabels: allSignals.map((s) => s.label),
      strength: allSignals.reduce((sum, s) => sum + s.strength, 0),
      bridgeNarrative,
      contentAngle,
    });

    for (const s of allSignals) used.add(s.id);
  }

  return themes.sort((a, b) => b.strength - a.strength);
}

// ─── TREND VELOCITY DETECTION ─────────────────────────────────────

export async function detectTrendVelocity(signals) {
  try {
    const trends = await getAllSignalTrends(7);
    const results = [];

    for (const signal of signals) {
      const history = trends[signal.id] || [];

      const thisWeek = history.filter((h) => {
        const d = dayjs(h.date);
        return dayjs().diff(d, 'day') <= 3;
      });
      const lastWeek = history.filter((h) => {
        const d = dayjs(h.date);
        const diff = dayjs().diff(d, 'day');
        return diff > 3 && diff <= 7;
      });

      const thisWeekStrength = thisWeek.reduce((sum, h) => sum + (h.strength || 0), 0);
      const lastWeekStrength = lastWeek.reduce((sum, h) => sum + (h.strength || 0), 0);

      let velocity = 'steady';
      let change = '0%';
      let forwardInsight = '';

      if (lastWeekStrength === 0 && thisWeekStrength > 0) {
        velocity = 'emerging';
        change = 'new';
        forwardInsight = `"${signal.label}" just appeared in your feeds. Get ahead of this before it hits your next CHRO roundtable.`;
      } else if (lastWeekStrength > 0) {
        const pctChange = ((thisWeekStrength - lastWeekStrength) / lastWeekStrength) * 100;
        change = `${pctChange > 0 ? '+' : ''}${Math.round(pctChange)}%`;

        if (pctChange >= 50) {
          velocity = 'accelerating';
          forwardInsight = `This signal grew ${change} in 3 days. Expect your CEO or board to ask about this within 2 weeks. Prepare your talking points now.`;
        } else if (pctChange <= -30) {
          velocity = 'decelerating';
          forwardInsight = `Interest is fading (${change}). If you haven't briefed your leadership team on this, the window may be closing.`;
        } else {
          velocity = 'steady';
          forwardInsight = `Consistent signal. Good foundation for a strategic initiative or board deck section.`;
        }
      }

      results.push({
        signalId: signal.id,
        label: signal.label,
        lenses: signal.lenses || [],
        velocity,
        thisWeek: thisWeekStrength,
        lastWeek: lastWeekStrength,
        change,
        forwardInsight,
        history: history.slice(0, 7),
      });
    }

    return results;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[detectTrendVelocity] ${err.message || 'Unknown error'}`);
    }
    return signals.map((s) => ({
      signalId: s.id,
      label: s.label,
      lenses: s.lenses || [],
      velocity: 'unknown',
      thisWeek: s.strength || 0,
      lastWeek: 0,
      change: 'N/A',
      forwardInsight: '',
      history: [],
    }));
  }
}

// ─── ACTION ITEMS (CPO-adapted) ────────────────────────────────────

export function generateActions(signals, moves, voiceAnalysis, options = {}) {
  const { lensHealth, crossLensThemes, trendVelocity } = options;
  const actions = [];
  const dayOfWeek = dayjs().day();

  // ── Priority 1: Thought leader intelligence (time-sensitive) ──
  for (const voice of voiceAnalysis.slice(0, 2)) {
    if (voice.topArticle) {
      const voiceProfile = getVoiceProfile(voice.name);
      const relevance = voiceProfile?.relevance || '';
      actions.push({
        emoji: '\u{1F4AC}',
        text: `Read ${voice.name}'s latest`,
        detail: `"${voice.topArticle.title}". ${relevance ? relevance.split('.')[0] + '.' : 'Key voice in the people space.'}`,
        priority: 1,
        link: voice.topArticle.link,
      });
    }
  }

  // ── Priority 2: Accelerating/emerging trends ──
  if (trendVelocity) {
    const urgent = trendVelocity.filter((t) => t.velocity === 'accelerating' || t.velocity === 'emerging');
    for (const trend of urgent.slice(0, 2)) {
      actions.push({
        emoji: trend.velocity === 'accelerating' ? '\u{1F4C8}' : '\u2728',
        text: trend.velocity === 'accelerating'
          ? `${trend.label} is surging (${trend.change})`
          : `Emerging: ${trend.label}`,
        detail: trend.forwardInsight,
        priority: 2,
      });
    }
  }

  // ── Priority 3: Lens gaps ──
  if (lensHealth) {
    for (const [lensId, health] of Object.entries(lensHealth)) {
      if (health.status === 'quiet' || health.status === 'silent') {
        actions.push({
          emoji: '\u{1F4AD}',
          text: `${health.emoji} ${health.name} needs attention`,
          detail: health.gapWarning || 'This lens has gone quiet. Review your strategy here.',
          priority: 3,
        });
      }
    }
  }

  // ── Priority 4: Cross-lens plays ──
  if (crossLensThemes && crossLensThemes.length > 0) {
    const topTheme = crossLensThemes[0];
    actions.push({
      emoji: '\u{1F310}',
      text: `Cross-lens insight: ${topTheme.lensLabels.join(' + ')}`,
      detail: `${topTheme.bridgeNarrative} ${topTheme.contentAngle}`,
      priority: 4,
    });
  }

  // ── Priority 5: Signal-driven action ──
  const topSignal = signals[0];
  if (topSignal && topSignal.strength >= 3) {
    const alreadyCovered = actions.some((a) => a.text?.includes(topSignal.label));
    if (!alreadyCovered) {
      actions.push({
        emoji: '\u{1F4DD}',
        text: `Brief your team on "${topSignal.label}"`,
        detail: `${topSignal.strength} articles from ${topSignal.sourceCount} sources are converging. ${topSignal.contentAngle}`,
        priority: 5,
      });
    }
  }

  // ── Priority 6: Market moves ──
  const regulatory = moves.filter((m) => m.type.includes('Regulatory'));
  if (regulatory.length > 0) {
    actions.push({
      emoji: '\u2696\uFE0F',
      text: `${regulatory.length} regulatory move${regulatory.length > 1 ? 's' : ''} to review`,
      detail: 'Check for compliance implications or workforce policy updates needed.',
      priority: 6,
    });
  }

  const restructures = moves.filter((m) => m.type.includes('Restructure'));
  if (restructures.length > 0) {
    actions.push({
      emoji: '\u{1F4C9}',
      text: `${restructures.length} restructuring${restructures.length > 1 ? 's' : ''} detected`,
      detail: 'Review for talent acquisition opportunities or competitive intelligence.',
      priority: 6,
    });
  }

  // ── Priority 7: Day-of-week CPO rhythm ──
  const formatTips = {
    1: { text: 'Monday: Set your CHRO narrative', detail: "Review signals and prepare talking points for the week. What's your one big insight to share with leadership?" },
    2: { text: 'Tuesday: Deep dive day', detail: "Pick the strongest signal and read the source articles. Prepare a 2-minute briefing for your next exec sync." },
    3: { text: 'Wednesday: Manager enablement', detail: "What insight from your feeds would help your managers today? Draft a 3-bullet manager toolkit update." },
    4: { text: 'Thursday: Stakeholder prep', detail: "Review cross-lens themes for board or C-suite conversations. Connect workforce data to business outcomes." },
    5: { text: 'Friday: Reflection + planning', detail: "What shifted this week? Update your people strategy assumptions. Plan next week's priorities." },
    6: { text: 'Saturday: Light scan', detail: "Quick signal check. Any weekend news that changes Monday's priorities?" },
    0: { text: 'Sunday: Week ahead prep', detail: "Map out your key people decisions for the week using this brief as your foundation." },
  };

  const todayTip = formatTips[dayOfWeek];
  actions.push({
    emoji: '\u{1F4C5}',
    text: todayTip.text,
    detail: todayTip.detail,
    priority: 7,
  });

  return actions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

// ─── WEEKLY STRATEGY ──────────────────────────────────────────────

export function generateWeeklyStrategy(lensHealth, trendVelocity, voiceAnalysis) {
  const dayOfWeek = dayjs().day();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const topByLens = {};
  if (trendVelocity) {
    for (const trend of trendVelocity) {
      for (const lens of (trend.lenses || [])) {
        if (!topByLens[lens] || trend.thisWeek > (topByLens[lens].thisWeek || 0)) {
          topByLens[lens] = trend;
        }
      }
    }
  }

  const calendar = [];
  const accelerating = (trendVelocity || []).filter((t) => t.velocity === 'accelerating' || t.velocity === 'emerging');
  const activeVoices = voiceAnalysis.filter((v) => v.count > 0).slice(0, 3);

  const quietestLens = lensHealth
    ? Object.entries(lensHealth)
      .sort((a, b) => a[1].articleCount - b[1].articleCount)
      .map(([id]) => id)[0]
    : 'leadership';

  // Action 1: Mon/Tue — Brief leadership on accelerating signal
  if (accelerating.length > 0) {
    const trend = accelerating[0];
    calendar.push({
      timing: 'Mon/Tue',
      emoji: LENS_EMOJI[(trend.lenses || [])[0]] || '\u{1F4DD}',
      description: `Brief your exec team on "${trend.label}" (${trend.change}) — prepare 3 talking points`,
      lens: (trend.lenses || [])[0],
    });
  } else {
    calendar.push({
      timing: 'Mon/Tue',
      emoji: '\u{1F4DD}',
      description: 'Review top signals and prepare your weekly people strategy talking points',
      lens: null,
    });
  }

  // Action 2: Wed/Thu — Engage with thought leader intelligence
  if (activeVoices.length > 0) {
    const voice = activeVoices[0];
    calendar.push({
      timing: 'Wed/Thu',
      emoji: '\u{1F4AC}',
      description: `Deep-read ${voice.name}'s take: "${voice.topArticle?.title || 'latest piece'}" and form your position`,
      lens: voice.topArticle?.lens || 'people_strategy',
    });
  } else {
    calendar.push({
      timing: 'Wed/Thu',
      emoji: '\u{1F4AC}',
      description: 'Review preferred voices for emerging perspectives to share with leadership',
      lens: 'people_strategy',
    });
  }

  // Action 3: Fri — Address the quietest lens
  const quietLensName = LENS_NAMES[quietestLens] || 'Leadership & Culture';
  const quietEmoji = LENS_EMOJI[quietestLens] || '\u{1F3C6}';
  calendar.push({
    timing: 'Fri',
    emoji: quietEmoji,
    description: `Attention needed: ${quietLensName} — review gaps and update your strategy assumptions`,
    lens: quietestLens,
  });

  const lensBalance = lensHealth
    ? Object.entries(lensHealth).map(([id, health]) => ({
      id,
      name: health.name,
      emoji: health.emoji,
      articleCount: health.articleCount,
      signalCount: health.signalCount,
      status: health.status,
    }))
    : [];

  const sparklines = (trendVelocity || []).slice(0, 3).map((t) => ({
    label: t.label,
    velocity: t.velocity,
    change: t.change,
    history: (t.history || []).map((h) => h.strength || 0),
  }));

  return {
    dayOfWeek,
    dayName: daysOfWeek[dayOfWeek],
    calendar,
    lensBalance,
    sparklines,
    topTrend: accelerating[0] || null,
  };
}
