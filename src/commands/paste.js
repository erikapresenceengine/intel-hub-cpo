import chalk from 'chalk';
import { createInterface } from 'readline';
import { tagArticle } from '../intelligence/tagger.js';
import { scoreArticle } from '../intelligence/scorer.js';
import { insertPaste } from '../storage/db.js';
import { isPreferredVoice, getPreferredVoiceName } from '../config/preferredVoices.js';
import { LENS_NAMES } from '../config/constants.js';
import { summarizeArticle, isAvailable } from '../intelligence/summarizer.js';

export async function pasteCommand(options = {}) {
  const { author, stdin: useStdin } = options;

  if (useStdin) {
    // Read from stdin pipe
    const content = await readStdin();
    if (!content.trim()) {
      console.log(chalk.red('No content received from stdin.'));
      return;
    }
    await processPaste(content, author || 'Unknown');
    return;
  }

  // Interactive mode
  let continueLoop = true;
  while (continueLoop) {
    const content = await promptMultiline('📋 Paste LinkedIn post content (press Enter twice to submit):');
    if (!content.trim()) {
      console.log(chalk.gray('No content pasted. Exiting.'));
      break;
    }

    const authorName = author || await promptLine('👤 Author name: ');
    if (!authorName.trim()) {
      console.log(chalk.gray('No author provided. Skipping.'));
      continue;
    }

    await processPaste(content, authorName);

    const again = await promptLine('\nPaste another? (y/n): ');
    continueLoop = again.toLowerCase().startsWith('y');
  }
}

async function processPaste(content, authorName) {
  // Build a pseudo-article for the tagger
  const pseudoArticle = {
    title: content.slice(0, 100),
    content_snippet: content,
    source_name: `LinkedIn (${authorName})`,
    author: authorName,
  };

  const tagResult = tagArticle(pseudoArticle, null);
  const preferred = isPreferredVoice(authorName);
  const preferredName = getPreferredVoiceName(authorName);

  const paste = {
    author_name: authorName,
    author_linkedin: null,
    content,
    summary: null,
    lens: tagResult.lens,
    secondary_lens: tagResult.secondary_lens,
    relevance_score: 0,
    is_preferred_voice: preferred ? 1 : 0,
    tags: tagResult.tags,
    status: 'unread',
  };

  // Score it
  paste.relevance_score = scoreArticle(
    { ...paste, title: content.slice(0, 100), content_snippet: content },
    { priority: preferred ? 'preferred' : 'normal' }
  );

  // Optional AI summarization
  const aiAvailable = await isAvailable();
  if (aiAvailable) {
    const summary = await summarizeArticle({
      title: `LinkedIn post by ${authorName}`,
      source_name: 'LinkedIn',
      content_snippet: content.slice(0, 1000),
    });
    if (summary) paste.summary = summary;
  }

  const result = await insertPaste(paste);

  // Output
  const tags = JSON.parse(tagResult.tags || '[]');
  console.log(chalk.green(`\n🏷️  Auto-tagged: ${paste.lens ? LENS_NAMES[paste.lens] || paste.lens : 'Untagged'}`));
  if (tags.length > 0) {
    console.log(chalk.cyan(`🔑 Topics: ${tags.join(', ')}`));
  }
  console.log(chalk.yellow(`⭐ Preferred voice: ${preferred ? `YES (${preferredName})` : 'No'}`));
  console.log(chalk.green(`💾 Saved! (ID: ${result.lastInsertRowid})`));
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function promptLine(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function promptMultiline(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(question);
    let lines = [];
    let emptyCount = 0;

    rl.on('line', (line) => {
      if (line === '') {
        emptyCount++;
        if (emptyCount >= 2) {
          rl.close();
          resolve(lines.join('\n'));
          return;
        }
      } else {
        // If we had one empty line followed by content, add the empty line back
        if (emptyCount === 1) {
          lines.push('');
        }
        emptyCount = 0;
        lines.push(line);
      }
    });

    rl.on('close', () => {
      resolve(lines.join('\n'));
    });
  });
}
