/* ── 인물 화면의 검색 노출 문구 ──
   여기서 만든 글자가 네이버·구글 검색 결과에 그대로 뜬다.
   실측(2026-07-26): 네이버 노출 하루 900건에 클릭 26건(약 3%). 색인·수집은 정상이므로
   병목은 "노출된 다음"이다. 그래서 설명문을 인물마다 다른 글로 바꾼다.

   재료 보유율(색인 대상 full 등급 1,257명): 수식어·소개문·영향력 100% / 명언 91.5%(평균 31자).
   명언을 첫머리에 두는 이유 — 검색 결과에서 눈에 걸리는 것은 사실 나열이 아니라 사람의 말이다. */

interface ContentCounts {
  BOOK: number;
  VIDEO: number;
  GAME: number;
  MUSIC: number;
}

export interface CelebMetaInput {
  nickname: string;
  /** 수식어 (예: 엔비디아 창업자) */
  title: string | null;
  counts: ContentCounts;
  /** 대표 한마디. 없는 인물이 8.5% 있어 소개문으로 대체한다. */
  quote?: string | null;
  bio?: string | null;
}

/** 기록이 이 수 이하면 제목에 숫자를 쓰지 않는다 — "추천 책 1권"은 클릭을 깎는다. */
const COUNT_HIDE_THRESHOLD = 2;

/** 검색 결과 설명문이 잘리지 않는 대략의 한계. */
const DESC_MAX = 175;

/**
 * 한마디 길이 상한 — 언어별로 다르다.
 * 같은 말이라도 영어로 옮기면 글자 수가 두 배 남짓 늘어난다(실측 한국어 최대 90 대 영어 최대 221·평균 73).
 * 한쪽 기준(90)만 쓰면 영어 화면에서 367명의 한마디가 조용히 탈락해 소개문으로 되돌아갔다.
 */
const QUOTE_MAX = { ko: 90, en: 170 } as const;

/** 마지막 글자의 받침 유무로 '이/가' 반환 */
function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  // 한글 범위(0xAC00~0xD7A3) 밖이면 '이'로 폴백
  if (last < 0xac00 || last > 0xd7a3) return '이';
  return (last - 0xac00) % 28 === 0 ? '가' : '이';
}

const totalCount = (c: ContentCounts) => c.BOOK + c.VIDEO + c.MUSIC + c.GAME;

/**
 * 검색 결과에 그대로 실리는 자리라 한마디를 그대로 쓰지 않고 손본다.
 * 줄바꿈·겹공백을 없애고, 감싸는 따옴표는 벗긴다(설명문에서 다시 씌우므로 이중이 된다).
 */
function sanitizeQuote(raw: string | null | undefined, locale: 'ko' | 'en'): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”'‘’「『]+/, '')
    .replace(/["“”'‘’」』]+$/, '')
    .trim();
  // 대괄호로 통째 감싼 값은 실제 발언이 아니라 자리 표시 문구다
  // (확인된 발언이 없는 인물에게 "[확인된 어록이 없습니다]"를 값으로 넣어 두었다).
  // 화면에는 그대로 띄우되 검색 결과 설명문에는 쓰지 않는다.
  if (/^\[[\s\S]*\]$/.test(cleaned)) return null;
  if (cleaned.length < 8 || cleaned.length > QUOTE_MAX[locale]) return null;
  return cleaned;
}

/**
 * 한마디를 앞세우고, 자리가 남을 때만 뒤에 안내를 붙인다.
 * 한마디가 길면 안내를 통째로 접는다 — 검색 결과에서 잘려 보이느니 사람의 말을 온전히 보이는 편이 낫다.
 */
function composeDescription(head: string, tail: string): string {
  const cleanHead = head.replace(/ {2,}/g, ' ').trim();
  if (cleanHead.length + 1 + tail.length <= DESC_MAX) return `${cleanHead} ${tail}`;
  return clamp(cleanHead);
}

/** 소개문을 설명문 앞머리로 쓸 때 문장 하나로 줄인다. */
function firstSentence(raw: string | null | undefined, limit: number): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned.slice(0, limit);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('다. '));
  if (lastStop > limit * 0.5) return cut.slice(0, lastStop + 1);
  return `${cut.trimEnd()}…`;
}

