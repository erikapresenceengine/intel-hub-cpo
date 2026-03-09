import { getArticleByLink } from '../storage/db.js';

export async function deduplicateItems(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const normalizedLink = normalizeUrl(item.link);
    if (seen.has(normalizedLink)) continue;

    const existing = await getArticleByLink(item.link);
    if (existing) {
      seen.add(normalizedLink);
      continue;
    }

    seen.add(normalizedLink);
    unique.push(item);
  }

  return unique;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    // Remove common tracking parameters
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('utm_content');
    u.searchParams.delete('utm_term');
    u.searchParams.delete('ref');
    return u.toString();
  } catch {
    return url;
  }
}
