/*
  파일명: /lib/celeb/celebNameSearch.ts
  기능: 인물 이름 검색의 일치 판정과 순위
  책임: 띄어쓰기·구두점·대소문자·분음부호를 떼고, 외래어 표기 흔들림(래드클리프/레드클리프,
        다니엘/대니얼)까지 견디게 이름과 다른 이름(별칭)을 비교해 가까운 순으로 줄 세운다.
        조회는 하지 않는다 — 이름 목록을 받아 판정만 한다. 헤더 검색과 탐색 목록이 같은 규칙을 쓴다.
*/ // ------------------------------

import { canBeJungseong, combineCharacter, combineVowels, disassembleCompleteCharacter } from 'es-hangul'

export interface CelebNameEntry {
  id: string
  nickname: string | null
  nickname_en: string | null
  /** 다른 이름(별칭). 이름과 같은 규칙으로 찾되, 같은 단계면 이름으로 걸린 사람이 먼저 선다 */
  aliases?: readonly string[] | null
  /** 같은 단계 안에서 많이 찾는 사람을 앞에 세운다 */
  view_count?: number | null
}

/** 일치 단계. 낮을수록 검색어에 가깝다 */
export const NAME_MATCH_TIER = {
  /** 공백·구두점을 떼면 이름 전체가 같다 */
  exact: 0,
  /** 이름이 검색어로 시작한다 */
  prefix: 1,
  /** 이름 안에 검색어가 들어 있다(낱말 첫머리부터이거나 한 낱말 안) */
  contains: 2,
  /** 헷갈리는 모음(ㅐ/ㅔ 등)을 하나로 접으면 들어 있다 */
  foldedContains: 3,
  /** 검색어 낱말이 순서와 상관없이 모두 들어 있다 */
  allWords: 4,
  /** 위 단계에 아무도 없을 때만 — 자모 몇 개만 다른 비슷한 표기다 */
  similar: 5,
} as const

export interface CelebNameHit {
  id: string
  tier: number
  /** 비슷한 표기로 찾았을 때 고친 양(자모 단위). 나머지 단계는 0 */
  distance: number
  /** 이름이 아니라 다른 이름으로 걸렸으면 그 이름. 검색 결과 줄이 「어떤 이름으로 찾았는지」 보여 준다 */
  matchedAlias: string | null
}

/* ── 기준값 ────────────────────────────────────────────────
   실제 인물 이름 전체로 보정했다. 허용량을 늘리면 엉뚱한 사람이 섞이고, 줄이면
   「대니얼 래드클리프 → 다니엘 래드클리프」 같은 표기 차이를 놓친다. */

/** 모음 접기를 적용할 최소 검색어 길이(글자). 한 글자는 접으면 걸리는 사람이 너무 많다 */
const FOLD_MIN_CHARS = 2
/** 비슷한 표기 찾기를 적용할 최소 검색어 길이(자모·알파벳 개수) */
const SIMILAR_MIN_SYMBOLS = 6
/** 검색어 길이 대비 허용하는 고침 양 */
const SIMILAR_RATIO = 0.2
/** 짧은 검색어도 모음 두 개나 자음 하나까지는 고쳐 본다 */
const SIMILAR_MIN_BUDGET = 1
/** 비슷한 표기로 돌려줄 최대 인원 — 검색어가 틀렸을 때의 후보일 뿐이다 */
const SIMILAR_MAX_HITS = 10

/* ── 같은 소리로 볼 모음 ─────────────────────────────────
   음절 분해·조합은 es-hangul이 맡는다. 여기에는 「어떤 소리를 같게 볼지」만 둔다.
   es-hangul은 겹모음을 홑모음 둘로 풀어 준다(ㅙ → ㅗㅐ). 표의 열쇠도 그 모양이다. */

/** 소리로 구분하지 않는 모음 — ㅐ/ㅔ, ㅒ/ㅖ, ㅙ/ㅚ/ㅞ */
const VOWEL_FOLD: Record<string, string> = {
  'ㅐ': 'ㅔ',
  'ㅒ': 'ㅖ',
  'ㅗㅐ': 'ㅜㅔ',
  'ㅗㅣ': 'ㅜㅔ',
}

/** ㅈ·ㅉ·ㅊ 뒤의 이중모음은 단모음과 같은 소리다 — 쥬/주, 쟈/자, 쵸/초 */
const PALATAL_INITIALS = new Set(['ㅈ', 'ㅉ', 'ㅊ'])
const PALATAL_VOWEL_FOLD: Record<string, string> = {
  'ㅑ': 'ㅏ',
  'ㅕ': 'ㅓ',
  'ㅖ': 'ㅔ',
  'ㅛ': 'ㅗ',
  'ㅠ': 'ㅜ',
}

