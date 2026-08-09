/**
 * 근접도(Proximity) 게임 서버 조회
 *
 * 역할:
 * 1. 자동완성용 후보 목록 조회 (celeb_persona + celebs 조인)
 * 2. 정답 뽑기 (일일 시드)
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
import type { PersonaStats } from '@/lib/persona/types';
import type { ProximityCeleb, ProximityCelebFull } from '@/components/features/game/proximity/types';
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from '@/lib/persona/constants';

const PERSONA_STAT_KEYS = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...TENDENCY_KEYS,
] as const;

interface ProximityColumnRow {
  celeb_id: string;
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
  }[] | null;
  command?: number | null;
  martial?: number | null;
  intellect?: number | null;
  charm?: number | null;
  temperance?: number | null;
  diligence?: number | null;
  reflection?: number | null;
  courage?: number | null;
  loyalty?: number | null;
  benevolence?: number | null;
  fairness?: number | null;
  humility?: number | null;
  pessimism_optimism?: number | null;
  conservative_progressive?: number | null;
  individual_social?: number | null;
  cautious_bold?: number | null;
}

function pickProfile(celeb: ProximityColumnRow['celeb']) {
  return Array.isArray(celeb) ? (celeb[0] ?? null) : celeb;
}

function columnsToStats(row: ProximityColumnRow): PersonaStats {
  return Object.fromEntries(
    PERSONA_STAT_KEYS.map((k) => [k, (row as unknown as Record<string, unknown>)[k] ?? 0])
  ) as unknown as PersonaStats;
}

async function fetchProximityCelebs(): Promise<ProximityCelebFull[]> {
  const supabase = createStaticClient();
  const rows = await selectAllPages<ProximityColumnRow>((from, to) =>
    supabase
      .from('celeb_persona')
      .select(`
        celeb_id, ${PERSONA_STAT_KEYS.join(', ')},
        celeb:celebs!celeb_persona_celebs_fkey!inner (
          id, nickname, nickname_en, profession, nationality,
          birth_date, death_date, avatar_url, publication_status
        )
      `)
      .eq('celeb.publication_status', 'active')
      .in('celeb.celeb_tier', [...LISTING_DEFAULT_TIERS])
      .order('celeb_id')
      .range(from, to) as unknown as PromiseLike<{
      data: ProximityColumnRow[] | null;
      error: { message: string } | null;
    }>
  );

  return rows.flatMap((row) => {
    const profile = pickProfile(row.celeb);
    if (!profile || profile.publication_status !== 'active') return [];
    return [{
      id: profile.id,
      nickname: profile.nickname,
      nickname_en: profile.nickname_en,
      profession: profile.profession,
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      avatar_url: profile.avatar_url,
      stats: columnsToStats(row),
    }];
  });
}

const getProximityCelebsCached = unstable_cache(
  fetchProximityCelebs,
  ['proximity-game-celebs'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.PERSONA] }
);

/** 게임용 전체 후보 조회 (full stats 포함) */
export async function getProximityCelebs(): Promise<ProximityCelebFull[]> {
  return getProximityCelebsCached();
}

/** 자동완성용 간략 목록 (locale 반영) */
export async function getProximityCelebList(): Promise<ProximityCeleb[]> {
  const locale = await getLocale();
  const isEn = locale === 'en';
  const all = await getProximityCelebsCached();
  return all.map((c) => ({
    id: c.id,
    nickname: isEn ? (c.nickname_en ?? c.nickname) : c.nickname,
    nickname_en: c.nickname_en,
    profession: c.profession,
    nationality: c.nationality,
    birth_date: c.birth_date,
    death_date: c.death_date,
    avatar_url: c.avatar_url,
  }));
}
