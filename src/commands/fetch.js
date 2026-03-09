import chalk from 'chalk';
import ora from 'ora';
import { FEED_REGISTRY, getFeedsByLens, getPreferredFeeds } from '../feeds/registry.js';
import { parseFeed } from '../feeds/parser.js';
import { deduplicateItems } from '../feeds/deduplicator.js';
import { tagArticle } from '../intelligence/tagger.js';
import { scoreArticle } from '../intelligence/scorer.js';
import { insertArticles, upsertSource, ensureMigrated } from '../storage/db.js';
import { LENS_NAMES } from '../config/constants.js';

export async function fetchCommand(options = {}) {
  const { lens, preferredOnly } = options;

  let feeds;
  if (preferredOnly) {
    feeds = getPreferredFeeds();
    console.log(chalk.yellow(`\nFetching ${feeds.length} preferred voice feeds...\n`));
  } else if (lens) {
    feeds = getFeedsByLens(lens);
    console.log(chalk.yellow(`\nFetching ${feeds.length} feeds for ${LENS_NAMES[lens] || lens}...\n`));
  } else {
    feeds = FEED_REGISTRY;
    console.log(chalk.yellow(`\nFetching ${feeds.length} feeds across all lenses...\n`));
  }

  let totalNew = 0;
  let totalPreferred = 0;
  let successCount = 0;
  let failCount = 0;
  const failures = [];

  const spinner = ora('Starting feed fetch...').start();

  // Process feeds in batches of 5 to avoid overwhelming network
  const batchSize = 5;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(feeds.length / batchSize);
    spinner.text = `Batch ${batchNum}/${totalBatches} — fetching ${batch.map((f) => f.name).join(', ')}`;

    const results = await Promise.allSettled(
      batch.map((feed) => fetchSingleFeed(feed))
    );

    for (let j = 0; j < results.length; j++) {
      const feed = batch[j];
      const result = results[j];

      if (result.status === 'fulfilled' && result.value) {
        const { newCount, preferredCount } = result.value;
        totalNew += newCount;
        totalPreferred += preferredCount;
        successCount++;

        await upsertSource({
          name: feed.name,
          feed_url: feed.url,
          lens: feed.lens,
          source_type: feed.type,
          priority: feed.priority,
          last_fetched: new Date().toISOString(),
          last_success: true,
          new_articles: newCount,
        });
      } else {
        failCount++;
        const reason = result.status === 'rejected'
          ? result.reason?.message || 'Unknown error'
          : 'No data returned';
        failures.push({ name: feed.name, url: feed.url, reason });

        await upsertSource({
          name: feed.name,
          feed_url: feed.url,
          lens: feed.lens,
          source_type: feed.type,
          priority: feed.priority,
          last_fetched: new Date().toISOString(),
          last_success: false,
          new_articles: 0,
        });
      }
    }
  }

  spinner.stop();

  // Summary
  console.log(chalk.green.bold(`\n✓ Fetch complete`));
  console.log(chalk.white(`  New articles: ${totalNew}`));
  console.log(chalk.white(`  From preferred voices: ${totalPreferred}`));
  console.log(chalk.white(`  Feeds succeeded: ${successCount}/${feeds.length}`));

  if (failCount > 0) {
    console.log(chalk.red(`  Feeds failed: ${failCount}`));
    if (failures.length <= 10) {
      for (const f of failures) {
        console.log(chalk.gray(`    ✗ ${f.name}: ${f.reason}`));
      }
    } else {
      for (const f of failures.slice(0, 5)) {
        console.log(chalk.gray(`    ✗ ${f.name}: ${f.reason}`));
      }
      console.log(chalk.gray(`    ...and ${failures.length - 5} more`));
    }
  }

  return { totalNew, totalPreferred, successCount, failCount };
}

/**
 * Headless fetch for web/cron — no spinners or console output.
 */
export async function fetchHeadless() {
  await ensureMigrated();
  const feeds = FEED_REGISTRY;

  let totalNew = 0;
  let totalPreferred = 0;
  let successCount = 0;

  const batchSize = 5;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((feed) => fetchSingleFeed(feed))
    );

    for (let j = 0; j < results.length; j++) {
      const feed = batch[j];
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        totalNew += result.value.newCount;
        totalPreferred += result.value.preferredCount;
        successCount++;
        await upsertSource({
          name: feed.name, feed_url: feed.url, lens: feed.lens,
          source_type: feed.type, priority: feed.priority,
          last_fetched: new Date().toISOString(), last_success: true,
          new_articles: result.value.newCount,
        });
      } else {
        await upsertSource({
          name: feed.name, feed_url: feed.url, lens: feed.lens,
          source_type: feed.type, priority: feed.priority,
          last_fetched: new Date().toISOString(), last_success: false,
          new_articles: 0,
        });
      }
    }
  }

  return { totalNew, totalPreferred, successCount, totalFeeds: feeds.length };
}

async function fetchSingleFeed(feedConfig) {
  const result = await parseFeed(feedConfig);

  if (!result || !result.items || result.items.length === 0) {
    return { newCount: 0, preferredCount: 0 };
  }

  // Deduplicate
  const unique = await deduplicateItems(result.items);

  if (unique.length === 0) {
    return { newCount: 0, preferredCount: 0 };
  }

  // Tag and score each article
  const processed = unique.map((item) => {
    const tagResult = tagArticle(item, feedConfig);
    const article = {
      ...item,
      ...tagResult,
      summary: null,
      status: 'unread',
      used_for: null,
    };
    article.relevance_score = scoreArticle(article, feedConfig);
    return article;
  });

  // Insert into database
  const inserted = await insertArticles(processed);
  const preferredCount = processed.filter((a) => a.is_preferred_voice).length;

  return { newCount: inserted, preferredCount };
}
