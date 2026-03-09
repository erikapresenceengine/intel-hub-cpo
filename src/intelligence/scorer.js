import { LENS_KEYWORDS } from '../config/lenses.js';

export function scoreArticle(article, feedConfig) {
  let score = 0;

  const text = `${article.title} ${article.content_snippet || ''}`.toLowerCase();

  // Preferred voice = high relevance
  if (article.is_preferred_voice) {
    score += 5;
  }

  // Feed priority bonus
  const priority = feedConfig?.priority || 'normal';
  if (priority === 'preferred') score += 4;
  else if (priority === 'high') score += 2;
  else if (priority === 'normal') score += 1;
  else if (priority === 'low') score += 0;

  // Keyword density in the primary lens
  const lens = article.lens;
  if (lens && LENS_KEYWORDS[lens]) {
    const highHits = LENS_KEYWORDS[lens].high_confidence.filter(
      (kw) => text.includes(kw.toLowerCase())
    ).length;
    score += Math.min(highHits, 3); // Cap keyword bonus at 3
  }

  // Title-only bonus: high-confidence keywords in the title are extra relevant
  const titleLower = (article.title || '').toLowerCase();
  for (const [, keywords] of Object.entries(LENS_KEYWORDS)) {
    for (const kw of keywords.high_confidence) {
      if (titleLower.includes(kw.toLowerCase())) {
        score += 1;
        break; // Only one bonus per lens
      }
    }
  }

  // Clamp to 1-10
  return Math.max(1, Math.min(10, score));
}
