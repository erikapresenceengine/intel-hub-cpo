import chalk from 'chalk';
import dayjs from 'dayjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BRIEFS_DIR } from '../config/constants.js';
import { getRecentArticles, getRecentPastes, insertBrief } from '../storage/db.js';
import { generateBrief } from '../intelligence/briefGenerator.js';
import { summarizeArticles, isAvailable } from '../intelligence/summarizer.js';

export async function briefCommand(options = {}) {
  const { date, summarize } = options;
  const briefDate = date || dayjs().format('YYYY-MM-DD');

  console.log(chalk.yellow(`\n🧠 Generating CPO intel brief for ${briefDate}...\n`));

  // Get recent articles (last 24 hours)
  const articles = await getRecentArticles({ hours: 24 });
  const pastes = await getRecentPastes({ hours: 24 });

  if (articles.length === 0 && pastes.length === 0) {
    console.log(chalk.gray('No new articles or pastes in the last 24 hours.'));
    console.log(chalk.gray('Run "cpo-intel fetch" first to pull RSS feeds.'));
    return;
  }

  let processedArticles = articles;

  // Optional summarization via Claude API
  if (summarize) {
    const available = await isAvailable();
    if (available) {
      console.log(chalk.cyan('Summarizing top articles with Claude API...'));
      processedArticles = await summarizeArticles(articles);
      console.log(chalk.green('✓ Summarization complete'));
    } else {
      console.log(chalk.gray('Claude API not available (no ANTHROPIC_API_KEY). Skipping summarization.'));
    }
  }

  // Generate the markdown brief
  const brief = generateBrief(processedArticles, pastes, briefDate);

  // Save markdown brief
  mkdirSync(BRIEFS_DIR, { recursive: true });
  const mdPath = join(BRIEFS_DIR, `brief-${briefDate}.md`);
  writeFileSync(mdPath, brief.content);

  // Save to database
  await insertBrief(brief);

  // Print summary to terminal
  console.log(chalk.cyan(`\n📊 ${processedArticles.length} articles scanned · ${processedArticles.filter(a => a.is_preferred_voice).length} preferred voices`));
  console.log(chalk.green(`\n✓ Markdown brief saved to ${mdPath}\n`));
}
