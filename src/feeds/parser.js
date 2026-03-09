import RssParser from 'rss-parser';
import { FETCH_TIMEOUT_MS, MAX_ARTICLES_PER_FEED } from '../config/constants.js';

const parser = new RssParser({
  timeout: FETCH_TIMEOUT_MS,
  maxRedirects: 3,
  headers: {
    'User-Agent': 'CPOIntelHub/1.0 (RSS Reader)',
    Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
  },
  customFields: {
    item: [['dc:creator', 'dcCreator'], ['content:encoded', 'contentEncoded']],
  },
});

export async function parseFeed(feedConfig) {
  const feed = await parser.parseURL(feedConfig.url);

  const items = (feed.items || []).slice(0, MAX_ARTICLES_PER_FEED).map((item) => {
    const snippet = extractSnippet(item);
    return {
      source_name: feedConfig.name,
      source_url: feedConfig.url,
      title: cleanText(item.title || 'Untitled'),
      link: item.link || item.guid || '',
      published_at: item.isoDate || item.pubDate || null,
      content_snippet: snippet,
      author: item.creator || item.dcCreator || item.author || feedConfig.author || null,
      raw_content: item.contentEncoded || item.content || item.contentSnippet || '',
    };
  });

  return {
    feedTitle: feed.title,
    items: items.filter((i) => i.link),
  };
}

function extractSnippet(item) {
  const raw = item.contentSnippet || item.content || item.contentEncoded || item.summary || '';
  const text = stripHtml(raw);
  return text.slice(0, 500);
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}