/** 음절 첫머리 ㅇ은 소리가 없다 */
const SILENT_INITIAL = 'ㅇ'

interface FoldedSyllable {
  initial: string
  /** 홑모음으로 푼 모양(ㅜㅔ) */
  vowel: string
  final: string
}

/** 완성형 음절을 풀고 모음을 접는다. 한글 음절이 아니면 null */
function foldedSyllable(char: string): FoldedSyllable | null {
  const parts = disassembleCompleteCharacter(char)
  if (!parts) return null
  const folded = VOWEL_FOLD[parts.jungseong] ?? parts.jungseong
  const vowel = PALATAL_INITIALS.has(parts.choseong) ? (PALATAL_VOWEL_FOLD[folded] ?? folded) : folded
  return { initial: parts.choseong, vowel, final: parts.jongseong }
}

/** 비교할 때 겹모음은 한 소리로 센다(ㅜㅔ → ㅞ). 푼 채로 두면 와/오가 모음 하나가 아니라 둘 차이가 된다 */
function vowelSymbol(vowel: string): string {
  return vowel.length > 1 ? combineVowels(vowel[0]!, vowel[1]!) : vowel
}

/* ── 표기 정리 ─────────────────────────────────────────── */

/**
 * 비교용 낱말 — 분음부호를 떼고 소문자로 만든 뒤 공백·마침표·붙임표·가운뎃점에서 가른다.
 * NFD만 쓰면 한글 음절이 낱자로 흩어지므로 분음부호를 뗀 뒤 NFC로 다시 합친다.
 */
export function nameWords(value: string): string[] {
  return value
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/** 음절 단위로 헷갈리는 모음을 접는다. 글자 수가 그대로라 낱말 경계 위치를 함께 쓸 수 있다 */
function foldSyllables(plain: string): string {
  let out = ''
  for (const char of plain) {
    const syllable = foldedSyllable(char)
    out += syllable ? combineCharacter(syllable.initial, syllable.vowel, syllable.final) : char
  }
  return out
}

/** 낱말들을 이어 붙이고 각 낱말이 시작하는 자리를 적는다 */
function joinWords(words: readonly string[]): { plain: string; wordStarts: number[] } {
  const wordStarts: number[] = []
  let plain = ''
  for (const word of words) {
    wordStarts.push(plain.length)
    plain += word
  }
  return { plain, wordStarts }
}

/**
 * 붙여 쓴 이름 안에 검색어가 있는가. 낱말 첫머리에서 시작하거나, `insideWord`면 한 낱말 안에 다 들어가도 된다.
 * 그냥 포함만 보면 「마크 로스코」가 「크로스」에 걸린다.
 */
function containsAligned(text: string, needle: string, wordStarts: readonly number[], insideWord: boolean): boolean {
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) {
    if (wordStarts.includes(at)) return true
    const end = at + needle.length
    if (insideWord && !wordStarts.some((start) => start > at && start < end)) return true
  }
  return false
}

/** 비슷한 표기 비교용 소리 열. 음절 첫머리 ㅇ은 소리가 없어 뺀다 */
interface SoundKey {
  symbols: string[]
  /** 낱말 첫머리 위치 */
  starts: number[]
  /** 일치가 시작할 수 있는 자리(낱말 첫머리). 길이 symbols.length + 1 */
  wordStart: Uint8Array
  /** 일치가 끝날 수 있는 자리(음절 끝) */
  syllableEnd: Uint8Array
}

function soundKey(words: readonly string[]): SoundKey {
  const symbols: string[] = []
  const starts: number[] = []
  const ends: number[] = []
  for (const word of words) {
    starts.push(symbols.length)
    for (const char of word) {
      const syllable = foldedSyllable(char)
      if (syllable) {
        if (syllable.initial !== SILENT_INITIAL) symbols.push(syllable.initial)
        symbols.push(vowelSymbol(syllable.vowel))
        // 겹받침은 es-hangul이 소리 나는 낱자로 풀어 준다(ㄺ → ㄹㄱ)
        for (const part of syllable.final) symbols.push(part)
      } else {
        symbols.push(char)
      }
      ends.push(symbols.length)
    }
  }
  const wordStart = new Uint8Array(symbols.length + 1)
  const syllableEnd = new Uint8Array(symbols.length + 1)
  for (const start of starts) wordStart[start] = 1
  for (const end of ends) syllableEnd[end] = 1
  return { symbols, starts, wordStart, syllableEnd }
}

/* ── 비슷한 표기 거리 ───────────────────────────────────── */

const LATIN_VOWELS = new Set('aeiouy')
/** 외래어 표기에서 서로 갈마드는 자음 — 프로이트/프로이드, 도스토옙스키/도스또옙스끼 */
const CONSONANT_GROUP = new Map<string, number>()
;['ㄱㄲㅋ', 'ㄷㄸㅌ', 'ㅂㅃㅍ', 'ㅅㅆ', 'ㅈㅉㅊ'].forEach((group, index) => {
  for (const char of group) CONSONANT_GROUP.set(char, index + 1)
})

