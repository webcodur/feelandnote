#!/usr/bin/env node

import process from 'node:process';
import { factionRoster, repoRoot, supabaseClient } from './lib.mjs';

const [episode] = process.argv.slice(2);
if (!episode) {
  console.error('usage: node audit-fiction-episode.mjs <episode>');
  process.exit(2);
}

const root = repoRoot();
const roster = factionRoster(root, episode).filter((person) => person.mythical === true);
const slugs = roster.map((person) => person.slug).filter(Boolean);
const db = supabaseClient(root);

const { data, error } = await db
  .from('profiles')
  .select('slug,nickname,nickname_en,profile_type,celeb_tier,status,avatar_url,bio,profession,title,virtual_monologue')
  .in('slug', slugs)
  .order('slug');
if (error) throw error;

const bySlug = new Map((data ?? []).map((profile) => [profile.slug, profile]));
let missing = 0;
let wrongTier = 0;
let missingMonologue = 0;

for (const person of roster) {
  const profile = bySlug.get(person.slug);
  const state = !profile
    ? 'missing'
    : profile.profile_type !== 'CELEB' || profile.celeb_tier !== 'fiction'
      ? 'wrong-tier'
      : !profile.virtual_monologue?.trim()
        ? 'missing-monologue'
        : 'ready';
  if (state === 'missing') missing++;
  if (state === 'wrong-tier') wrongTier++;
  if (state === 'missing-monologue') missingMonologue++;
  console.log(JSON.stringify({
    slug: person.slug,
    name: person.name,
    state,
    avatar: Boolean(profile?.avatar_url),
    monologueLength: profile?.virtual_monologue?.length ?? 0,
    bio: profile?.bio ?? null,
  }));
}

console.log(JSON.stringify({
  episode,
  roster: roster.length,
  existing: roster.length - missing,
  missing,
  wrongTier,
  missingMonologue,
}));
