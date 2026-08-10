#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { factionRoster, repoRoot, supabaseClient } from './lib.mjs';

const [manifestArg] = process.argv.slice(2).filter((arg) => arg !== '--apply');
const apply = process.argv.includes('--apply');
if (!manifestArg) {
  console.error('usage: node apply-fiction-dialogue-manifest.mjs <manifest.json> [--apply]');
  process.exit(2);
}

const root = repoRoot();
const manifestPath = path.resolve(manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.episode || !Array.isArray(manifest.people) || manifest.people.length === 0) {
  throw new Error('manifest에는 episode와 비어 있지 않은 people 배열이 필요합니다.');
}

const situations = [
  'greeting',
  'roll_call',
  'deploy',
  'battle_win',
  'battle_draw',
  'battle_lose',
  'clash_attack',
];
const maxKo = {
  greeting: 90,
  roll_call: 40,
  deploy: 35,
  battle_win: 40,
  battle_draw: 40,
  battle_lose: 40,
  clash_attack: 25,
};
const maxEnWords = {
  greeting: 24,
  roll_call: 16,
  deploy: 16,
  battle_win: 18,
  battle_draw: 18,
  battle_lose: 18,
  clash_attack: 12,
};
const forbiddenHanzi = /[一-鿿]/;
const roster = factionRoster(root, manifest.episode);
const mythical = new Map(
  roster.filter((person) => person.mythical === true).map((person) => [person.slug, person]),
);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validateLines(person, locale, lines) {
  if (!isRecord(lines)) throw new Error(`${person.slug}.${locale}: 대사 객체가 아닙니다.`);
  const extra = Object.keys(lines).filter((key) => !situations.includes(key));
  if (extra.length) throw new Error(`${person.slug}.${locale}: 알 수 없는 상황 ${extra.join(', ')}`);

  const normalized = [];
  for (const situation of situations) {
    const triple = lines[situation];
    if (!Array.isArray(triple) || triple.length !== 3) {
      throw new Error(`${person.slug}.${locale}.${situation}: 문자열 3개가 필요합니다.`);
    }
    for (const line of triple) {
      if (typeof line !== 'string' || !line.trim()) {
        throw new Error(`${person.slug}.${locale}.${situation}: 빈 대사가 있습니다.`);
      }
      if (/^\s*\[[^\]]+\]/.test(line)) {
        throw new Error(`${person.slug}.${locale}.${situation}: 신규 ELE 태그를 넣을 수 없습니다.`);
      }
      if (line.includes('—') || line.includes('–')) {
        throw new Error(`${person.slug}.${locale}.${situation}: dash 문자를 넣을 수 없습니다.`);
      }
      if (locale === 'ko') {
        if (forbiddenHanzi.test(line)) {
          throw new Error(`${person.slug}.${locale}.${situation}: 한자가 섞였습니다.`);
        }
        if (line.length > maxKo[situation]) {
          throw new Error(`${person.slug}.${locale}.${situation}: ${line.length}자, 상한 ${maxKo[situation]}자`);
        }
      } else if (wordCount(line) > maxEnWords[situation]) {
        throw new Error(
          `${person.slug}.${locale}.${situation}: ${wordCount(line)}단어, 상한 ${maxEnWords[situation]}단어`,
        );
      }
      normalized.push(line.trim().toLocaleLowerCase());
    }
  }
  if (new Set(normalized).size !== 21) {
    throw new Error(`${person.slug}.${locale}: 21줄 안에 중복이 있습니다.`);
  }
}

