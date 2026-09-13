import { assertScheduleUnique, requirePostId, hasActiveSchedule } from './post-state.mjs';

export const SLOT_TIMES = ['09:00', '12:00', '18:00'];
export const POST_CATEGORIES = { work: '이 영화를 감상한 셀럽', person: '셀럽이 감상한 영화', list: '영화제와 선정 목록' };
export const kindOf = (name) => name.startsWith('목록-') ? 'list' : name.startsWith('인물-') ? 'person' : 'work';

export function parseDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) throw new Error(`날짜 형식 오류: ${day}`);
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error(`유효하지 않은 날짜: ${day}`);
  return date;
}

export function addDays(day, count) {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function validateAt(at, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(at ?? '')) throw new Error(`예약시각 형식 오류: ${at}`);
  parseDay(at.slice(0, 10));
  if (Number(at.slice(11, 13)) > 23 || Number(at.slice(14)) > 59) throw new Error(`예약시각 오류: ${at}`);
  if (new Date(`${at.replace(' ', 'T')}:00+09:00`).getTime() <= now) throw new Error(`과거 시각에는 예약하지 않는다: ${at}`);
  return at;
}

/** 기존 정상 예약을 보존하고, 중복된 글만 빈 시간으로 옮긴다. */
export function repairSchedule(posts, { now = Date.now() } = {}) {
  const ordered = posts.filter(hasActiveSchedule).map((p) => ({ ...p })).sort((a, b) => a.at.localeCompare(b.at) || requirePostId(a) - requirePostId(b));
  if (!ordered.length) return [];
  const occupied = new Set();
  const displaced = [];
  for (const post of ordered) {
    requirePostId(post);
    if (!SLOT_TIMES.includes(post.at.slice(11)) || occupied.has(post.at)) displaced.push(post);
    else occupied.add(post.at);
  }
  const changes = [];
  let day = ordered[0].at.slice(0, 10);
  while (displaced.length) {
    for (const time of SLOT_TIMES) {
      const at = `${day} ${time}`;
      if (occupied.has(at) || new Date(`${at.replace(' ', 'T')}:00+09:00`).getTime() <= now) continue;
      const post = displaced.shift();
      changes.push({ id: post.id, name: post.name, from: post.at, at });
      occupied.add(at);
      if (!displaced.length) break;
    }
    day = addDays(day, 1);
  }
  return changes;
}

/** 지정 기간의 빈 시간만 채운다. 시각은 항상 한국 시간이다. */
export function planSchedule(names, posts, { start, days = 7, limit = Infinity, now = Date.now() } = {}) {
  parseDay(start);
  if (!Number.isSafeInteger(days) || days < 1 || days > 366) throw new Error('--days 는 1~366의 정수여야 한다');
  if (!(limit === Infinity || Number.isSafeInteger(limit) && limit > 0)) throw new Error('--limit 은 양의 정수여야 한다');
  assertScheduleUnique(posts);
  const posted = new Set(posts.map((p) => p.name));
  const occupied = new Set(posts.filter(hasActiveSchedule).map((p) => p.at));
  const pools = { work: [], person: [], list: [] };
  for (const name of [...new Set(names)]) if (!posted.has(name)) pools[kindOf(name)].push(name);
  const plan = [];
  for (let d = 0; d < days; d++) {
    const day = addDays(start, d);
    for (const [slot, kind] of ['work', 'person', 'list'].entries()) {
      const at = `${day} ${SLOT_TIMES[slot]}`;
      if (occupied.has(at)) continue;
      if (new Date(`${at.replace(' ', 'T')}:00+09:00`).getTime() <= now) continue;
      const alternatives = [kind, d % 2 ? 'person' : 'work', d % 2 ? 'work' : 'person', 'list'];
      const pickedKind = alternatives.find((k) => pools[k].length);
      if (!pickedKind) return plan;
      const name = pools[pickedKind].shift();
      plan.push({ name, at });
      occupied.add(at);
      if (plan.length >= limit) return plan;
    }
  }
  return plan;
}