function substituteCost(a: string, b: string): number {
  if (a === b) return 0
  if ((canBeJungseong(a) && canBeJungseong(b)) || (LATIN_VOWELS.has(a) && LATIN_VOWELS.has(b))) return 0.5
  const group = CONSONANT_GROUP.get(a)
  if (group && group === CONSONANT_GROUP.get(b)) return 0.5
  return 1
}

/** 외래어 표기는 받침 대신 「ㅡ」를 붙였다 뗐다 한다(르·스·트) — 그만큼은 싸게 친다 */
const insertCost = (symbol: string) => (symbol === 'ㅡ' ? 0.5 : 1)

/**
 * 검색어가 이름의 어느 부분과 가장 가까운지 — 부분 문자열 편집 거리(Sellers).
 * 일치는 낱말 첫머리에서 시작해 음절 끝에서 끝난다. 그 밖에서 시작하면 건너뛴 자모만큼 값을 치른다.
 */
function nearestSubstringDistance(query: readonly string[], text: SoundKey, budget: number): number {
  const m = query.length
  const n = text.symbols.length
  // 이름이 검색어보다 짧으면 모자란 만큼 지워야 한다 — 가장 싸게 쳐도 한도를 넘으면 계산하지 않는다
  if ((m - n) * 0.5 > budget) return Infinity
  // 첫소리가 맞는 낱말이 하나도 없으면 계산하지 않는다
  if (!text.starts.some((start) => start < n && sameOpening(query[0]!, text.symbols[start]!))) return Infinity

  let prev = new Float64Array(m + 1)
  let cur = new Float64Array(m + 1)
  for (let i = 1; i <= m; i++) prev[i] = prev[i - 1]! + insertCost(query[i - 1]!)
  let best = Infinity

  for (let j = 1; j <= n; j++) {
    const symbol = text.symbols[j - 1]!
    cur[0] = text.wordStart[j] ? 0 : prev[0]! + insertCost(symbol)
    for (let i = 1; i <= m; i++) {
      cur[i] = Math.min(
        prev[i - 1]! + substituteCost(query[i - 1]!, symbol),
        prev[i]! + insertCost(symbol),
        cur[i - 1]! + insertCost(query[i - 1]!),
      )
    }
    if (text.syllableEnd[j] && cur[m]! < best) best = cur[m]!
    ;[prev, cur] = [cur, prev]
  }
  return best
}

/* ── 색인과 검색 ───────────────────────────────────────── */

interface PreparedName {
  plain: string
  folded: string
  wordStarts: number[]
  sound: SoundKey
  /** 다른 이름에서 만든 것이면 그 원문. 이름이면 null */
  alias: string | null
}

interface PreparedEntry {
  id: string
  sortName: string
  views: number
  names: PreparedName[]
}

export interface CelebNameIndex {
  entries: PreparedEntry[]
}

function prepareWords(words: readonly string[], alias: string | null): PreparedName {
  const { plain, wordStarts } = joinWords(words)
  return { plain, folded: foldSyllables(plain), wordStarts, sound: soundKey(words), alias }
}

/** 로마자 머리글자(「사무엘 L. 잭슨」의 L)는 빼고 부르는 일이 많아 뺀 이름도 함께 둔다 */
const isLatinInitial = (word: string) => /^[a-z]$/u.test(word)

function prepareNames(value: string | null, alias = false): PreparedName[] {
  const words = value ? nameWords(value) : []
  if (!words.length) return []
  const source = alias ? value!.trim() : null
  const names = [prepareWords(words, source)]
  const withoutInitials = words.filter((word) => !isLatinInitial(word))
  if (withoutInitials.length && withoutInitials.length < words.length && /\p{Script=Hangul}/u.test(value!)) {
    names.push(prepareWords(withoutInitials, source))
  }
  return names
}

export function buildCelebNameIndex(rows: readonly CelebNameEntry[]): CelebNameIndex {
  return {
    entries: rows.map((row) => ({
      id: row.id,
      sortName: row.nickname ?? row.nickname_en ?? '',
      views: row.view_count ?? 0,
      names: [
        ...prepareNames(row.nickname),
        ...prepareNames(row.nickname_en),
        ...(row.aliases ?? []).flatMap((alias) => prepareNames(alias, true)),
      ],
    })),
  }
}