for (const person of manifest.people) {
  if (!mythical.has(person.slug)) {
    throw new Error(`${person.slug}: ${manifest.episode}의 mythical 인물이 아닙니다.`);
  }
  if (!person.nickname || !person.nickname_en || !person.speech_tone) {
    throw new Error(`${person.slug}: 이름과 speech_tone이 필요합니다.`);
  }
  if (!person.quote || person.quote.length > 90 || !person.quote_en || person.quote_en.length > 170) {
    throw new Error(`${person.slug}: 한마디 국문 1~90자·영문 1~170자가 필요합니다.`);
  }
  if (person.quote.includes('—') || person.quote_en.includes('—')) {
    throw new Error(`${person.slug}: 한마디에 em dash를 넣을 수 없습니다.`);
  }
  if (!Array.isArray(person.sources) || person.sources.length === 0
    || person.sources.some((source) => !/^https?:\/\//.test(source))) {
    throw new Error(`${person.slug}: 원전 URL이 필요합니다.`);
  }
  if (!person.review || person.review.cycles < 2 || person.review.blocking !== 0
    || !['candidate', 'approved'].includes(person.review.status)) {
    throw new Error(`${person.slug}: 검토 2회·blocking 0·candidate 이상이 필요합니다.`);
  }
  validateLines(person, 'ko', person.lines);
  validateLines(person, 'en', person.lines_en);
}

const db = supabaseClient(root);
const slugs = manifest.people.map((person) => person.slug);
const { data: profiles, error: profileError } = await db
  .from('celebs')
  .select('id,slug,nickname,nickname_en,celeb_tier,publication_status,speech_tone')
  .in('slug', slugs);
if (profileError) throw profileError;
const profileBySlug = new Map((profiles ?? []).map((profile) => [profile.slug, profile]));

const ids = (profiles ?? []).map((profile) => profile.id);
const { data: dialogues, error: dialogueError } = await db
  .from('celeb_dialogues')
  .select('celeb_id,lines,lines_en')
  .in('celeb_id', ids);
if (dialogueError) throw dialogueError;
const dialogueById = new Map((dialogues ?? []).map((dialogue) => [dialogue.celeb_id, dialogue]));

const work = [];
const toneWork = [];
for (const person of manifest.people) {
  const profile = profileBySlug.get(person.slug);
  if (!profile
    || profile.nickname !== person.nickname
    || profile.nickname_en !== person.nickname_en
    || profile.celeb_tier !== 'fiction'
    || profile.publication_status !== 'active') {
    throw new Error(`${person.slug}: 공개 fiction 프로필·이름 대조 실패 ${JSON.stringify(profile)}`);
  }
  if (profile.speech_tone && profile.speech_tone !== person.speech_tone) {
    throw new Error(
      `${person.slug}: 기존 speech_tone ${profile.speech_tone}을 ${person.speech_tone}(으)로 덮어쓸 수 없습니다.`,
    );
  }
  if (!profile.speech_tone) {
    toneWork.push({ profile, speechTone: person.speech_tone });
    console.log(`${apply ? 'APPLY' : 'DRY'} TONE UPDATE ${person.slug} ${person.speech_tone}`);
  }

  const before = dialogueById.get(profile.id);
  const currentKo = isRecord(before?.lines) ? before.lines : {};
  const currentEn = isRecord(before?.lines_en) ? before.lines_en : {};
  const nextKo = { ...currentKo, ...person.lines, quote: person.quote };
  const nextEn = { ...currentEn, ...person.lines_en, quote: person.quote_en };
  const alreadyExact = before
    && JSON.stringify(before.lines) === JSON.stringify(nextKo)
    && JSON.stringify(before.lines_en) === JSON.stringify(nextEn);
  if (alreadyExact) {
    console.log(`${apply ? 'APPLY' : 'DRY'} SKIP ${person.slug}`);
    continue;
  }

  if (person.expected_existing === null) {
    if (before) throw new Error(`${person.slug}: 대사 행이 없을 것으로 예상했으나 이미 존재합니다.`);
  } else {
    if (!before) throw new Error(`${person.slug}: 기존 대사 행을 예상했으나 없습니다.`);
    if (!isRecord(person.expected_existing)
      || currentKo.quote !== person.expected_existing.quote
      || currentEn.quote !== person.expected_existing.quote_en) {
      throw new Error(`${person.slug}: 기존 한마디가 manifest 예상과 다릅니다.`);
    }
    for (const situation of situations) {
      const ko = currentKo[situation];
      const en = currentEn[situation];
      if ((ko !== undefined && (!Array.isArray(ko) || ko.some((line) => String(line).trim())))
        || (en !== undefined && (!Array.isArray(en) || en.some((line) => String(line).trim())))) {
        throw new Error(`${person.slug}: 기존 고유 대사가 있어 덮어쓰기를 중단합니다.`);
      }
    }
  }
  work.push({ profile, person, nextKo, nextEn, action: before ? 'UPDATE' : 'INSERT' });
  console.log(`${apply ? 'APPLY' : 'DRY'} ${before ? 'UPDATE' : 'INSERT'} ${person.slug}`);
}

if (apply && toneWork.length) {
  for (const { profile, speechTone } of toneWork) {
    const { error } = await db
      .from('celebs')
      .update({ speech_tone: speechTone })
      .eq('id', profile.id)
      .is('speech_tone', null);
    if (error) throw error;
  }
}

if (apply && work.length) {
  const payload = work.map(({ profile, nextKo, nextEn }) => ({
    celeb_id: profile.id,
    lines: nextKo,
    lines_en: nextEn,
  }));
  const { error } = await db.from('celeb_dialogues').upsert(payload, { onConflict: 'celeb_id' });
  if (error) throw error;
}

if (apply) {
  const { data: savedProfiles, error: savedProfileError } = await db
    .from('celebs')
    .select('id,speech_tone')
    .in('id', ids);
  if (savedProfileError) throw savedProfileError;
  const savedToneById = new Map((savedProfiles ?? []).map((profile) => [profile.id, profile.speech_tone]));
  for (const person of manifest.people) {
    const profile = profileBySlug.get(person.slug);
    if (savedToneById.get(profile.id) !== person.speech_tone) {
      throw new Error(`${person.slug}: speech_tone 적용 후 대조 실패`);
    }
  }

  const { data: saved, error } = await db
    .from('celeb_dialogues')
    .select('celeb_id,lines,lines_en')
    .in('celeb_id', ids);
  if (error) throw error;
  const savedById = new Map((saved ?? []).map((dialogue) => [dialogue.celeb_id, dialogue]));
  for (const person of manifest.people) {
    const profile = profileBySlug.get(person.slug);
    const row = savedById.get(profile.id);
    if (!row
      || row.lines?.quote !== person.quote
      || row.lines_en?.quote !== person.quote_en
      || situations.some((key) => JSON.stringify(row.lines?.[key]) !== JSON.stringify(person.lines[key]))
      || situations.some((key) => JSON.stringify(row.lines_en?.[key]) !== JSON.stringify(person.lines_en[key]))) {
      throw new Error(`${person.slug}: 적용 후 전문 대조 실패`);
    }
  }
}

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  total: manifest.people.length,
  toneChanged: toneWork.length,
  changed: work.length,
  skipped: manifest.people.length - work.length,
}));
