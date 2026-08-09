/**
 * 가림 해제(Redact) 게임 서버 조회
 *
 * 역할:
 * 1. bio(소개글)가 있는 활성 셀럽 중 랜덤 1명의 텍스트를 가려서 내려준다.
 * 2. 이름·별명을 영구 마스킹 처리해 정답 유출을 차단한다.
 *
 * 조회 실패 시 에러를 던진다 — 조용한 폴백 금지.
 * 배포 환경에서만 동작하며 로컬에서는 fixture가 대신한다.
 */
'use server';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags';
import { STATIC_REVALIDATE } from '@/lib/cache';
import { createStaticClient } from '@/lib/supabase/static';
import { selectAllPages } from '@feelandnote/shared/lib/paginate';
import { getLocale } from 'next-intl/server';
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers';
import type { RedactRoundData } from '@/components/features/game/redact/types';

/** 최소 bio 길이 (글자 수) — 너무 짧으면 게임 성립 불가 */
const MIN_BIO_LENGTH = 80;

interface RedactCandidateRow {
  id: string;
  nickname: string;
  nickname_en: string | null;
  profession: string | null;
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  bio: string | null;
  bio_en: string | null;
}

/**
 * censorName — 이름·별명 전역 블라인드
 * getTrackerRound.ts의 censorName 로직을 재사용한 독립 구현.
 * safeWords는 이름에 포함될 수 있는 일반 단어를 보호한다.
 */
function censorNameForRedact(text: string, nickname: string): { censored: string; censoredWords: string[] } {
  if (!text || !nickname) return { censored: text, censoredWords: [] };

  const censoredWords: string[] = [];
  let result = text;

  // 풀네임 치환
  const escaped = nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(escaped, 'gi').test(result)) {
    censoredWords.push(nickname);
    result = result.replace(new RegExp(escaped, 'gi'), '■■■');
  }

  // 토큰별 치환 (성/이름 부분)
  const tokens = nickname.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length < 2) continue; // 1글자 토큰은 오탐 위험
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 앞쪽에 한글·영문·숫자가 없는 경우에만 치환
    const regexStr = `(?<![가-힣ㄱ-ㅎa-zA-Z0-9_])${esc}`;
    if (new RegExp(regexStr, 'gi').test(result)) {
      censoredWords.push(token);
      result = result.replace(new RegExp(regexStr, 'gi'), '■■■');
    }
  }

  return { censored: result, censoredWords: [...new Set(censoredWords)] };
}

/** 활동 시기 문자열 생성 */
function formatBirthDeath(birth: string | null, death: string | null): string {
  const formatYear = (y: string | null) => {
    if (!y) return '?';
    if (y.startsWith('-')) return `BC ${y.slice(1)}`;
    return y;
  };
  return `${formatYear(birth)} – ${formatYear(death)}`;
}

const getCachedRedactCandidates = unstable_cache(
  async (): Promise<RedactCandidateRow[]> => {
    const supabase = createStaticClient();
    const rows = await selectAllPages<RedactCandidateRow>((from, to) =>
      supabase
        .from('celebs')
        .select('id, nickname, nickname_en, profession, nationality, birth_date, death_date, avatar_url, bio, bio_en')
        .eq('publication_status', 'active')
        .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
        .not('bio', 'is', null)
        .neq('bio', '')
        .order('id')
        .range(from, to) as unknown as PromiseLike<{
        data: RedactCandidateRow[] | null;
        error: { message: string } | null;
      }>
    );
    // 길이 필터 (서버측)
    return rows.filter((r) => (r.bio?.length ?? 0) >= MIN_BIO_LENGTH);
  },
  ['redact-game-candidates'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
);

export async function getRedactRound(): Promise<RedactRoundData> {
  const locale = await getLocale();
  const isKo = locale === 'ko';

  const candidates = await getCachedRedactCandidates();
  if (candidates.length === 0) {
    throw new Error('No candidates available for redact game');
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const bio = isKo ? (chosen.bio ?? chosen.bio_en ?? '') : (chosen.bio_en ?? chosen.bio ?? '');
  const nickname = isKo ? chosen.nickname : (chosen.nickname_en ?? chosen.nickname);

  const { censored, censoredWords } = censorNameForRedact(bio, nickname);

  return {
    celebId: chosen.id,
    text: censored,
    nickname,
    profession: chosen.profession ?? 'other',
    nationality: chosen.nationality,
    birthDeath: formatBirthDeath(chosen.birth_date, chosen.death_date),
    avatarUrl: chosen.avatar_url,
    censoredWords,
    isSample: false,
  };
}