/** 더 나은 일치인가 — 단계가 낮거나, 같으면 고친 양이 적거나, 그것도 같으면 이름이 다른 이름보다 낫다 */
function betterMatch(
  next: { tier: number; distance: number; alias: string | null },
  best: { tier: number; distance: number; alias: string | null } | null,
): boolean {
  if (!best) return true
  if (next.tier !== best.tier) return next.tier < best.tier
  if (next.distance !== best.distance) return next.distance < best.distance
  return next.alias === null && best.alias !== null
}

interface PreparedQuery {
  plain: string
  folded: string
  foldedWords: string[]
  sound: string[]
  budget: number
}

function prepareQuery(query: string): PreparedQuery | null {
  const words = nameWords(query)
  if (!words.length) return null
  const plain = words.join('')
  const sound = soundKey(words).symbols
  return {
    plain,
    folded: foldSyllables(plain),
    foldedWords: words.map(foldSyllables),
    sound,
    budget: Math.max(SIMILAR_MIN_BUDGET, sound.length * SIMILAR_RATIO),
  }
}

/**
 * 글자 그대로 들어 있으면 낱말 중간(「재인」→문재인)도 받는다.
 * 모음을 접었거나 낱말 순서를 바꿨을 때는 낱말 첫머리부터 맞아야 한다 — 「제인」이 「문재인」에 걸리지 않게.
 */
function strictTier(name: PreparedName, query: PreparedQuery): number | null {
  if (name.plain === query.plain) return NAME_MATCH_TIER.exact
  if (name.plain.startsWith(query.plain)) return NAME_MATCH_TIER.prefix
  if (containsAligned(name.plain, query.plain, name.wordStarts, true)) return NAME_MATCH_TIER.contains
  if (query.plain.length >= FOLD_MIN_CHARS && containsAligned(name.folded, query.folded, name.wordStarts, false)) {
    return NAME_MATCH_TIER.foldedContains
  }
  if (query.foldedWords.length > 1 && query.foldedWords.every((word) => containsAligned(name.folded, word, name.wordStarts, false))) {
    return NAME_MATCH_TIER.allWords
  }
  return null
}

/** 첫소리가 같은 계열인가 — 비슷한 표기라도 첫소리까지 틀리게 쓰는 일은 드물다 */
function sameOpening(a: string, b: string): boolean {
  return substituteCost(a, b) < 1
}

type RankedHit = CelebNameHit & { views: number; length: number; sortName: string }

/** 단계 → 이름으로 걸린 사람 → 고친 양 → 많이 찾는 사람 → 이름이 짧은 쪽(검색어가 이름의 더 큰 몫) → 가나다 */
function compareHits(a: RankedHit, b: RankedHit): number {
  return a.tier - b.tier
    || Number(a.matchedAlias !== null) - Number(b.matchedAlias !== null)
    || a.distance - b.distance
    || b.views - a.views
    || a.length - b.length
    || a.sortName.localeCompare(b.sortName, 'ko')
}

type EntryMatch = { tier: number; distance: number; alias: string | null; length: number }

function toHit(entry: PreparedEntry, match: EntryMatch): RankedHit {
  return {
    id: entry.id,
    tier: match.tier,
    distance: match.distance,
    matchedAlias: match.alias,
    views: entry.views,
    length: match.length,
    sortName: entry.sortName,
  }
}

/**
 * 검색어에 걸리는 인물을 가까운 순으로 돌려준다.
 * 비슷한 표기는 정확히 걸리는 사람이 하나도 없을 때만 찾는다 — 제대로 쓴 검색어에 남의 이름을 섞지 않는다.
 */
export function searchCelebNameIndex(index: CelebNameIndex, query: string): CelebNameHit[] {
  const prepared = prepareQuery(query)
  if (!prepared) return []

  const hits: RankedHit[] = []
  for (const entry of index.entries) {
    let best: EntryMatch | null = null
    for (const name of entry.names) {
      const tier = strictTier(name, prepared)
      if (tier === null) continue
      const match = { tier, distance: 0, alias: name.alias, length: name.plain.length }
      if (betterMatch(match, best)) best = match
    }
    if (best) hits.push(toHit(entry, best))
  }

  if (!hits.length && prepared.sound.length >= SIMILAR_MIN_SYMBOLS) {
    for (const entry of index.entries) {
      let best: EntryMatch | null = null
      for (const name of entry.names) {
        const distance = nearestSubstringDistance(prepared.sound, name.sound, prepared.budget)
        if (distance > prepared.budget) continue
        const match = { tier: NAME_MATCH_TIER.similar, distance, alias: name.alias, length: name.plain.length }
        if (betterMatch(match, best)) best = match
      }
      if (best) hits.push(toHit(entry, best))
    }
    hits.sort(compareHits)
    hits.length = Math.min(hits.length, SIMILAR_MAX_HITS)
  } else {
    hits.sort(compareHits)
  }

  return hits.map(({ id, tier, distance, matchedAlias }) => ({ id, tier, distance, matchedAlias }))
}
