"use server";

import { unstable_cache } from "next/cache";
import {
  INFLUENCE_FIELDS,
  type InfluenceField,
} from "@feelandnote/influence-constants";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { LISTING_DEFAULT_TIERS } from "@feelandnote/shared/constants/celeb-tiers";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";

import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { calculatePercentile } from "@/constants/materials";
import { resolveLocale, type Locale } from "@/types/locale";

const NEIGHBOR_COUNT = 7;
const LEADER_COUNT = 5;

interface InfluenceExplorerRow {
  celeb_id: string;
  political: number | null;
  strategic: number | null;
  tech: number | null;
  social: number | null;
  economic: number | null;
  cultural: number | null;
  transhistoricity: number | null;
  total_score: number | null;
  celeb: {
    id: string;
    slug: string | null;
    nickname: string;
    nickname_en: string | null;
    avatar_url: string | null;
    profession: string | null;
  } | null;
}

export interface InfluenceExplorerPerson {
  id: string;
  slug: string | null;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
  total_score: number;
  ranking: number;
  tieCount: number;
  percentile: number;
  political: number;
  strategic: number;
  tech: number;
  social: number;
  economic: number;
  cultural: number;
  transhistoricity: number;
}

export interface InfluenceFieldLeader extends InfluenceExplorerPerson {
  fieldRank: number;
  fieldTieCount: number;
  fieldScore: number;
}

export interface InfluenceExplorerData {
  total: number;
  current: InfluenceExplorerPerson;
  neighbors: InfluenceExplorerPerson[];
  leaders: Record<InfluenceField, InfluenceFieldLeader[]>;
}

async function fetchInfluenceExplorerRows(): Promise<InfluenceExplorerRow[]> {
  const db = createStaticClient();

  // 순위와 분야별 선두는 같은 공개 인물 모집단에서 계산한다. PostgREST의
  // 1,000행 상한을 넘겨도 조용히 잘리지 않도록 고유 2차 키로 전량 페이징한다.
  return selectAllPages<InfluenceExplorerRow>((from, to) =>
    db
      .from("celeb_influence")
      .select(`
        celeb_id,
        political,
        strategic,
        tech,
        social,
        economic,
        cultural,
        transhistoricity,
        total_score,
        celeb:celebs!celeb_influence_celebs_fkey!inner (
          id,
          slug,
          nickname,
          nickname_en,
          avatar_url,
          profession
        )
      `)
      .eq("celeb.publication_status", "active")
      .in("celeb.celeb_tier", [...LISTING_DEFAULT_TIERS])
      .gt("total_score", 0)
      .order("total_score", { ascending: false })
      .order("celeb_id", { ascending: true })
      .range(from, to)
      .overrideTypes<InfluenceExplorerRow[], { merge: false }>(),
  );
}

const getInfluenceExplorerRowsCached = unstable_cache(
  fetchInfluenceExplorerRows,
  ["influence-explorer-rows"],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
);

function getScore(row: InfluenceExplorerRow, field: InfluenceField): number {
  return row[field] ?? 0;
}

function localizePerson(
  row: InfluenceExplorerRow & { celeb: NonNullable<InfluenceExplorerRow["celeb"]> },
  ranking: number,
  tieCount: number,
  total: number,
  locale: Locale,
): InfluenceExplorerPerson {
  const celeb = row.celeb;
  return {
    id: celeb.id,
    slug: celeb.slug,
    nickname:
      locale === "en" ? celeb.nickname_en || celeb.nickname : celeb.nickname,
    avatar_url: celeb.avatar_url,
    profession: celeb.profession,
    total_score: row.total_score ?? 0,
    ranking,
    tieCount,
    percentile: calculatePercentile(ranking, total),
    political: row.political ?? 0,
    strategic: row.strategic ?? 0,
    tech: row.tech ?? 0,
    social: row.social ?? 0,
    economic: row.economic ?? 0,
    cultural: row.cultural ?? 0,
    transhistoricity: row.transhistoricity ?? 0,
  };
}

