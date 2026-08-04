/**
 * 근접도 게임 엔진
 *
 * 거리 계산: lib/persona/utils.ts의 calcDistance를 재사용한다.
 * 추가로 시대·지역·직군 축을 별도로 평가해 힌트를 생성한다.
 */

import { calcDistance, distanceToMatchPercent } from '@/lib/persona/utils';
import type { PersonaProfile, PersonaStats } from '@/lib/persona/types';
import { getKSTDateKey, dateKeyToSeed } from '@/lib/game/date-seed';
import type {
  ProximityAxisHint,
  ProximityCeleb,
  ProximityCelebFull,
  ProximityGuessResult,
} from './types';
import { PROXIMITY_TEMPERATURE_CORRECT } from './types';

/** PersonaStats → PersonaProfile (calcDistance용 더미 래퍼) */
function statsToProfile(stats: PersonaStats): PersonaProfile {
  return {
    celeb_id: '',
    nickname: '',
    nickname_en: null,
    profession: null,
    avatar_url: null,
    birth_date: null,
    death_date: null,
    title: null,
    ...stats,
  };
}

/**
 * 성향 16축 유클리드 거리를 0~100 온도로 변환.
 * 100 = 정답, 0 = 최대 거리
 */
export function calculateTemperature(
  guessStats: PersonaStats,
  targetStats: PersonaStats
): number {
  const distance = calcDistance(statsToProfile(guessStats), statsToProfile(targetStats));
  return distanceToMatchPercent(distance);
}

/**
 * 축별 힌트 생성 — 시대, 지역, 직군, 성향(전체)
 */
export function generateAxisHints(
  guess: ProximityCelebFull,
  target: ProximityCelebFull,
  locale: 'ko' | 'en' = 'ko'
): ProximityAxisHint[] {
  const hints: ProximityAxisHint[] = [];

  // 1. 시대 (era) — 생몰년 비교
  hints.push(evaluateEra(guess, target, locale));

  // 2. 지역 (region) — nationality 비교
  hints.push(evaluateRegion(guess, target, locale));

  // 3. 직군 (profession) — 같은지 다른지
  hints.push(evaluateProfession(guess, target, locale));

  // 4. 성향 (persona) — 16축 전체 거리를 3단계로
  hints.push(evaluatePersona(guess.stats, target.stats));

  return hints;
}

function evaluateEra(
  guess: ProximityCelebFull,
  target: ProximityCelebFull,
  locale: 'ko' | 'en'
): ProximityAxisHint {
  const guessYear = extractBirthYear(guess.birth_date);
  const targetYear = extractBirthYear(target.birth_date);

  if (guessYear === null || targetYear === null) {
    return { axis: 'era', proximity: 'medium' };
  }

  const diff = Math.abs(guessYear - targetYear);

  if (diff <= 30) {
    const detail = locale === 'ko' ? '같은 시대' : 'Same era';
    return { axis: 'era', proximity: 'close', detail };
  }
  if (diff <= 100) {
    const detail = locale === 'ko' ? '비슷한 시대' : 'Similar era';
    return { axis: 'era', proximity: 'medium', detail };
  }
  const detail = locale === 'ko' ? '먼 시대' : 'Different era';
  return { axis: 'era', proximity: 'far', detail };
}

function evaluateRegion(
  guess: ProximityCelebFull,
  target: ProximityCelebFull,
  locale: 'ko' | 'en'
): ProximityAxisHint {
  if (!guess.nationality || !target.nationality) {
    return { axis: 'region', proximity: 'medium' };
  }

  if (guess.nationality === target.nationality) {
    const detail = locale === 'ko' ? '같은 나라' : 'Same country';
    return { axis: 'region', proximity: 'close', detail };
  }

  // 같은 문화권인지 대략 판단
  const guessRegion = getRegionGroup(guess.nationality);
  const targetRegion = getRegionGroup(target.nationality);

  if (guessRegion && guessRegion === targetRegion) {
    const detail = locale === 'ko' ? '같은 문화권' : 'Same region';
    return { axis: 'region', proximity: 'medium', detail };
  }

  const detail = locale === 'ko' ? '다른 지역' : 'Different region';
  return { axis: 'region', proximity: 'far', detail };
}

function evaluateProfession(
  guess: ProximityCelebFull,
  target: ProximityCelebFull,
  locale: 'ko' | 'en'
): ProximityAxisHint {
  if (!guess.profession || !target.profession) {
    return { axis: 'profession', proximity: 'medium' };
  }

  if (guess.profession === target.profession) {
    const detail = locale === 'ko' ? '같은 직군' : 'Same profession';
    return { axis: 'profession', proximity: 'close', detail };
  }

  const detail = locale === 'ko' ? '다른 직군' : 'Different profession';
  return { axis: 'profession', proximity: 'far', detail };
}

