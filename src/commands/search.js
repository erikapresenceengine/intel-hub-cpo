import chalk from 'chalk';
import { searchArticles, searchPastes } from '../storage/db.js';
import { LENS_NAMES } from '../config/constants.js';

export async function searchCommand(query, options = {}) {
  const { lens, preferred, status, days, linkedin } = options;

  if (linkedin !== undefined) {
    // Search LinkedIn pastes
    const searchQuery = typeof linkedin === 'string' ? linkedin : query;
    const pastes = await searchPastes({
      query: searchQuery,
      lens,
      preferredOnly: preferred,
      days,
    });

    if (pastes.length === 0) {
      console.log(chalk.gray('\nNo LinkedIn pastes found matching your criteria.'));
      return;
    }

    console.log(chalk.yellow(`\n📋 LinkedIn Pastes (${pastes.length} results)\n`));

    for (const p of pastes) {
      const lensName = p.lens ? LENS_NAMES[p.lens] || p.lens : 'Untagged';
      const preferredTag = p.is_preferred_voice ? chalk.red(' ⭐') : '';
      const snippet = (p.summary || p.content || '').slice(0, 150).replace(/\n/g, ' ');

      console.log(chalk.white.bold(`  [${p.id}] ${p.author_name}`) + preferredTag);
      console.log(chalk.gray(`      ${lensName} | ${new Date(p.pasted_at).toLocaleDateString()}`));
      console.log(chalk.gray(`      ${snippet}`));
      console.log('');
    }
    return;
  }

  // Search articles
  const articles = await searchArticles({
    query,
    lens,
    preferredOnly: preferred,
    status,
    days,
  });

  if (articles.length === 0) {
    console.log(chalk.gray('\nNo articles found matching your criteria.'));
    return;
  }

  console.log(chalk.yellow(`\n📰 Articles (${articles.length} results)\n`));

  for (const a of articles) {
    const lensName = a.lens ? LENS_NAMES[a.lens] || a.lens : 'Untagged';
    const preferredTag = a.is_preferred_voice ? chalk.red(' ⭐') : '';
    const statusTag = a.status === 'flagged' ? chalk.magenta(' 🚩') : '';
    const score = chalk.cyan(`[${a.relevance_score || 0}/10]`);
    const snippet = (a.summary || a.content_snippet || '').slice(0, 120).replace(/\n/g, ' ');

    console.log(chalk.white.bold(`  [${a.id}] ${a.title}`) + preferredTag + statusTag);
    console.log(chalk.gray(`      ${a.source_name} | ${lensName} | ${score} | ${a.published_at ? new Date(a.published_at).toLocaleDateString() : 'No date'}`));
    if (snippet) console.log(chalk.gray(`      ${snippet}`));
    if (a.link) console.log(chalk.blue(`      ${a.link}`));
    console.log('');
  }
}