function rankByScore<T>(rows: T[], scoreOf: (row: T) => number): Map<T, number> {
  const ranks = new Map<T, number>();
  let previousScore: number | null = null;
  let rank = 0;

  rows.forEach((row, index) => {
    const score = scoreOf(row);
    if (previousScore === null || score !== previousScore) rank = index + 1;
    ranks.set(row, rank);
    previousScore = score;
  });

  return ranks;
}

export async function getInfluenceExplorer(
  celebId: string,
  requestedLocale = "ko",
): Promise<InfluenceExplorerData | null> {
  const locale = resolveLocale(requestedLocale);
  const rawRows = await getInfluenceExplorerRowsCached();
  const rows = rawRows.filter(
    (row): row is InfluenceExplorerRow & {
      celeb: NonNullable<InfluenceExplorerRow["celeb"]>;
    } => Boolean(row.celeb),
  );
  const total = rows.length;
  const currentIndex = rows.findIndex((row) => row.celeb_id === celebId);
  if (currentIndex < 0 || total === 0) return null;

  const overallRanks = rankByScore(rows, (row) => row.total_score ?? 0);
  const overallTieCounts = rows.reduce((counts, row) => {
    const score = row.total_score ?? 0;
    counts.set(score, (counts.get(score) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());
  const toPerson = (row: (typeof rows)[number]) =>
    localizePerson(
      row,
      overallRanks.get(row) ?? 0,
      overallTieCounts.get(row.total_score ?? 0) ?? 1,
      total,
      locale,
    );

  // 동점자가 많아도 레일 전체가 같은 순위로 채워지지 않게, 현재 점수보다
  // 바로 높은 인물과 바로 낮은 인물을 우선한다. 최상단·최하단에서는 반대편을 늘린다.
  const currentRow = rows[currentIndex];
  const currentScore = currentRow.total_score ?? 0;
  const higherRows = rows.filter((row) => (row.total_score ?? 0) > currentScore);
  const lowerRows = rows.filter((row) => (row.total_score ?? 0) < currentScore);
  const preferredSideCount = Math.floor((NEIGHBOR_COUNT - 1) / 2);
  let higherCount = Math.min(preferredSideCount, higherRows.length);
  let lowerCount = Math.min(preferredSideCount, lowerRows.length);
  let remaining = NEIGHBOR_COUNT - 1 - higherCount - lowerCount;
  const extraHigher = Math.min(remaining, higherRows.length - higherCount);
  higherCount += extraHigher;
  remaining -= extraHigher;
  lowerCount += Math.min(remaining, lowerRows.length - lowerCount);
  const neighbors = [
    ...(higherCount > 0 ? higherRows.slice(-higherCount) : []),
    currentRow,
    ...lowerRows.slice(0, lowerCount),
  ].map(toPerson);

  const leaders = Object.fromEntries(
    INFLUENCE_FIELDS.map((field) => {
      const sorted = rows
        .filter((row) => getScore(row, field) > 0)
        .toSorted(
          (a, b) =>
            getScore(b, field) - getScore(a, field)
            || (b.total_score ?? 0) - (a.total_score ?? 0)
            || a.celeb_id.localeCompare(b.celeb_id),
        );
      const fieldRanks = rankByScore(sorted, (row) => getScore(row, field));
      const fieldTieCounts = sorted.reduce((counts, row) => {
        const score = getScore(row, field);
        counts.set(score, (counts.get(score) ?? 0) + 1);
        return counts;
      }, new Map<number, number>());
      return [
        field,
        sorted.slice(0, LEADER_COUNT).map((row) => ({
          ...toPerson(row),
          fieldRank: fieldRanks.get(row) ?? 0,
          fieldTieCount: fieldTieCounts.get(getScore(row, field)) ?? 1,
          fieldScore: getScore(row, field),
        })),
      ];
    }),
  ) as Record<InfluenceField, InfluenceFieldLeader[]>;

  return {
    total,
    current: toPerson(rows[currentIndex]),
    neighbors,
    leaders,
  };
}
