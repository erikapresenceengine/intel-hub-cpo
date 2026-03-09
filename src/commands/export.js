import chalk from 'chalk';
import dayjs from 'dayjs';
import { writeFileSync, mkdirSync } from 'fs';
import { getFlaggedArticles, getRecentBriefs, getArticleById, flagArticle, updateArticleStatus } from '../storage/db.js';
import { LENS_NAMES, BRIEFS_DIR, USED_FOR } from '../config/constants.js';

export async function flagCommand(id, options = {}) {
  const { for: usedFor } = options;

  if (!id) {
    console.log(chalk.red('Please provide an article ID. Usage: cpo-intel flag <id> --for <purpose>'));
    return;
  }

  const article = await getArticleById(parseInt(id, 10));
  if (!article) {
    console.log(chalk.red(`Article with ID ${id} not found.`));
    return;
  }

  const validPurposes = Object.values(USED_FOR);
  if (usedFor && !validPurposes.includes(usedFor)) {
    console.log(chalk.red(`Invalid purpose. Choose from: ${validPurposes.join(', ')}`));
    return;
  }

  await flagArticle(parseInt(id, 10), usedFor || null);

  const purposeLabel = usedFor ? ` for ${usedFor.replace(/_/g, ' ')}` : '';
  console.log(chalk.green(`\n🚩 Flagged article [${id}]: "${article.title}"${purposeLabel}`));
}

export async function exportCommand(options = {}) {
  const { for: usedFor, briefs, week } = options;

  if (briefs) {
    await exportBriefs(week);
    return;
  }

  if (usedFor) {
    await exportFlagged(usedFor);
    return;
  }

  // Default: export all flagged
  await exportFlagged();
}

async function exportFlagged(usedFor = null) {
  const articles = await getFlaggedArticles(usedFor);

  if (articles.length === 0) {
    const filter = usedFor ? ` for "${usedFor.replace(/_/g, ' ')}"` : '';
    console.log(chalk.gray(`\nNo flagged articles found${filter}.`));
    console.log(chalk.gray('Use "cpo-intel flag <id> --for <purpose>" to flag articles.'));
    return;
  }

  const label = usedFor ? usedFor.replace(/_/g, ' ') : 'all purposes';
  console.log(chalk.yellow(`\n📤 Flagged Content — ${label} (${articles.length} items)\n`));

  let md = `# Flagged Content Export — ${label}\n`;
  md += `*Generated ${dayjs().format('MMMM D, YYYY')}*\n\n`;

  for (const a of articles) {
    const lensName = a.lens ? LENS_NAMES[a.lens] || a.lens : '';
    md += `## ${a.title}\n`;
    md += `- **Source:** ${a.source_name}\n`;
    md += `- **Lens:** ${lensName}\n`;
    md += `- **Link:** ${a.link}\n`;
    if (a.author) md += `- **Author:** ${a.author}\n`;
    if (a.summary) md += `- **Summary:** ${a.summary}\n`;
    if (a.content_snippet) md += `\n> ${a.content_snippet.slice(0, 300)}\n`;
    md += `\n---\n\n`;

    // Print to terminal
    const preferredTag = a.is_preferred_voice ? chalk.red(' ⭐') : '';
    console.log(chalk.white.bold(`  [${a.id}] ${a.title}`) + preferredTag);
    console.log(chalk.gray(`      ${a.source_name} | ${lensName}`));
    if (a.summary) console.log(chalk.gray(`      ${a.summary}`));
    console.log(chalk.blue(`      ${a.link}`));
    console.log('');
  }

  // Save to file
  const filename = usedFor ? `export-${usedFor}-${dayjs().format('YYYY-MM-DD')}.md` : `export-all-${dayjs().format('YYYY-MM-DD')}.md`;
  mkdirSync(BRIEFS_DIR, { recursive: true });
  const filePath = `${BRIEFS_DIR}${filename}`;
  writeFileSync(filePath, md);
  console.log(chalk.green(`✓ Exported to ${filePath}`));
}

async function exportBriefs(week = false) {
  const limit = week ? 7 : 30;
  const recentBriefs = await getRecentBriefs(limit);

  if (recentBriefs.length === 0) {
    console.log(chalk.gray('\nNo briefs found. Run "cpo-intel brief" to generate one.'));
    return;
  }

  console.log(chalk.yellow(`\n📰 Recent Briefs (${recentBriefs.length})\n`));

  for (const b of recentBriefs) {
    console.log(chalk.white.bold(`  ${b.brief_date}`));
    console.log(chalk.gray(`      Articles: ${b.article_count} | Pastes: ${b.paste_count}`));
    console.log('');
  }
}
