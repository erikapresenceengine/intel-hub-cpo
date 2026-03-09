import { LENS_KEYWORDS } from '../config/lenses.js';
import { isPreferredVoice } from '../config/preferredVoices.js';

export function tagArticle(article, feedConfig) {
  const text = `${article.title} ${article.content_snippet || ''} ${article.author || ''}`.toLowerCase();

  const scores = {};

  for (const [lens, keywords] of Object.entries(LENS_KEYWORDS)) {
    let score = 0;

    for (const kw of keywords.high_confidence) {
      if (text.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    for (const kw of keywords.medium_confidence) {
      if (text.includes(kw.toLowerCase())) {
        score += 1;
      }
    }

    scores[lens] = score;
  }

  // Preferred voice bonus
  const preferred = isPreferredVoice(article.author || '') ||
                    isPreferredVoice(article.source_name || '') ||
                    isPreferredVoice(feedConfig?.author || '');
  if (preferred) {
    // Boost the feed's native lens
    const nativeLens = feedConfig?.lens;
    if (nativeLens && scores[nativeLens] !== undefined) {
      scores[nativeLens] += 5;
    }
  }

  // Determine primary and secondary lens
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let primaryLens = sorted[0][1] > 0 ? sorted[0][0] : (feedConfig?.lens || null);
  let secondaryLens = null;

  if (sorted.length > 1 && sorted[1][1] > 0) {
    const primaryScore = sorted[0][1];
    const secondaryScore = sorted[1][1];
    if (secondaryScore >= primaryScore * 0.5) {
      secondaryLens = sorted[1][0];
    }
  }

  // If no keywords matched, fall back to feed's declared lens
  if (!primaryLens && feedConfig?.lens) {
    primaryLens = feedConfig.lens;
  }

  // Extract topic tags
  const tags = extractTags(text);

  return {
    lens: primaryLens,
    secondary_lens: secondaryLens,
    is_preferred_voice: preferred ? 1 : 0,
    tags: JSON.stringify(tags),
  };
}

function extractTags(text) {
  const tags = new Set();

  // Check all keywords across all lenses for tag extraction
  for (const [, keywords] of Object.entries(LENS_KEYWORDS)) {
    for (const kw of keywords.high_confidence) {
      if (text.includes(kw.toLowerCase())) {
        tags.add(kw.toLowerCase());
      }
    }
  }

  // Limit to top 10 tags
  return [...tags].slice(0, 10);
}
