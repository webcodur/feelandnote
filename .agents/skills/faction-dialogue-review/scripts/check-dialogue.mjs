#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const [episodeOrFile, requestedSlug] = process.argv.slice(2);

if (!episodeOrFile) {
  console.error('usage: node check-dialogue.mjs <episode|faction-data.json> [slug]');
  process.exit(2);
}

const dataPath = episodeOrFile.endsWith('.json')
  ? path.resolve(episodeOrFile)
  : path.resolve('sw', 'remotion', 'public', 'factions', episodeOrFile, 'faction-data.json');

if (!fs.existsSync(dataPath)) {
  console.error(`missing=${dataPath}`);
  process.exit(2);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
  console.error(`invalid_json=${error.message}`);
  process.exit(1);
}

const people = (data.groups ?? []).flatMap((group) =>
  (group.clusters ?? []).flatMap((cluster) => cluster.people ?? []),
);
const scope = requestedSlug
  ? people.filter((person) => person.slug === requestedSlug)
  : people.filter((person) => person.quote);

if (requestedSlug && scope.length === 0) {
  console.error(`unknown_slug=${requestedSlug}`);
  process.exit(2);
}

const errors = [];
for (const person of scope) {
  if (!person.quote) {
    errors.push(`${person.slug}: missing quote`);
    continue;
  }
  const reconstructedQuote = Array.isArray(person.quoteChunks)
    ? person.quoteChunks.map((chunk) => chunk.trim()).filter(Boolean).join(' ')
    : '';
  if (!Array.isArray(person.quoteChunks) || reconstructedQuote !== person.quote) {
    errors.push(`${person.slug}: quoteChunks do not reconstruct quote`);
  }
}

console.log(`file=${dataPath}`);
console.log(`people=${people.length}`);
console.log(`checked=${scope.length}`);
for (const error of errors) console.log(`error=${error}`);
console.log(`errors=${errors.length}`);
process.exit(errors.length === 0 ? 0 : 1);
