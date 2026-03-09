import { safeClaude, getModel, isAIAvailable } from './claudeClient.js';

/**
 * Article Summarizer
 *
 * Summarizes articles using the shared Claude client.
 * Falls back gracefully when no API key is available.
 */

export async function summarizeArticle(article) {
  const available = await isAIAvailable();
  if (!available) return null;

  const model = getModel('SUMMARIZE_MODEL');

  const text = await safeClaude({
    model,
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Summarize this article in 1-2 sentences for a busy Chief People Officer. Focus on what's actionable for workforce strategy, people analytics, or organizational effectiveness.

Title: ${article.title}
Source: ${article.source_name}
Content: ${article.content_snippet || 'No content available'}`,
      },
    ],
  });

  return text || null;
}

export async function summarizeArticles(articles, maxCount) {
  const available = await isAIAvailable();
  if (!available) return articles;

  const max = maxCount || parseInt(process.env.MAX_SUMMARIZE || '15', 10);
  const toSummarize = articles.slice(0, max);

  const results = [];
  for (const article of toSummarize) {
    const summary = await summarizeArticle(article);
    results.push({ ...article, summary: summary || article.summary });
  }

  // Append any remaining articles without summarization
  return [...results, ...articles.slice(max)];
}

export async function isAvailable() {
  return isAIAvailable();
}