function clamp(text: string, limit = DESC_MAX): string {
  const cleaned = text.replace(/ {2,}/g, ' ').trim();
  return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 1).trimEnd()}…`;
}

/* ── 한국어 ── */

/** 기록 종류를 사람이 읽는 말로. 적을 때는 숫자를 감춘다. */
function countPartsKo(c: ContentCounts, withNumbers: boolean): string[] {
  const parts: string[] = [];
  if (c.BOOK > 0) parts.push(withNumbers ? `추천 책 ${c.BOOK}권` : '추천 책');
  if (c.VIDEO > 0) parts.push(withNumbers ? `추천 영화 ${c.VIDEO}편` : '추천 영화');
  if (c.MUSIC > 0) parts.push(withNumbers ? `추천 음악 ${c.MUSIC}곡` : '추천 음악');
  if (c.GAME > 0) parts.push(withNumbers ? `추천 게임 ${c.GAME}개` : '추천 게임');
  return parts;
}

export function buildCelebTitleKo({ nickname, title, counts }: CelebMetaInput): string {
  const prefix = title ?? '';
  const parts = countPartsKo(counts, totalCount(counts) > COUNT_HIDE_THRESHOLD);

  if (parts.length === 0) {
    return `${prefix} ${nickname} 추천 책·영화·음악`.replace(/ {2,}/g, ' ').trim();
  }
  return `${prefix} ${nickname} ${parts.join(', ')}`.replace(/ {2,}/g, ' ').trim();
}

/** 감상 기록을 "읽은 책 5권, 본 영화 3편" 꼴로. 두 종류까지만 적어 설명문이 넘치지 않게 한다. */
function recordPhraseKo(c: ContentCounts): string {
  const withNumbers = totalCount(c) > COUNT_HIDE_THRESHOLD;
  const parts: string[] = [];
  if (c.BOOK > 0) parts.push(withNumbers ? `읽은 책 ${c.BOOK}권` : '읽은 책');
  if (c.VIDEO > 0) parts.push(withNumbers ? `본 영화 ${c.VIDEO}편` : '본 영화');
  if (c.MUSIC > 0) parts.push(withNumbers ? `들은 음악 ${c.MUSIC}곡` : '들은 음악');
  if (c.GAME > 0) parts.push(withNumbers ? `한 게임 ${c.GAME}개` : '한 게임');
  return parts.slice(0, 2).join(', ');
}

export function buildCelebDescriptionKo(input: CelebMetaInput): string {
  const { nickname, title, counts, quote, bio } = input;
  const prefix = title ?? '';
  const records = recordPhraseKo(counts);
  // 화면이 실제로 제공하는 것을 적는다. 독백·연대기까지 늘어놓으면 문장이 무너진다.
  const tail = records
    ? `${records}에 영향력 평가와 16축 스펙트럼을 함께 담았다.`
    : '영향력 평가와 16축 스펙트럼, 인물 관계를 함께 담았다.';

  const clean = sanitizeQuote(quote, 'ko');
  if (clean) {
    return composeDescription(`"${clean}" — ${prefix} ${nickname}.`, tail);
  }

  // 한마디가 없는 인물은 소개문을 앞머리로 쓴다. 소개문은 전원 보유한다.
  const intro = firstSentence(bio, 80);
  if (intro) {
    return composeDescription(`${prefix} ${nickname} — ${intro}`, tail);
  }

  return clamp(
    `${prefix} ${nickname}${subjectParticle(nickname)} 남긴 감상 기록과 영향력 평가, 16축 스펙트럼을 모았다.`,
  );
}

/* ── 영문 ── */

function countPartsEn(c: ContentCounts, withNumbers: boolean): string[] {
  const parts: string[] = [];
  if (c.BOOK > 0) parts.push(withNumbers ? `${c.BOOK} recommended books` : 'recommended books');
  if (c.VIDEO > 0) parts.push(withNumbers ? `${c.VIDEO} favorite movies` : 'favorite movies');
  if (c.MUSIC > 0) parts.push(withNumbers ? `${c.MUSIC} favorite songs` : 'favorite songs');
  if (c.GAME > 0) parts.push(withNumbers ? `${c.GAME} favorite games` : 'favorite games');
  return parts;
}

export function buildCelebTitleEn({ nickname, title, counts }: CelebMetaInput): string {
  const prefix = title ?? '';
  const parts = countPartsEn(counts, totalCount(counts) > COUNT_HIDE_THRESHOLD);

  if (parts.length === 0) {
    return `${prefix} ${nickname}'s Recommended Books & Movies`.replace(/ {2,}/g, ' ').trim();
  }
  return `${prefix} ${nickname}: ${parts.join(', ')}`.replace(/ {2,}/g, ' ').trim();
}

export function buildCelebDescriptionEn(input: CelebMetaInput): string {
  const { nickname, title, counts, quote, bio } = input;
  const prefix = title ?? '';
  const parts = countPartsEn(counts, totalCount(counts) > COUNT_HIDE_THRESHOLD).slice(0, 2);
  const tail = parts.length
    ? `Browse ${parts.join(' and ')}, with influence scores and a 16-axis spectrum.`
    : 'Influence scores, a 16-axis spectrum, and connections to other figures.';

  const clean = sanitizeQuote(quote, 'en');
  if (clean) {
    return composeDescription(`"${clean}" — ${prefix} ${nickname}.`, tail);
  }

  const intro = firstSentence(bio, 80);
  if (intro) {
    return composeDescription(`${prefix} ${nickname} — ${intro}`, tail);
  }

  return clamp(
    `Explore ${prefix} ${nickname}'s cultural record, influence scores, and 16-axis spectrum on Feel&Note.`,
  );
}
