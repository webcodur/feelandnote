/**
 * 어느 쪽(More or Less) 게임 서버 조회
 *
 * celeb_influence.total_score + celebs 기본 정보를 조회한다.
 * 조회 실패 시 에러를 던진다 — 조용한 폴백 금지.
 * 배포 환경에서만 동작하며 로컬에서는 fixture가 대신한다.
 */
'use server';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags';
import { STATIC_REVALIDATE } from '@/lib/cache';
import { createStaticClient } from '@/lib/supabase/static';
import { selectAllPages } from '@feelandnote/shared/lib/paginate';
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers';
import type { MorelessCeleb } from '@/components/features/game/moreless/types';

/** celeb_influence + celebs 임베드 조회 행 */
interface InfluenceRow {
  celeb_id: string;
  total_score: number | null;
  celeb: {
    id: string;
    nickname: string;
    nickname_en: string | null;
    profession: string | null;
    nationality: string | null;
    birth_date: string | null;
    death_date: string | null;
    avatar_url: string | null;
    publication_status: string | null;
    celeb_tier: string | null;
  } | {
    id: string;
    nickname: string;
    nickname_en: string | null;
    profession: string | null;
    nationality: string | null;
    birth_date: string | null;
    death_date: string | null;
    avatar_url: string | null;
    publication_status: string | null;
    celeb_tier: string | null;
  }[] | null;
}

function pickProfile(celeb: InfluenceRow['celeb']) {
  return Array.isArray(celeb) ? (celeb[0] ?? null) : celeb;
}

async function fetchMorelessCelebs(): Promise<MorelessCeleb[]> {
  const supabase = createStaticClient();

  // total_score가 동점이 많아 celeb_id를 2차 정렬키로 고정
  const rows = await selectAllPages<InfluenceRow>((from, to) =>
    supabase
      .from('celeb_influence')
      .select(`
        celeb_id, total_score,
        celeb:celebs!celeb_influence_celebs_fkey!inner (
          id, nickname, nickname_en, profession, nationality,
          birth_date, death_date, avatar_url, publication_status, celeb_tier
        )
      `)
      .eq('celeb.publication_status', 'active')
      .in('celeb.celeb_tier', [...LISTING_DEFAULT_TIERS])
      .not('total_score', 'is', null)
      .gte('total_score', 10) // 너무 낮은 점수는 제외 (비교 의미 없음)
      .order('celeb_id')
      .range(from, to) as unknown as PromiseLike<{
      data: InfluenceRow[] | null;
      error: { message: string } | null;
    }>
  );

  return rows.flatMap((row) => {
    const profile = pickProfile(row.celeb);
    if (!profile || profile.publication_status !== 'active') return [];
    if (row.total_score == null) return [];
    return [{
      id: profile.id,
      nickname: profile.nickname,
      nickname_en: profile.nickname_en,
      profession: profile.profession,
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      avatar_url: profile.avatar_url,
      total_score: row.total_score,
    }];
  });
}

const getMorelessCelebsCached = unstable_cache(
  fetchMorelessCelebs,
  ['moreless-game-celebs'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
);

/** 게임용 전체 후보 조회 */
export async function getMorelessCelebs(): Promise<MorelessCeleb[]> {
  return getMorelessCelebsCached();
}
