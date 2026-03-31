import { readFileSync, writeFileSync, readdirSync } from 'fs';

// Parse the DB result file (double-escaped JSON)
const wrapper = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const inner = JSON.parse(wrapper[0].text); // {result: "..."}
const text = inner.result;

// Extract JSON from untrusted-data tags
const match = text.match(/\[[\s\S]*\]/);
const result = JSON.parse(match[0]);

// Existing episodes + candidates
const episodeDir = 'sw/remotion/episodes/book-recommend';
const candidateDir = episodeDir + '/candidates';

const episodes = readdirSync(episodeDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', '').replace(/-en$/, '').replace(/-2$/, ''));

const candidates = readdirSync(candidateDir)
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', '').replace(/-2$/, ''));

const existing = new Set([...episodes, ...candidates]);

const missing = result.filter(r => !existing.has(r.slug));

console.log(`DB total: ${result.length}`);
console.log(`Existing (episode+candidate): ${result.length - missing.length}`);
console.log(`Missing: ${missing.length}`);

const b1 = missing.filter(r => r.books_with_review == 1).length;
const b2 = missing.filter(r => r.books_with_review == 2).length;
const b35 = missing.filter(r => r.books_with_review >= 3 && r.books_with_review <= 5).length;
const b610 = missing.filter(r => r.books_with_review >= 6 && r.books_with_review <= 10).length;
const b11 = missing.filter(r => r.books_with_review >= 11).length;
console.log(`1권:${b1} | 2권:${b2} | 3~5권:${b35} | 6~10권:${b610} | 11+:${b11}`);

const sorted = missing.sort((a, b) => b.books_with_review - a.books_with_review);
const lines = sorted.map(r => `${r.slug}\t${r.nickname_en}\t${r.books_with_review}`);
writeFileSync('missing-celebs.txt', lines.join('\n'), 'utf8');
console.log(`\nSaved to missing-celebs.txt`);
console.log(`\n--- Top 30 ---`);
lines.slice(0, 30).forEach(l => console.log(l));
