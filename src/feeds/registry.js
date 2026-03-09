// ============================================================================
// CPO Intel Hub — Feed Registry
//
// All URLs verified via curl/validate as of March 2026.
// Feeds organized by tier: preferred (boosted scoring), high, normal, low
// ============================================================================

const LENS_1_WORKFORCE_AI = [
  // === TIER 1: Core HR Tech ===
  { name: 'Josh Bersin Blog', url: 'https://joshbersin.com/feed/', lens: 'workforce_ai', priority: 'high', type: 'rss' },
  { name: 'Josh Bersin Substack', url: 'https://joshbersin.substack.com/feed', lens: 'workforce_ai', priority: 'normal', type: 'substack' },
  { name: 'HR Dive', url: 'https://www.hrdive.com/feeds/news/', lens: 'workforce_ai', priority: 'high', type: 'rss' },
  { name: 'HR Executive', url: 'https://hrexecutive.com/feed/', lens: 'workforce_ai', priority: 'high', type: 'rss' },

  // === TIER 2: HR Tech Platforms ===
  { name: 'Eightfold AI Blog', url: 'https://eightfold.ai/blog/feed/', lens: 'workforce_ai', priority: 'normal', type: 'rss' },
  { name: 'AIHR Blog', url: 'https://www.aihr.com/blog/feed/', lens: 'workforce_ai', priority: 'normal', type: 'rss' },
  { name: 'ADP Research', url: 'https://www.adpresearch.com/feed/', lens: 'workforce_ai', priority: 'normal', type: 'rss' },
  { name: 'Factorial HR Blog', url: 'https://factorialhr.com/blog/feed/', lens: 'workforce_ai', priority: 'normal', type: 'rss' },
  { name: 'HR Morning', url: 'https://www.hrmorning.com/feed/', lens: 'workforce_ai', priority: 'normal', type: 'rss' },

  // === Podcasts ===
  { name: 'Gartner ThinkCast', url: 'https://rss.libsyn.com/shows/113684/destinations/639641.xml', lens: 'workforce_ai', priority: 'normal', type: 'podcast' },
];

