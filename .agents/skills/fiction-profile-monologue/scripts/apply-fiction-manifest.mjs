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
const firstPersonEn = /\b(I|me|my|mine|we|us|our|ours)\b/i;

for (const person of manifest.people) {
  if (!mythical.has(person.slug)) throw new Error(`${person.slug}: ${manifest.episode}의 mythical 인물이 아닙니다.`);
  if (!person.nickname || !person.nickname_en) throw new Error(`${person.slug}: 국·영문 이름이 필요합니다.`);
  if (!allowedProfessions.has(person.profession)) throw new Error(`${person.slug}: 잘못된 profession`);
  if (person.speech_tone && !allowedTones.has(person.speech_tone)) throw new Error(`${person.slug}: 잘못된 speech_tone`);
  if (!person.bio || person.bio.length > 100) throw new Error(`${person.slug}: bio는 1~100자여야 합니다.`);
  if (!person.bio_en || person.bio_en.length > 180) throw new Error(`${person.slug}: bio_en은 1~180자여야 합니다.`);
  if (!Array.isArray(person.source_urls) || person.source_urls.length === 0
    || person.source_urls.some((url) => typeof url !== 'string' || !/^https?:\/\//.test(url))) {
    throw new Error(`${person.slug}: 원전 URL이 하나 이상 필요합니다.`);
  }
  if (!person.virtual_monologue?.trim()) throw new Error(`${person.slug}: 가상 독백이 비어 있습니다.`);
  if (!firstPerson.test(person.virtual_monologue)) throw new Error(`${person.slug}: 1인칭 자기 지칭이 없습니다.`);
  if (!person.virtual_monologue_en?.trim()) throw new Error(`${person.slug}: 영문 가상 독백이 비어 있습니다.`);
  if (!firstPersonEn.test(person.virtual_monologue_en)) throw new Error(`${person.slug}: 영문 독백에 1인칭 자기 지칭이 없습니다.`);
  if (forbiddenHanzi.test(person.virtual_monologue)) throw new Error(`${person.slug}: 한자가 섞였습니다.`);
  if (person.virtual_monologue.includes('—') || person.virtual_monologue_en.includes('—')) {
    throw new Error(`${person.slug}: em dash가 섞였습니다.`);
  }
  if (person.review_passed !== true) {
    throw new Error(`${person.slug}: 검토하며 수정한 최종본만 반영할 수 있습니다.`);
  }
}

const db = supabaseClient(root);
const slugs = manifest.people.map((person) => person.slug);
const { data: existingRows, error: selectError } = await db
  .from('profiles')
  .select('id,slug,nickname,nickname_en,profile_type,celeb_tier,status,avatar_url,bio,bio_en,profession,title,title_en,nationality,gender,birth_date,death_date,speech_tone,virtual_monologue,virtual_monologue_en')
  .in('slug', slugs);
if (selectError) throw selectError;
const existing = new Map((existingRows ?? []).map((profile) => [profile.slug, profile]));

const fields = [
  'nickname', 'nickname_en', 'profession', 'title', 'title_en', 'nationality',
  'gender', 'birth_date', 'death_date', 'bio', 'bio_en', 'speech_tone',
  'virtual_monologue', 'virtual_monologue_en',
];
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
    title_en: person.title_en || null,
    nationality: person.nationality || null,
    gender: person.gender ?? null,
    birth_date: person.birth_date || null,
    death_date: person.death_date || null,
    bio: person.bio,
    bio_en: person.bio_en,
    speech_tone: person.speech_tone || null,
    virtual_monologue: person.virtual_monologue,
    virtual_monologue_en: person.virtual_monologue_en,
    profile_type: 'CELEB',
    celeb_tier: 'fiction',
    // 이미 공개된 fiction 프로필을 콘텐츠 보강 때문에 다시 숨기지 않는다.
    // 신규 생성만 검토 전 기본값인 inactive로 둔다.
    status: before?.status ?? 'inactive',
    is_verified: false,
  };

  const changed = !before
    || fields.some((field) => (before[field] ?? null) !== (payload[field] ?? null))
    || before.celeb_tier !== 'fiction'
    || before.status !== payload.status;
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
