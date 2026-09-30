/*
  파일명: /app/(main)/explore/myth/[slug]/page.tsx
  기능: 신화 한 편의 주소 (예: /explore/myth/homer-odyssey)
  책임: 그 신화를 고른 채 신화의 세계 화면을 연다. 신화마다 검색 제목·설명·정본 주소를 갖는다.
        78편이 /explore/myth 하나를 정본으로 공유하던 때는 「오디세이아 줄거리」로 찾아올 페이지가 없었다(26.09.29).
        공개되지 않았거나 없는 신화는 404다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getMythData } from "@/actions/home/getMythData";
import { getMythClientData } from "@/actions/home/mythPublicData";
import MythScreenSkeleton from "@/components/features/user/explore/myth/MythScreenSkeleton";
import Lane from "@/components/ui/pending/Lane";
import { buildMythDescription, buildMythTitle } from "@/lib/atlasMeta";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import { MythSection } from "../../sections";

export const maxDuration = 30;

type PageParams = Promise<{ locale: Locale; slug: string }>;

/** 공개 신화를 찾는다. 없으면 null, 자료를 읽지 못하면 undefined — 그때는 404 대신 화면의 다시 시도를 띄운다 */
async function findMyth(slug: string, locale: Locale) {
  try {
    const data = getMythClientData(await getMythData(locale));
    const myth = data.myths.find((item) => item.slug === slug && item.isPublished);
    return myth ? { data, myth } : null;
  } catch (error) {
    console.error("[myth] 신화 조회 실패:", error);
    return undefined;
  }
}

export async function generateMetadata({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const found = await findMyth(slug, locale);
  if (!found) return {};
  const { data, myth } = found;
  const names = new Map(data.people.map((person) => [person.id, person.name]));
  const input = {
    name: myth.name,
    headline: myth.headline,
    description: myth.description,
    // 대표 3인(faction_lv2.lead_person_ids) 뒤에 명단 차례로 이어 — 한 줄 정의가 부른 사람을 빼고도 셋을 부를 수 있게
    leads: [...new Set([...myth.leadPersonIds, ...myth.personIds])].slice(0, 6).flatMap((id) => names.get(id) ?? []),
    memberCount: myth.personIds.length,
    groups: myth.groups.map((group) => group.name),
  };
  const seoLocale = locale === "en" ? "en" : "ko";
  return {
    title: buildMythTitle(input, seoLocale),
    description: buildMythDescription(input, seoLocale),
    alternates: await getLocalizedAlternates(`/explore/myth/${slug}`),
  };
}

export default async function MythEntryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  if ((await findMyth(slug, locale)) === null) notFound();
  return <Lane fallback={<MythScreenSkeleton />}><MythSection slug={slug} /></Lane>;
}
