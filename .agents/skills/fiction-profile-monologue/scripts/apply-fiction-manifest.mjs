#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { factionRoster, repoRoot, supabaseClient } from './lib.mjs';

const [manifestArg] = process.argv.slice(2).filter((arg) => arg !== '--apply');
const apply = process.argv.includes('--apply');
if (!manifestArg) {
  console.error('usage: node apply-fiction-manifest.mjs <manifest.json> [--apply]');
  process.exit(2);
}

const root = repoRoot();
const manifestPath = path.resolve(manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.episode || !Array.isArray(manifest.people) || manifest.people.length === 0) {
  throw new Error('manifest에는 episode와 비어 있지 않은 people 배열이 필요합니다.');
}

const roster = factionRoster(root, manifest.episode);
const mythical = new Map(roster.filter((person) => person.mythical === true).map((person) => [person.slug, person]));
const allowedProfessions = new Set(['leader', 'politician', 'commander', 'entrepreneur', 'investor', 'humanities_scholar', 'social_scientist', 'scientist', 'director', 'musician', 'visual_artist', 'author', 'actor', 'influencer', 'athlete', 'other']);
const allowedTones = new Set(['loyal', 'composed', 'bold', 'humble', 'gentle', 'free']);
const forbiddenHanzi = /[一-鿿]/;
const firstPerson = /(나는|내가|나를|나의|저는|제가|저를|저의|우리는|우리가|우리를|우리의)/;

for (const person of manifest.people) {
  if (!mythical.has(person.slug)) throw new Error(`${person.slug}: ${manifest.episode}의 mythical 인물이 아닙니다.`);
  if (!person.nickname || !person.nickname_en) throw new Error(`${person.slug}: 국·영문 이름이 필요합니다.`);
  if (!allowedProfessions.has(person.profession)) throw new Error(`${person.slug}: 잘못된 profession`);
  if (person.speech_tone && !allowedTones.has(person.speech_tone)) throw new Error(`${person.slug}: 잘못된 speech_tone`);
  if (!person.bio || person.bio.length > 100) throw new Error(`${person.slug}: bio는 1~100자여야 합니다.`);
  if (!person.virtual_monologue || person.virtual_monologue.length < 400) throw new Error(`${person.slug}: 가상 독백이 400자 미만입니다.`);
  if (!firstPerson.test(person.virtual_monologue)) throw new Error(`${person.slug}: 1인칭 자기 지칭이 없습니다.`);
  if (forbiddenHanzi.test(person.virtual_monologue)) throw new Error(`${person.slug}: 한자가 섞였습니다.`);
  if (person.virtual_monologue.includes('—')) throw new Error(`${person.slug}: em dash가 섞였습니다.`);
  if (!person.review || !['candidate', 'approved'].includes(person.review.status) || person.review.cycles < 2 || person.review.blocking !== 0) {
    throw new Error(`${person.slug}: 검토 2회·blocking 0·candidate 이상이 필요합니다.`);
  }
}

const db = supabaseClient(root);
const slugs = manifest.people.map((person) => person.slug);
const { data: existingRows, error: selectError } = await db
  .from('profiles')
  .select('id,slug,nickname,nickname_en,profile_type,celeb_tier,status,avatar_url,bio,profession,title,nationality,gender,birth_date,death_date,speech_tone,virtual_monologue')
  .in('slug', slugs);
if (selectError) throw selectError;
const existing = new Map((existingRows ?? []).map((profile) => [profile.slug, profile]));

const fields = ['nickname', 'nickname_en', 'profession', 'title', 'nationality', 'gender', 'birth_date', 'death_date', 'bio', 'speech_tone', 'virtual_monologue'];
let created = 0;
let updated = 0;
let skipped = 0;

for (const person of manifest.people) {
  const before = existing.get(person.slug);
  if (before && before.profile_type !== 'CELEB') throw new Error(`${person.slug}: 같은 slug의 일반 사용자 계정이 존재합니다.`);
  const payload = {
    nickname: person.nickname,
    nickname_en: person.nickname_en,
    profession: person.profession,
    title: person.title || null,
    nationality: person.nationality || null,
    gender: person.gender ?? null,
    birth_date: person.birth_date || null,
    death_date: person.death_date || null,
    bio: person.bio,
    speech_tone: person.speech_tone || null,
    virtual_monologue: person.virtual_monologue,
    profile_type: 'CELEB',
    celeb_tier: 'fiction',
    status: 'inactive',
    is_verified: false,
  };

  const changed = !before || fields.some((field) => (before[field] ?? null) !== (payload[field] ?? null)) || before.celeb_tier !== 'fiction' || before.status !== 'inactive';
  const action = !before ? 'CREATE' : changed ? 'UPDATE' : 'SKIP';
  console.log(`${apply ? 'APPLY' : 'DRY'} ${action} ${person.slug}`);
  if (!changed) {
    skipped++;
    continue;
  }
  if (!apply) continue;

  if (before) {
    const { error } = await db.from('profiles').update(payload).eq('id', before.id).eq('profile_type', 'CELEB');
    if (error) throw error;
    updated++;
    continue;
  }

  const id = crypto.randomUUID();
  const email = `celeb_${id}@feelandnote.local`;
  const password = crypto.randomUUID() + crypto.randomUUID();
  const { data: authData, error: authError } = await db.auth.admin.createUser({ id, email, password, email_confirm: true });
  if (authError) throw authError;
  try {
    const { error } = await db.from('profiles').update(payload).eq('id', authData.user.id);
    if (error) throw error;
    const { data: saved, error: savedError } = await db.from('profiles').select('slug').eq('id', authData.user.id).single();
    if (savedError) throw savedError;
    if (saved.slug !== person.slug) throw new Error(`생성 slug 불일치: 예상 ${person.slug}, 실제 ${saved.slug}`);
    created++;
  } catch (error) {
    await db.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', total: manifest.people.length, created, updated, skipped }));