const LENS_2_PRODUCTIVITY = [
  // === TIER 1: Future of Work ===
  { name: 'Charter', url: 'https://www.charterworks.com/rss/', lens: 'productivity', priority: 'high', type: 'rss' },
  { name: 'MIT Sloan Management Review', url: 'https://sloanreview.mit.edu/feed/', lens: 'productivity', priority: 'high', type: 'rss' },
  { name: 'HBR', url: 'http://feeds.hbr.org/harvardbusiness', lens: 'productivity', priority: 'high', type: 'rss' },
  { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', lens: 'productivity', priority: 'high', type: 'rss' },

  // === TIER 2: Work Design + Collaboration ===
  { name: 'Oyster HR Blog', url: 'https://www.oysterhr.com/library/rss.xml', lens: 'productivity', priority: 'normal', type: 'rss' },
  { name: 'Future Forum', url: 'https://futureforum.com/feed/', lens: 'productivity', priority: 'normal', type: 'rss' },

  // === TIER 3: Behavioral Science ===
  { name: 'Behavioral Scientist', url: 'https://behavioralscientist.org/feed/', lens: 'productivity', priority: 'normal', type: 'rss' },
  { name: 'James Clear 3-2-1', url: 'https://jamesclear.com/feed', lens: 'productivity', priority: 'normal', type: 'rss' },

  // === Podcasts ===
  { name: 'WorkLife Adam Grant', url: 'https://feeds.acast.com/public/shows/67585d9cc705e441796ddaf6', lens: 'productivity', priority: 'high', type: 'podcast' },
  { name: 'Hidden Brain', url: 'https://feeds.simplecast.com/kwWc0lhf', lens: 'productivity', priority: 'normal', type: 'podcast' },
];

const LENS_3_PEOPLE_STRATEGY = [
  // === TIER 1: Strategic HR ===
  { name: 'Wharton People Analytics', url: 'https://ai-analytics.wharton.upenn.edu/feed/', lens: 'people_strategy', priority: 'high', type: 'rss' },

  // === TIER 2: Talent Platforms ===
  { name: 'Lever Blog', url: 'https://www.lever.co/blog/feed/', lens: 'people_strategy', priority: 'normal', type: 'rss' },

  // === Newsletters ===
  { name: 'Recruiting Brainfood (Hung Lee)', url: 'https://brainfood.substack.com/feed', lens: 'people_strategy', priority: 'normal', type: 'substack' },
  { name: 'WorkTech (George LaRocque)', url: 'https://worktech.substack.com/feed', lens: 'people_strategy', priority: 'normal', type: 'substack' },
  { name: 'Redefining Work Newsletter (Lars Schmidt)', url: 'https://redefiningwork.substack.com/feed', lens: 'people_strategy', priority: 'high', type: 'substack' },
  { name: "Lenny's Newsletter", url: 'https://www.lennysnewsletter.com/feed', lens: 'people_strategy', priority: 'normal', type: 'substack' },
];

const LENS_4_LEADERSHIP = [
  // === TIER 1: Leadership & Culture ===
  { name: 'CCL Blog', url: 'https://www.ccl.org/articles/feed/', lens: 'leadership', priority: 'high', type: 'rss' },
  { name: 'Greater Good Science Center', url: 'https://greatergood.berkeley.edu/site/rss/all', lens: 'leadership', priority: 'normal', type: 'rss' },
  { name: 'Lencioni / Table Group Blog', url: 'https://www.tablegroup.com/blog/feed/', lens: 'leadership', priority: 'normal', type: 'rss' },

  // === Podcasts ===
  { name: 'HR Happy Hour', url: 'https://feeds.feedburner.com/hrhappyhour', lens: 'leadership', priority: 'normal', type: 'podcast' },
  { name: 'HBR IdeaCast', url: 'http://feeds.harvardbusiness.org/harvardbusiness/ideacast', lens: 'leadership', priority: 'normal', type: 'podcast' },
];

const PREFERRED_VOICE_FEEDS = [
  // Josh Bersin — preferred on his main blog
  { name: 'Josh Bersin (Preferred)', url: 'https://joshbersin.com/feed/', lens: 'workforce_ai', priority: 'preferred', type: 'rss', author: 'Josh Bersin' },

  // Adam Grant — WorkLife podcast
  { name: 'WorkLife with Adam Grant (Preferred)', url: 'https://feeds.acast.com/public/shows/67585d9cc705e441796ddaf6', lens: 'leadership', priority: 'preferred', type: 'podcast', author: 'Adam Grant' },

  // Lars Schmidt — Redefining Work newsletter
  { name: 'Redefining Work (Preferred)', url: 'https://redefiningwork.substack.com/feed', lens: 'people_strategy', priority: 'preferred', type: 'substack', author: 'Lars Schmidt' },

  // David Green, Amy Edmondson, Laszlo Bock, Heather McGowan — no direct feeds
  // These voices are detected via LinkedIn paste and content matching
];

export const ALL_FEEDS = [
  ...PREFERRED_VOICE_FEEDS,
  ...LENS_1_WORKFORCE_AI,
  ...LENS_2_PRODUCTIVITY,
  ...LENS_3_PEOPLE_STRATEGY,
  ...LENS_4_LEADERSHIP,
];

// Deduplicate by URL (preferred voice feeds take precedence)
const seen = new Set();
export const FEED_REGISTRY = ALL_FEEDS.filter((feed) => {
  if (seen.has(feed.url)) return false;
  seen.add(feed.url);
  return true;
});

export function getFeedsByLens(lens) {
  return FEED_REGISTRY.filter((f) => f.lens === lens);
}

export function getPreferredFeeds() {
  return FEED_REGISTRY.filter((f) => f.priority === 'preferred');
}

export function getFeedCount() {
  return {
    total: FEED_REGISTRY.length,
    preferred: FEED_REGISTRY.filter((f) => f.priority === 'preferred').length,
    byLens: {
      workforce_ai: FEED_REGISTRY.filter((f) => f.lens === 'workforce_ai').length,
      productivity: FEED_REGISTRY.filter((f) => f.lens === 'productivity').length,
      people_strategy: FEED_REGISTRY.filter((f) => f.lens === 'people_strategy').length,
      leadership: FEED_REGISTRY.filter((f) => f.lens === 'leadership').length,
    },
  };
}
