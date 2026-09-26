/*
  파일명: /app/(main)/explore/faction/FactionScreen.tsx
  기능: 세력도감 화면 — 대문과 테마 주소가 함께 그린다
  책임: 신화 탐색처럼 칩 상자 하나(섹션·테마·진영)로 고르고, 그 아래 테마·진영 설명과 탐색과 같은 인물 카드 격자를 보여 준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import type { FeaturedFaction } from "@/actions/home";
import { getFactionFigureBooks } from "@/actions/home/getFactionFigureBooks";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import FactionNav from "@/components/features/faction/entry/FactionNav";
import { FactionGroupProvider, type FactionGroupMeta } from "@/components/features/faction/entry/FactionGroupContext";
import FactionGroupIntro from "@/components/features/faction/entry/FactionGroupIntro";
import FactionMusic from "@/components/features/faction/entry/FactionMusic";
import FactionEntryView from "@/components/features/faction/entry/FactionEntryView";
import FactionDescVoice from "@/components/features/faction/entry/FactionDescVoice";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import {
  buildFactionClusters,
  factionSectionKey,
  localizedFactionDescription,
  localizedFactionName,
  type FactionSection,
} from "@/lib/faction-sections";
import { getFactionCelebs } from "@/lib/faction-celebs";
import { getFactionGroupDescriptions } from "@/lib/faction-groups";
import { getAlternates, toSeoDescription } from "@/lib/seo";
import { getCelebProfileUrl } from "@/lib/url";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

interface FactionScreenProps {
  sections: FactionSection[];
  section: FactionSection;
  entry: FeaturedFaction;
  locale: Locale;
  /** 테마 정식 주소에서만 켠다 — 구성원 목록 구조화 데이터를 싣는다 */
  withJsonLd?: boolean;
}

/* 테마 구성원 구조화 데이터 — 역할·긴 소개는 모달에만 뜨므로 이름·역할·인물 주소를 HTML에 남겨 검색이 읽게 한다 */
function buildEntryJsonLd(entry: FeaturedFaction, name: string, celebs: CelebProfile[], locale: Locale) {
  const seoLocale = locale === "en" ? "en" : "ko";
  const pageUrl = getAlternates(`/explore/faction/${entry.slug}`, seoLocale).canonical;
  const description = localizedFactionDescription(entry, locale);
  const members = new Map(entry.celebs.map((member) => [member.id, member]));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
    ...(description && { description: toSeoDescription(description) }),
    inLanguage: seoLocale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: celebs.length,
      itemListElement: celebs.map((celeb, index) => {
        const member = members.get(celeb.id);
        const role = (locale === "en" ? member?.short_desc_en : member?.short_desc)?.trim();
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Person",
            name: (locale === "en" && celeb.nickname_en) || celeb.nickname,
            url: getAlternates(getCelebProfileUrl({ id: celeb.id, slug: celeb.slug }), seoLocale).canonical,
            ...(role && { description: role }),
          },
        };
      }),
    },
  };
}

/* 테마 본문 — 카드 자료를 받아 명단 차례·진영으로 나눠 넘긴다.
   카드 직함은 탐색과 같은 인물 직함이다. 이 테마에서의 역할·긴 소개는 카드를 눌러 뜨는 모달이 보인다 */
async function EntryBody({ entry, name, clusters, locale, withJsonLd }: {
  entry: FeaturedFaction;
  name: string;
  clusters: { key: string; celebIds: string[] }[];
  locale: Locale;
  withJsonLd: boolean;
}) {
  /* 인물 카드와 테마 등장 작품을 함께 받는다 — 작품 선반은 격자 아래에 붙는 본문이라
     인물 카드만큼 기다려 준다. 작품 조회는 실패해도 빈 목록으로 돌아와 카드를 막지 않는다 */
  const [celebsResult, factionBooks] = await Promise.all([
    getFactionCelebs(entry.id, entry.celebs.map((celeb) => celeb.id)).catch((error) => {
      console.error("[Faction] 인물 카드 조회 실패:", error);
      return null;
    }),
    getFactionFigureBooks(entry.id, locale),
  ]);
  if (!celebsResult) return <RetryBlock />;
  const celebs = celebsResult;

  const byId = new Map<string, CelebProfile>(celebs.map((celeb) => [celeb.id, celeb]));
  const ordered = entry.celebs.flatMap((member) => byId.get(member.id) ?? []);
  // 모달 머리에 쓰는 이 테마에서의 역할·진영 — 영문 역할이 비면 한국어를 내보내지 않는다.
  // 진영이 하나뿐인 테마는 진영 이름이 테마와 겹치므로 붙이지 않는다
  const members: Record<string, { role: string | null; group: string | null }> = {};
  for (const member of entry.celebs) {
    members[member.id] = {
      role: (locale === "en" ? member.short_desc_en : member.short_desc)?.trim() || null,
      group: clusters.length > 1
        ? (locale === "en" ? member.group_label_en?.trim() || member.group_label : member.group_label) ?? null
        : null,
    };
  }

  // 테마를 옮기면 정렬·열린 모달을 처음 상태로 되돌린다
  return (
    <>
      {withJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntryJsonLd(entry, name, ordered, locale)).replace(/</g, "\\u003c") }}
        />
      )}
      <FactionEntryView
        key={entry.id}
        factionId={entry.id}
        factionName={name}
        celebs={ordered}
        clusters={clusters.map((cluster) => ({ key: cluster.key, celebs: cluster.celebIds.flatMap((id) => byId.get(id) ?? []) }))}
        members={members}
        factionBooks={factionBooks}
      />
    </>
  );
}

