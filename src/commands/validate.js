import chalk from 'chalk';
import ora from 'ora';
import { FEED_REGISTRY, getFeedCount } from '../feeds/registry.js';
import { LENS_NAMES } from '../config/constants.js';

const VALIDATE_TIMEOUT_MS = 15000;

export async function validateCommand(options = {}) {
  const { lens } = options;

  let feeds = FEED_REGISTRY;
  if (lens) {
    feeds = feeds.filter((f) => f.lens === lens);
  }

  const counts = getFeedCount();
  console.log(chalk.yellow(`\nValidating ${feeds.length} feed URLs...\n`));

  const results = {
    ok: [],
    redirect: [],
    timeout: [],
    error: [],
  };

  const spinner = ora('Testing feeds...').start();

  // Test feeds in batches of 8
  const batchSize = 8;
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(feeds.length / batchSize);
    spinner.text = `Batch ${batchNum}/${totalBatches} — testing ${batch.length} feeds`;

    const batchResults = await Promise.allSettled(
      batch.map((feed) => testFeed(feed))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const feed = batch[j];
      const result = batchResults[j];

      if (result.status === 'fulfilled') {
        const { status, statusCode, contentType, redirectUrl, itemCount } = result.value;

        if (status === 'ok') {
          results.ok.push({ ...feed, statusCode, contentType, itemCount });
        } else if (status === 'redirect') {
          results.redirect.push({ ...feed, statusCode, redirectUrl });
        } else {
          results.error.push({ ...feed, reason: `HTTP ${statusCode}` });
        }
      } else {
        const reason = result.reason?.message || 'Unknown error';
        if (reason.includes('timeout') || reason.includes('ETIMEDOUT') || reason.includes('ABORT')) {
          results.timeout.push({ ...feed, reason });
        } else {
          results.error.push({ ...feed, reason });
        }
      }
    }
  }

  spinner.stop();

  // === Report ===
  console.log(chalk.green.bold(`\n✓ Validation complete\n`));

  // Summary
  console.log(chalk.white(`  Total feeds tested:  ${feeds.length}`));
  console.log(chalk.green(`  Working:             ${results.ok.length}`));
  console.log(chalk.yellow(`  Redirecting:         ${results.redirect.length}`));
  console.log(chalk.red(`  Failed:              ${results.error.length}`));
  console.log(chalk.gray(`  Timed out:           ${results.timeout.length}`));

  // Working feeds with article counts
  if (results.ok.length > 0) {
    console.log(chalk.green.bold(`\n── Working Feeds (${results.ok.length}) ──`));
    for (const f of results.ok) {
      const items = f.itemCount !== undefined ? chalk.gray(` (${f.itemCount} items)`) : '';
      const lensTag = chalk.cyan(`[${f.lens}]`);
      console.log(`  ${chalk.green('✓')} ${lensTag} ${f.name}${items}`);
    }
  }

  // Redirects
  if (results.redirect.length > 0) {
    console.log(chalk.yellow.bold(`\n── Redirecting Feeds (${results.redirect.length}) ──`));
    for (const f of results.redirect) {
      const lensTag = chalk.cyan(`[${f.lens}]`);
      console.log(`  ${chalk.yellow('→')} ${lensTag} ${f.name}`);
      console.log(chalk.gray(`    From: ${f.url}`));
      if (f.redirectUrl) {
        console.log(chalk.gray(`    To:   ${f.redirectUrl}`));
      }
    }
  }

  // Errors
  if (results.error.length > 0) {
    console.log(chalk.red.bold(`\n── Failed Feeds (${results.error.length}) ──`));
    for (const f of results.error) {
      const lensTag = chalk.cyan(`[${f.lens}]`);
      console.log(`  ${chalk.red('✗')} ${lensTag} ${f.name}: ${f.reason}`);
      console.log(chalk.gray(`    URL: ${f.url}`));
    }
  }

  // Timeouts
  if (results.timeout.length > 0) {
    console.log(chalk.gray.bold(`\n── Timed Out (${results.timeout.length}) ──`));
    for (const f of results.timeout) {
      const lensTag = chalk.cyan(`[${f.lens}]`);
      console.log(`  ${chalk.gray('⏱')} ${lensTag} ${f.name}`);
      console.log(chalk.gray(`    URL: ${f.url}`));
    }
  }

  // Lens breakdown
  console.log(chalk.white.bold(`\n── By Lens ──`));
  for (const [lensKey, lensName] of Object.entries(LENS_NAMES)) {
    const lensFeeds = feeds.filter((f) => f.lens === lensKey);
    const lensOk = results.ok.filter((f) => f.lens === lensKey).length;
    const pct = lensFeeds.length > 0 ? Math.round((lensOk / lensFeeds.length) * 100) : 0;
    const color = pct >= 80 ? chalk.green : pct >= 50 ? chalk.yellow : chalk.red;
    console.log(`  ${lensName}: ${color(`${lensOk}/${lensFeeds.length} (${pct}%)`)}`);
  }

  console.log('');

  return results;
}

async function testFeed(feedConfig) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);

  try {
    // First do a HEAD request to check if URL is reachable
    const headResponse = await fetch(feedConfig.url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'CPOIntelHub/1.0 (RSS Feed Validator)',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    });

    // Check for redirects
    if (headResponse.status >= 300 && headResponse.status < 400) {
      return {
        status: 'redirect',
        statusCode: headResponse.status,
        redirectUrl: headResponse.headers.get('location'),
      };
    }

    // If HEAD succeeded, try a GET to actually parse the feed
    if (headResponse.ok || headResponse.status === 405) {
      const getResponse = await fetch(feedConfig.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'CPOIntelHub/1.0 (RSS Feed Validator)',
          Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        },
      });

      const contentType = getResponse.headers.get('content-type') || '';
      const body = await getResponse.text();

      // Quick check: does it look like XML/RSS?
      const looksLikeFeed = body.includes('<rss') || body.includes('<feed') || body.includes('<channel');
      const itemCount = (body.match(/<item[\s>]/g) || []).length + (body.match(/<entry[\s>]/g) || []).length;

      if (getResponse.ok && looksLikeFeed) {
        return { status: 'ok', statusCode: getResponse.status, contentType, itemCount };
      } else if (getResponse.ok) {
        return { status: 'error', statusCode: getResponse.status, contentType };
      } else {
        return { status: 'error', statusCode: getResponse.status };
      }
    }

    return { status: 'error', statusCode: headResponse.status };
  } finally {
    clearTimeout(timeout);
  }
}
