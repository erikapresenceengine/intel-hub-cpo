import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const APP_NAME = 'CPO Intel Hub';
export const DB_PATH = join(__dirname, '..', '..', 'data', 'intel-hub-cpo.db');
export const BRIEFS_DIR = join(__dirname, '..', '..', 'output', 'briefs');

export const ARTICLE_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  FLAGGED: 'flagged',
  USED: 'used',
};

export const USED_FOR = {
  BOARD_DECK: 'board_deck',
  ALL_HANDS: 'all_hands',
  MANAGER_TOOLKIT: 'manager_toolkit',
  EXEC_BRIEF: 'exec_brief',
};

export const LENS_NAMES = {
  workforce_ai: 'Workforce AI',
  productivity: 'Productivity & Efficiency',
  people_strategy: 'People Strategy',
  leadership: 'Leadership & Culture',
};

export const LENS_EMOJI = {
  workforce_ai: '\u{1F916}',
  productivity: '\u{26A1}',
  people_strategy: '\u{1F3AF}',
  leadership: '\u{1F3C6}',
};

export const PRIORITY_LEVELS = {
  PREFERRED: 'preferred',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
};

export const FETCH_TIMEOUT_MS = 10000;
export const MAX_ARTICLES_PER_FEED = 50;
