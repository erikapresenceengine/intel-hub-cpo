export const PREFERRED_VOICES = [
  {
    name: 'Josh Bersin',
    aliases: ['josh bersin', 'bersin', 'josh bersin academy'],
    relevance: 'THE authority on HR technology, people analytics, and the future of HR operating models. His frameworks shape how CHROs think about skills-based orgs and AI in HR.',
    watchFor: ['HR technology', 'skills-based', 'HR operating model', 'people analytics', 'talent marketplace', 'systemic HR'],
    responseStyle: 'Data-driven practitioner — reference his research with your own implementation angle. Add the medtech workforce context he rarely covers.',
  },
  {
    name: 'David Green',
    aliases: ['david green', 'digital hr leaders', 'myhrfuture'],
    relevance: 'Leading voice in people analytics and data-driven HR. His podcast and writing bridge the gap between analytics theory and practical CHRO application.',
    watchFor: ['people analytics', 'workforce analytics', 'data-driven HR', 'evidence-based HR', 'HR metrics', 'digital HR'],
    responseStyle: 'Analytics peer — connect his data insights to real workforce outcomes. Share how analytics translate to board-level decisions.',
  },
  {
    name: 'Adam Grant',
    aliases: ['adam grant', 'worklife', 'work life'],
    relevance: 'Organizational psychology meets leadership — his research on psychological safety, motivation, and rethinking shapes how modern CPOs build culture.',
    watchFor: ['organizational psychology', 'rethinking', 'give and take', 'work culture', 'psychological safety', 'motivation', 'hidden potential'],
    responseStyle: 'Thoughtful engager — agree AND extend. Add the CPO implementation angle that his academic perspective sometimes misses.',
  },
  {
    name: 'Lars Schmidt',
    aliases: ['lars schmidt', 'redefining work', 'amplify talent'],
    relevance: 'Future of work practitioner who understands modern people practices, progressive policies, and how high-growth companies architect HR around flexibility and technology.',
    watchFor: ['future of work', 'modern HR', 'progressive HR', 'employer brand', 'talent strategy', 'redefining work'],
    responseStyle: 'Fellow operator — share implementation stories from your context. Connect his startup/tech world insights to enterprise and medtech realities.',
  },
  {
    name: 'Laszlo Bock',
    aliases: ['laszlo bock', 'humu'],
    relevance: 'Former Google SVP of People Operations — built one of the most data-driven people functions in history. His nudge-based approach to manager effectiveness is foundational.',
    watchFor: ['people operations', 'nudge', 'behavioral science HR', 'manager effectiveness', 'Google HR', 'work rules'],
    responseStyle: 'Student of his system — reference Work Rules with your own scale-down for non-Google contexts. Focus on what\'s actionable at your org size.',
  },
  {
    name: 'Amy Edmondson',
    aliases: ['amy edmondson', 'psychological safety'],
    relevance: 'Harvard professor who literally defined psychological safety. Essential reading for any CPO building high-performing, learning-oriented cultures.',
    watchFor: ['psychological safety', 'fearless organization', 'learning culture', 'team effectiveness', 'right kind of wrong'],
    responseStyle: 'Practitioner applying her research — share how psychological safety frameworks play out in real teams, especially in high-stakes environments like healthcare and medtech.',
  },
  {
    name: 'Heather McGowan',
    aliases: ['heather mcgowan', 'future of work'],
    relevance: 'Future of work strategist focused on the skills economy, continuous learning, and how work itself is being redesigned. Essential for workforce planning perspectives.',
    watchFor: ['future of work', 'skills economy', 'continuous learning', 'adaptation', 'work redesign', 'human capability'],
    responseStyle: 'Strategic thinker — translate her macro trends into tactical workforce planning decisions. Bridge the gap between her vision and quarterly people plans.',
  },
];

export function isPreferredVoice(authorOrSource) {
  if (!authorOrSource) return false;
  const lower = authorOrSource.toLowerCase();
  return PREFERRED_VOICES.some(
    (voice) =>
      voice.aliases.some((alias) => lower.includes(alias))
  );
}

export function getPreferredVoiceName(authorOrSource) {
  if (!authorOrSource) return null;
  const lower = authorOrSource.toLowerCase();
  const match = PREFERRED_VOICES.find(
    (voice) => voice.aliases.some((alias) => lower.includes(alias))
  );
  return match ? match.name : null;
}

/**
 * Get the full voice profile for a preferred voice by name.
 * Used by voice briefings and response generation.
 */
export function getVoiceProfile(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return PREFERRED_VOICES.find(
    (voice) => voice.name.toLowerCase() === lower ||
      voice.aliases.some((alias) => lower.includes(alias))
  ) || null;
}