export default async function FactionScreen({ sections, section, entry, locale, withJsonLd = false }: FactionScreenProps) {
  const [t, pending, groupRows] = await Promise.all([
    getTranslations("explore.faction"),
    getTranslations("pending"),
    // 진영 설명은 곁들임이다 — 못 받아도 진영 줄과 카드는 그대로 보인다
    getFactionGroupDescriptions(entry.id).catch((error) => {
      console.error("[Faction] 진영 설명 조회 실패:", error);
      return [];
    }),
  ]);
  const name = localizedFactionName(entry, locale);
  const description = localizedFactionDescription(entry, locale);

  // 영문 설명이 비면 한국어를 내보내지 않는다 — 신화 그룹 개요와 같은 규칙
  const groupDescriptions = new Map(groupRows.map((group) => [
    group.name,
    (locale === "en" ? group.description_en : group.description)?.trim() || null,
  ]));
  const clusters = buildFactionClusters(entry.celebs, locale).map((cluster, index) => ({ ...cluster, key: `cluster-${index}` }));
  // 진영이 하나뿐이면 고를 것이 없어 줄을 세우지 않는다
  const groups: FactionGroupMeta[] = clusters.length > 1
    ? clusters.map((cluster) => ({
      key: cluster.key,
      label: cluster.label,
      description: cluster.name ? groupDescriptions.get(cluster.name) ?? null : null,
      count: cluster.celebIds.length,
    }))
    : [];

  return (
    <AsyncIntlProvider>
      {/* 첫 진영부터 시작한다 — 테마를 옮기면 새 테마의 첫 진영으로 되돌린다 */}
      <FactionGroupProvider key={entry.id} initialKey={groups[0]?.key ?? null}>
        <div className="space-y-6 md:space-y-8">
          <FactionNav
            sections={sections.map((item) => ({
              key: factionSectionKey(item),
              name: localizedFactionName(item.faction, locale),
              entries: item.entries.map((child) => ({
                slug: child.slug!,
                name: localizedFactionName(child, locale),
                count: child.celebs.length,
              })),
            }))}
            activeSectionKey={factionSectionKey(section)}
            activeEntrySlug={entry.slug!}
            groups={groups}
          />

          {/* 지금 테마곡을 전역 음악 재생기에 「추천」으로 올린다 */}
          <FactionMusic id={entry.id} title={name} url={entry.music?.url ?? null} />

          <header className="border-b border-white/10 pb-6">
            <div className="mx-auto max-w-3xl">
              {/* 제목은 가운데 — 인원 수는 제목 오른쪽에 떠 있어 가운데 맞춤에 끼어들지 않는다. 좌우 여백은 긴 제목이 수와 겹치지 않을 자리다 */}
              <div className="px-14 text-center">
                <h2 className="relative inline-block text-balance font-serif text-3xl font-bold text-text-primary md:text-4xl">
                  {name}
                  <span className="absolute start-full bottom-1 ms-3 whitespace-nowrap font-sans text-sm font-semibold tabular-nums text-accent/80">
                    {t("figureCount", { count: entry.celebs.length })}
                  </span>
                </h2>
              </div>
              {/* 개요 본문 — 낭독 음원이 발행된 테마는 재생 조작과 문장 강조가 붙는다(신화 개요와 같은 규칙) */}
              <FactionDescVoice
                factionId={entry.id}
                locale={locale}
                text={description ?? ""}
              />
              {/* 칩 상자에서 고른 진영의 설명 — 테마 설명 바로 아래 */}
              <FactionGroupIntro groups={groups} />
            </div>
          </header>

          <Lane key={entry.id} fallback={<PendingBlock variant="grid" count={12} label={pending("loading")} />}>
            <EntryBody entry={entry} name={name} clusters={clusters} locale={locale} withJsonLd={withJsonLd} />
          </Lane>
        </div>
      </FactionGroupProvider>
    </AsyncIntlProvider>
  );
}