function evaluatePersona(
  guessStats: PersonaStats,
  targetStats: PersonaStats
): ProximityAxisHint {
  const temp = distanceToMatchPercent(calcDistance(statsToProfile(guessStats), statsToProfile(targetStats)));

  if (temp >= 75) {
    return { axis: 'persona', proximity: 'close' };
  }
  if (temp >= 45) {
    return { axis: 'persona', proximity: 'medium' };
  }
  return { axis: 'persona', proximity: 'far' };
}

/**
 * 추측 처리: 정답과 비교하고 결과를 반환
 */
export function processGuess(
  guess: ProximityCelebFull,
  target: ProximityCelebFull,
  locale: 'ko' | 'en' = 'ko'
): ProximityGuessResult {
  const isCorrect = guess.id === target.id;

  if (isCorrect) {
    return {
      celeb: toCelebBrief(guess),
      temperature: PROXIMITY_TEMPERATURE_CORRECT,
      axisHints: [
        { axis: 'era', proximity: 'close', detail: locale === 'ko' ? '정답!' : 'Correct!' },
        { axis: 'region', proximity: 'close', detail: locale === 'ko' ? '정답!' : 'Correct!' },
        { axis: 'profession', proximity: 'close', detail: locale === 'ko' ? '정답!' : 'Correct!' },
        { axis: 'persona', proximity: 'close' },
      ],
      isCorrect: true,
    };
  }

  const temperature = calculateTemperature(guess.stats, target.stats);
  const axisHints = generateAxisHints(guess, target, locale);

  return {
    celeb: toCelebBrief(guess),
    temperature,
    axisHints,
    isCorrect: false,
  };
}

/**
 * 후보 목록에서 정답을 하나 뽑는다 (seed 기반 — 하루 같은 결과)
 */
export function pickDailyTarget(
  celebs: ProximityCelebFull[],
  seed?: number
): ProximityCelebFull | null {
  if (celebs.length === 0) return null;
  const s = seed ?? getDailySeed();
  const index = s % celebs.length;
  return celebs[index];
}

/** 날짜 기반 시드 (Asia/Seoul 기준 하루 한 번 바뀜) */
export function getDailySeed(): number {
  return Math.abs(dateKeyToSeed(getKSTDateKey()));
}

// ─── 유틸 ───

function extractBirthYear(date: string | null): number | null {
  if (!date) return null;
  // "BCE 500" → -500, "1452" → 1452, "1452-04-15" → 1452
  const bceMatch = date.match(/BCE?\s*(\d+)/i);
  if (bceMatch) return -parseInt(bceMatch[1], 10);
  const yearMatch = date.match(/-?\d+/);
  if (yearMatch) return parseInt(yearMatch[0], 10);
  return null;
}

/** 국적 코드를 대략적인 문화권 그룹으로 분류 */
function getRegionGroup(nationality: string): string | null {
  const REGION_MAP: Record<string, string[]> = {
    'east_asia': ['KR', 'JP', 'CN', 'TW', 'MN'],
    'southeast_asia': ['VN', 'TH', 'PH', 'ID', 'MY', 'SG', 'MM', 'KH', 'LA'],
    'south_asia': ['IN', 'PK', 'BD', 'LK', 'NP'],
    'middle_east': ['IR', 'IQ', 'SA', 'AE', 'TR', 'IL', 'SY', 'EG', 'JO', 'LB'],
    'europe_west': ['GB', 'FR', 'DE', 'NL', 'BE', 'AT', 'CH', 'IE'],
    'europe_south': ['IT', 'ES', 'PT', 'GR'],
    'europe_north': ['SE', 'NO', 'DK', 'FI', 'IS'],
    'europe_east': ['RU', 'PL', 'CZ', 'HU', 'UA', 'RO', 'BG', 'RS'],
    'americas_north': ['US', 'CA'],
    'americas_south': ['BR', 'AR', 'CL', 'CO', 'MX', 'PE', 'VE', 'CU'],
    'africa': ['ZA', 'NG', 'KE', 'GH', 'ET', 'TZ', 'MA', 'TN', 'DZ'],
  };

  for (const [region, codes] of Object.entries(REGION_MAP)) {
    if (codes.includes(nationality.toUpperCase())) return region;
  }
  return null;
}

function toCelebBrief(celeb: ProximityCelebFull): ProximityCeleb {
  return {
    id: celeb.id,
    nickname: celeb.nickname,
    nickname_en: celeb.nickname_en,
    profession: celeb.profession,
    nationality: celeb.nationality,
    birth_date: celeb.birth_date,
    death_date: celeb.death_date,
    avatar_url: celeb.avatar_url,
  };
}
