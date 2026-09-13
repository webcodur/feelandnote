import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function requirePostId(post) {
  if (!Number.isSafeInteger(post?.id) || post.id < 1) {
    throw new Error(`실제 글 번호가 없다: ${post?.name ?? '(이름 없음)'}. 글 목록과 먼저 대조해야 한다.`);
  }
  return post.id;
}

export function assertPostIdentity(post, actualTitle, metaTitle) {
  requirePostId(post);
  const title = String(actualTitle ?? '').trim();
  const expected = [post.title, metaTitle].filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
  if (!title || !expected.includes(title)) {
    throw new Error(`#${post.id} 글 신원 불일치: 화면 「${title}」 / 원고 「${post.name}」. 수정하지 않는다.`);
  }
}

export function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error('예약 기록은 배열이어야 한다.');
  const names = new Set();
  const ids = new Set();
  for (const post of posts) {
    if (typeof post.name !== 'string' || !post.name.trim() || names.has(post.name)) {
      throw new Error(`예약 기록 이름 누락 또는 중복: ${post.name}`);
    }
    names.add(post.name);
    if (post.id != null) {
      requirePostId(post);
      if (ids.has(post.id)) throw new Error(`실제 글 번호 중복: ${post.id}`);
      ids.add(post.id);
    }
  }
  return posts;
}

export function loadPosts(file) {
  return fs.existsSync(file) ? validatePosts(JSON.parse(fs.readFileSync(file, 'utf8'))) : [];
}

/** 한 편을 기록하다 종료되어도 기존 JSON은 남긴다. 원본은 덮기 전에 백업한다. */
export function savePostsAtomic(file, posts) {
  validatePosts(posts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const token = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
  if (fs.existsSync(file)) {
    const backup = path.join(path.dirname(file), '_backup');
    fs.mkdirSync(backup, { recursive: true });
    fs.copyFileSync(file, path.join(backup, `${path.basename(file, '.json')}-${token}.json`));
  }
  const temp = `${file}.${token}.tmp`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(posts, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

export function assertScheduleUnique(posts) {
  const slots = new Map();
  for (const post of posts) {
    if (!hasActiveSchedule(post)) continue;
    if (slots.has(post.at)) throw new Error(`예약시각 중복: ${post.at} / ${slots.get(post.at)} / ${post.name}`);
    slots.set(post.at, post.name);
  }
}

/** 비공개 글의 at은 과거 편성 기록이다. visibility가 없던 기존 공개 기록은 계속 인정한다. */
export function hasActiveSchedule(post) {
  if (post.visibility === 'open0' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(post.at ?? '')) return false;
  const date = new Date(`${post.at.replace(' ', 'T')}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16).replace('T', ' ') === post.at;
}

/** 저장 후 실서버 대조가 끝난 결과만 적용한다. 비공개 본문 수정은 과거 편성을 보존한다. */
export function applyVerifiedPost(post, actual) {
  if (requirePostId(post) !== requirePostId(actual) || actual.name && actual.name !== post.name) throw new Error('저장 결과와 기존 글의 대응이 다르다');
  return { ...post, title: actual.title ?? post.title, url: actual.url ?? post.url,
    visibility: actual.visibility, at: actual.visibility === 'open0' ? post.at : actual.at ?? null,
    verified_at: new Date().toISOString() };
}
